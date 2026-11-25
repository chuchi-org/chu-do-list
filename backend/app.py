# --------------------------------
#   app.py - sets up entire app
# --------------------------------
import os
from dotenv import load_dotenv
from flask import Flask, render_template, session, redirect, jsonify, request
from db import init_db
from werkzeug.exceptions import HTTPException
from routes.tasks import tasks_bp
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.lists import lists_bp


load_dotenv()   # reads .env into os.environ
                # must run before create_app() reads SECRET_KEY

def wants_html():
    # JSON is listed first, so fetch() (which sends */*) gets JSON.
    # Browsers rank text/html above */*, so page visits still get HTML.
    best = request.accept_mimetypes.best_match(["application/json", "text/html"])
    return best == "text/html"

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

    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        # covers anything Flask raises on its own
        if wants_html():
            return(f"<h1>{e.code} {e.name}</h1><p>{e.description}</p>"
                    "<p><a href='/'>Back to home</a></p>"), e.code
        return jsonify({"error": e.description}),e.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(e):
        # covers crashes in our own code
        # e.g. KeyError, bugs
        app.logger.exception("Unhandled error") # full traceback still goes to the terminal
        if wants_html():
            return ("<h1>500 Something went wrong</h1>"
                    "<p>Please try again in a moment.</p>"
                    "<p><a href='/'>Back to home</a></p>"), 500
        return jsonify({"error": "Something went wrong on our side. Please try again."}), 500

    init_db()       # runs on every startup / import, so host gets their tables
    return app

app = create_app()  # hosts import this name

if __name__ == "__main__":
    app.run(debug=True)