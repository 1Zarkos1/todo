from os import environ
from dotenv import load_dotenv

load_dotenv('./.env')

SECRET_KEY=environ.get('SECRET_KEY')
SQLALCHEMY_DATABASE_URI='sqlite:///tasks.db'
SQLALCHEMY_TRACK_MODIFICATIONS='False'