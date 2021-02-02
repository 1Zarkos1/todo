from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, escape, json
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_wtf import FlaskForm
from flask_migrate import Migrate
from wtforms import StringField, TextField, SubmitField, TextAreaField, HiddenField
from wtforms.validators import Required
from wtforms.fields.html5 import DateTimeLocalField

app = Flask(__name__, template_folder='', static_folder='')
app.config.from_pyfile('config.py')
db = SQLAlchemy(app)
ma = Marshmallow(app)
migrate = Migrate(app, db)


class TaskForm(FlaskForm):
    id = HiddenField('task-id')
    title = StringField('Task', validators=[Required()])
    datetime_due = DateTimeLocalField('Due date', format="%Y-%m-%dT%H:%M")
    description = TextAreaField('Description')
    # submit = SubmitField('Create')

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


class TaskSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Task
        include_fk = True
    
    comments = ma.Nested('CommentSchema', many=True)

class CommentSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Comment
        # exclude = ('author',)

task_schema = TaskSchema()
comment_schema = CommentSchema()

@app.route('/')
def main():
    form = TaskForm()
    tasks = db.session.query(Task).all()
    return render_template('index.html', form=form, tasks=tasks)

@app.route('/add-task', methods=['POST'])
def add_task():
    form = TaskForm()
    task = Task()
    if form.validate_on_submit():
        form.populate_obj(task)
        del task.id
        task.color = request.form['color']
        db.session.add(task)
        task = process_comments(request.form, task)
        db.session.commit()
        db.session.refresh(task)
        return task_schema.jsonify(task)
    return {'errors': form.errors}

@app.route('/edit-task', methods=['POST'])
def edit_task():
    form = TaskForm()
    if form.validate_on_submit():
        id = int(form.id.data)
        task = Task.query.get(id)
        form.populate_obj(task)
        task.id = id
        task.color = request.form['color']
        task = process_comments(request.form, task, "edit")
        db.session.commit()
        task = Task.query.get(id)
        return task_schema.jsonify(task)
    return {'errors': form.errors}

@app.route('/delete-task', methods=['POST'])
def delete_task():
    task = Task.query.get(request.data.decode('utf-8'))
    db.session.delete(task)
    db.session.commit()
    return {'success': True}

@app.route('/get-tasks')
def get_tasks():
    return task_schema.jsonify(Task.query.all(), many=True)

@app.route('/toggle-task-completion', methods=['POST'])
def toggle_task():
    task = Task.query.get(request.data.decode('utf-8'))
    state = datetime.now() if not task.datetime_completed else None
    task.datetime_completed = state
    db.session.commit()
    return jsonify(state.isoformat() if state else None)

@app.route('/delete-comment', methods=['POST'])
def delete_comment():
    id = request.data.decode('utf-8')
    db.session.query(Comment).filter(Comment.id == int(id)).delete()
    db.session.commit()
    return {'success': True}

@app.route('/edit-comment', methods=['POST'])
def edit_comment():
    data = json.loads(request.data.decode('utf-8'))
    db.session.query(Comment).filter(Comment.id == int(data['id'])).update({Comment.text: data['value']})
    db.session.commit()
    return {'success': True}

def process_comments(form, task, action='add'):
    comment_id = 1
    sent_ids = set()
    while comment := form.get(f'comment-{comment_id}', "").strip():
        if action == 'add' or not form.get(f'hidden-{comment_id}'):
            db.session.add(Comment(text=comment, task=task))
        else:
            edited_comment_id = int(form.get(f'hidden-{comment_id}'))
            db.session.merge(Comment(id=edited_comment_id, text=comment, task_id=task.id))
            sent_ids.add(edited_comment_id)
        comment_id += 1
    [db.session.delete(comment) for comment in task.comments 
        if comment.id not in sent_ids and comment.id is not None]
    return task