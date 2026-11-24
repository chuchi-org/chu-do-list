# FILENAME: app.py
from flask import Flask,jsonify, request, render_template, session, redirect
import sqlite3
import re
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
import secrets
from datetime import datetime, timedelta
from db import get_connection, init_db
from access import user_can_access_list, get_accessible_task

load_dotenv()   # reads .env into os.environ
                # must run always before code below

app = Flask(__name__, template_folder="../templates", static_folder="../static")
app.secret_key = os.environ["SECRET_KEY"]

from routes.tasks import tasks_bp
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.lists import lists_bp
app.register_blueprint(tasks_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(lists_bp)

@app.route("/")
def index():
    if "user_id" not in session:            # if user_id key is missing,
        return redirect("/login")           # sends them to login, before index could render
    return render_template("index.html")    # proceeds to index/to-do list

if __name__ == "__main__":
    init_db()
    app.run(debug=True)