from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, escape, json, Response
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_wtf import FlaskForm
from flask_migrate import Migrate
from sqlalchemy import asc, desc
from wtforms import StringField, TextField, SubmitField, TextAreaField, HiddenField
from wtforms.validators import Required
from wtforms.fields.html5 import DateTimeLocalField

app = Flask(__name__, template_folder='', static_folder='')
app.config.from_pyfile('config.py')
db = SQLAlchemy(app)
ma = Marshmallow(app)
migrate = Migrate(app, db)


def escape_filter(input_value):
    return escape(input_value) if input_value is not None else ""


class TaskForm(FlaskForm):
    title = StringField('Task', validators=[
                        Required()], filters=(escape_filter,))
    datetime_due = DateTimeLocalField('Due date', format="%Y-%m-%dT%H:%M")
    description = TextAreaField('Description', filters=(escape_filter,))


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String, nullable=False)
    description = db.Column(db.String)
    created = db.Column(db.DateTime, default=datetime.utcnow)
    datetime_due = db.Column(db.DateTime)
    datetime_completed = db.Column(db.DateTime)
    color = db.Column(db.String)
    updated = db.Column(db.DateTime, onupdate=datetime.utcnow)

    comments = db.relationship(
        'Comment', backref='task', lazy='selectin',
        cascade='all, delete, delete-orphan'
    )


class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'))
    text = db.Column(db.String, nullable=False)
    created = db.Column(db.DateTime, default=datetime.utcnow)


sort_order = {'asc': asc, 'desc': desc}
sort_column = {'due': Task.datetime_due,
               'comp': Task.datetime_completed, 'created': Task.created}


class TaskSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Task
        include_fk = True

    comments = ma.Nested('CommentSchema', many=True)


class CommentSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Comment


task_schema = TaskSchema()
comment_schema = CommentSchema()


@app.route('/')
def index():
    form = TaskForm()
    return render_template('index.html', form=form)


@app.route('/tasks/<int:task_id>', methods=['PUT', 'DELETE'])
def task(task_id):
    if request.method == 'PUT':
        form = TaskForm()
        if form.validate_on_submit():
            task = Task.query.get(task_id)
            form.populate_obj(task)
            task.color = request.form['color']
            task = process_comments(request.form, task)
            db.session.commit()
            task = Task.query.get(task_id)
            return jsonify({
                "task": task_id,
                "comments": [comment.id for comment in task.comments]
            })
        else:
            return {"errors": form.errors}
    else:
        db.session.query(Task).filter(Task.id == task_id).delete()
        db.session.commit()
        return Response(status=204)


@app.route('/tasks/', methods=['POST', 'GET'])
def tasks():
    if request.method == 'GET':
        task = Task.query
        status = request.args.get('status')
        column, order = request.args.get(
            'sort', default='created.desc').split('.')
        task = task.filter(Task.datetime_completed ==
                           None, Task.datetime_due > datetime.utcnow()) if status else task
        task = task.order_by(sort_order.get(order)(sort_column.get(column)))
        return task_schema.jsonify(task.all(), many=True)
    else:
        form = TaskForm()
        task = Task()
        if form.validate_on_submit():
            form.populate_obj(task)
            task.color = request.form['color']
            db.session.add(task)
            task = process_comments(request.form, task)
            db.session.commit()
            db.session.refresh(task)
            return jsonify({
                "task": task.id,
                "comments": [comment.id for comment in task.comments]
            })
        else:
            return {"errors": form.errors}


@app.route('/tasks/<task_id>/complete', methods=['PUT'])
def toggle_task_completion(task_id):
    task = Task.query.get(task_id)
    state = datetime.now() if not task.datetime_completed else None
    task.datetime_completed = state
    db.session.commit()
    return jsonify(state.isoformat() if state else None)


@app.route('/comments/', methods=['POST'])
def comments():
    data = json.loads(request.data.decode('utf-8'))
    comment = Comment(text=data['text'], task_id=data["taskId"])
    db.session.add(comment)
    db.session.commit()
    return jsonify({"id": comment.id})


@app.route('/comments/<int:comment_id>', methods=['PUT', 'DELETE'])
def comment(comment_id):
    if request.method == 'DELETE':
        delt = db.session.query(Comment).filter(
            Comment.id == comment_id).delete()
    elif request.method == 'PUT':
        data = request.data.decode('utf-8')
        db.session.query(Comment).filter(
            Comment.id == comment_id).update({Comment.text: data})
    db.session.commit()
    return Response(status=204)


def process_comments(form, task):
    sent_ids = set()
    for key in form:
        if key == 'comment-':
            db.session.add_all([Comment(text=value, task=task)
                                for value in form.getlist('comment-')])
        elif key.startswith('comment-'):
            comment_id = int(key.split("-")[1])
            db.session.merge(Comment(id=comment_id,
                                     text=form[key], task_id=task.id))
            sent_ids.add(comment_id)
    [db.session.delete(comment) for comment in task.comments
        if comment.id not in sent_ids and comment.id is not None]
    return task
