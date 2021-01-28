from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
from wtforms import StringField, TextField, SubmitField, TextAreaField, HiddenField
from wtforms.validators import Required
from wtforms.fields.html5 import DateTimeLocalField

app = Flask(__name__, template_folder='', static_folder='')
app.config.from_pyfile('config.py')
db = SQLAlchemy(app)

class TaskForm(FlaskForm):
    id = HiddenField('task-id')
    title = StringField('Task', validators=[Required()])
    datetime_due = DateTimeLocalField('Due date', format="%Y-%m-%dT%H:%M")
    description = TextAreaField('Description')
    submit = SubmitField('Create')

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String, nullable=False)
    description = db.Column(db.String)
    created = db.Column(db.DateTime, default=datetime.utcnow)
    datetime_due = db.Column(db.DateTime)
    datetime_completed = db.Column(db.DateTime)
    updated = db.Column(db.DateTime, onupdate=datetime.utcnow)

def tasks_to_json(tasks):
    tasks = [
        {
            key: value for key, value in task.__dict__.items() 
            if key != '_sa_instance_state'
        } 
        for task in tasks
    ]
    return jsonify(tasks)


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
        db.session.add(task)
        db.session.commit()
        db.session.refresh(task)
        return tasks_to_json([task])
    return {'errors': form.errors}

@app.route('/edit-task', methods=['POST'])
def edit_task():
    form = TaskForm()
    task = Task()
    if form.validate_on_submit():
        existing = Task.query.get(int(task.id))
        task.id = int(task.id)
        db.session.commit()
        task = Task.query.get(int(task.id))
        return tasks_to_json([task])
    return {'errors': form.errors}

@app.route('/delete-task', methods=['POST'])
def delete_task():
    task = Task.query.get(request.data.decode('utf-8'))
    db.session.delete(task)
    db.session.commit()
    return {'success': True}

@app.route('/get-tasks')
def get_tasks():
    return tasks_to_json(Task.query.all())