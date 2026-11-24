# --------------------------------
#   app.py - sets up entire app
# --------------------------------
import os
from dotenv import load_dotenv
from flask import Flask, render_template, session, redirect
from db import init_db
from routes.tasks import tasks_bp
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.lists import lists_bp


load_dotenv()   # reads .env into os.environ
                # must run before create_app() reads SECRET_KEY

def create_app():
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.secret_key = os.environ["SECRET_KEY"]

    app.register_blueprint(tasks_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(lists_bp)

    @app.route("/")
    def index():
        if "user_id" not in session:            # if user_id key is missing,
            return redirect("/login")           # sends them to login, before index could render
        return render_template("index.html")    # proceeds to index/to-do list

    init_db()       # runs on every startup / import, so host gets their tables
    return app

app = create_app()  # hosts import this name

if __name__ == "__main__":
    app.run(debug=True)