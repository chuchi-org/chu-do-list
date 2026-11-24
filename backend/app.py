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
from routes.auth import auth_bp, EMAIL_REGEX
app.register_blueprint(tasks_bp)
app.register_blueprint(auth_bp)

@app.route("/")
def index():
    if "user_id" not in session:            # if user_id key is missing,
        return redirect("/login")           # sends them to login, before index could render
    return render_template("index.html")    # proceeds to index/to-do list

# ----- PROFILE ROUTE -----
#get
@app.route("/profile", methods=["GET"])
def get_profile():
    # access-control mechanism for profile page
    user_id = session.get("user_id")
    if user_id is None:
        return redirect("/login")

    connection  = get_connection()
    cursor      = connection.cursor()
    cursor.execute("SELECT display_name, email FROM users WHERE id=?", (user_id,))
    row         =  cursor.fetchone()
    cursor.close()
    connection.close()

    # edge case handling for valid session but nonexisting account
    if row is None:
        return redirect("/login")

    # renders profile.html with display name & email pre-filled
    return render_template("profile.html", display_name=row[0], email=row[1])

# update
@app.route("/profile", methods=["PUT"])
def update_profile():
    # only accept user_id from the session, not anywhere else
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Not logged in."}), 401    # 401 - Unauthorized

    data = request.get_json()       # parse the incoming payload into a dict

    connection  = get_connection()
    cursor      = connection.cursor()

    # fetch all current values before any change can be done by the user
    cursor.execute("SELECT display_name, email, password_hash FROM users WHERE id=?", (user_id,))

    # catches edge case where a valid session references a user_id that has since been deleted in DB
    row = cursor.fetchone()
    if row is None:
        cursor.close()
        connection.close()
        return jsonify({"error": "Account no longer exists."}), 404

    # unpack the tuple into variables
    current_display_name, current_email, current_password_hash = row

    # use new user input if it exists, else fall back to what's already stored
    display_name    = data.get("display_name", current_display_name).strip()
    email           = data.get("email", current_email).strip()
    new_password    = data.get("password")

    # reject empty user input
    if not display_name or not email:
        cursor.close()
        connection.close()
        return jsonify({"error": "Display name and email cannot be empty."}), 400

    # reject invalid email address
    if not EMAIL_REGEX.match(email):
        cursor.close()
        connection.close()
        return jsonify({"error": "Please enter a valid email address."}), 400

    # check if any other accounts use the new inputted email
    cursor.execute("SELECT id FROM users WHERE email = ? AND id != ?", (email, user_id))
    if cursor.fetchone() is not None:
        cursor.close()
        connection.close()
        return jsonify({"error": "This email is already in use by another account."}), 409    # 409 - request conflict

    # only runs if a new password was submitted
    if new_password is not None:
        if len(new_password) < 8:
            cursor.close()
            connection.close()
            return jsonify({"error": "Password must be at least 8 characters long."}), 400
        password_hash = generate_password_hash(new_password) 
    else:
        password_hash = current_password_hash   # keeps current password if no new one was submitted

    # updates all three columns at once regardless of whether a field was changed
    cursor.execute(
        "UPDATE users SET display_name = ?, email = ?, password_hash = ? WHERE id = ?",
        (display_name, email, password_hash, user_id)
    )
    connection.commit()
    cursor.close()
    connection.close()

    # return updated values so frontend can confirm and display them
    return jsonify({"display_name": display_name, "email": email}), 200

# === NEW FOR LAB 3 === #
# --- LIST ROUTES --- #
@app.route("/lists", methods=["GET"])
def get_lists():
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Not logged in."}), 401

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT DISTINCT l.id, l.name, l.owner_id
        FROM lists l
        LEFT JOIN list_members lm ON l.id = lm.list_id
        WHERE l.owner_id = ? OR lm.user_id = ?
    """, (user_id, user_id))
    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    lists = [{"id": r[0], "name": r[1], "owner_id": r[2]} for r in rows]

    return jsonify(lists), 200

@app.route("/lists", methods=["POST"])
def create_list():
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Not logged in."}), 401

    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "List name is required."}), 400

    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("INSERT INTO lists (name, owner_id) VALUES (?, ?)", (name, user_id))
    new_id = cursor.lastrowid
    cursor.execute("INSERT INTO list_members (list_id, user_id, role) VALUES (?, ?, 'owner')", (new_id, user_id))
    connection.commit()
    cursor.close()
    connection.close()

    return jsonify({"id": new_id, "name": name, "owner_id": user_id}), 201


@app.route("/lists/<int:list_id>/members", methods=["POST"])
def add_list_member(list_id):
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Not logged in."}), 401

    data = request.get_json()
    email = data.get("email", "").strip()
    if not email:
        return jsonify({"error": "Email is required"}), 400

    connection = get_connection()
    cursor = connection.cursor()

    # verify if list exists and current user is the owner
    cursor.execute("SELECT owner_id FROM lists WHERE id = ?", (list_id,))
    list_row = cursor.fetchone()
    if not list_row or list_row[0] != user_id:
        cursor.close()
        connection.close()
        return jsonify({"error": "List not found."}), 404

    # find target user by email
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    target_user = cursor.fetchone()
    if not target_user:
        cursor.close()
        connection.close()
        return jsonify({"error": "User with this email does not exist."}), 404

    target_user_id = target_user[0]

    try:
        cursor.execute("INSERT INTO list_members (list_id, user_id) VALUES (?, ?)", (list_id, target_user_id))
        connection.commit()
    except sqlite3.IntegrityError:
        cursor.close()
        connection.close()
        return jsonify({"error": "User is already a member of this list."}), 409

    cursor.close()
    connection.close()
    return jsonify({"status": "Member added.", "email": email}), 200

if __name__ == "__main__":
    init_db()
    app.run(debug=True)