# FILENAME: app.py
from flask import Flask,jsonify, request, render_template, session, redirect
import sqlite3
from pathlib import Path
import re
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv

load_dotenv()   # reads .env into os.environ
                # must run always before code below

# dynamically creates an absolute file path to tasks.db located in the same folder of app.py
# __file__ : Python's built-in reference to the current script's path
DB_PATH = Path(__file__).parent / "tasks.db"
app = Flask(__name__, template_folder="../templates", static_folder="../static")
app.secret_key = os.environ["SECRET_KEY"]


@app.route("/")
def index():
    if "user_id" not in session:            # if user_id key is missing,
        return redirect("/login")           # sends them to login, before index could render
    return render_template("index.html")    # proceeds to index/to-do list


@app.route("/login")
def login():
    return render_template("login.html")


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"status": "Session ended"}), 200



# ----- TASK ROUTES -----
@app.route("/tasks", methods=["GET"])
# read
def get_tasks():
    # defining connection & cursor
    connection  = sqlite3.connect(DB_PATH)  # opens connection to tasks.db
    cursor      = connection.cursor()       # sends instructions / receives results via connection ^

    cursor.execute("SELECT * FROM tasks")   # instruction sent to DB
    rows        = cursor.fetchall()

    cursor.close()          # closes the opened Cursor
    connection.close()      # terminates the active link between Py script and SQLite DB

    tasks = []
    # converting tuples from SQLite into key-value pairs (dictionaries)
    for row in rows:
        tasks.append({
            "id": row[0],
            "title": row[1],
            "due_datetime": row[2],
            "priority": row[3],
            "tag": row[4],
            "is_done": row[5],
            "created_at":row[6]
        })
    return jsonify(tasks)   # converts data into a JSON string and sends it as response to caller

# create
@app.route("/tasks", methods=["POST"])
def create_task():
    data = request.get_json()   # reads request body (JSON) from frontend and parses it into dict

    connection  = sqlite3.connect(DB_PATH)  
    cursor      = connection.cursor()      
    
    cursor.execute(
    "INSERT INTO tasks (title, due_datetime, priority, tag, is_done, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    (data["title"], data["due_datetime"], data["priority"], data["tag"], 0, data["created_at"])
    )   # '?' are placeholder values for the actual values inside the tuple, used to avoid SQL injection

    connection.commit()     # permanently saves all the pending changes made during the current transaction to the database file
    new_id      = cursor.lastrowid  # grabs the auto-generated id of the row just inserted
    cursor.close()          
    connection.close()      

    return jsonify({"id": new_id, **data, "is_done": 0}), 201   # 201 sets HTTP status to 201 Created

# update
@app.route("/tasks/<int:task_id>", methods=["PUT"])      # <int:task_id> gets number from URL and passes it to function as task_id with type int
def update_task(task_id):
    data = request.get_json()   # parses updated values given by frontend from a JSON body into a dict

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    cursor.execute(
    "UPDATE tasks SET title=?, due_datetime=?, priority=?, tag=?, is_done=?  WHERE id=?",
    (data["title"], data["due_datetime"], data["priority"], data["tag"], data["is_done"], task_id)
    )

    connection.commit()
    cursor.close()
    connection.close()

    return jsonify({"status": "updated", "id": task_id})

# delete
@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    connection  = sqlite3.connect(DB_PATH)
    cursor      = connection.cursor()
    cursor.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    connection.commit()
    cursor.close()
    connection.close()

    return jsonify({"status": "deleted", "id": task_id})

# ----- SIGNUP ROUTE -----
@app.route("/signup")
def signup_page():
    return render_template("signup.html")

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")     # basic email structure for reference

@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    display_name = data.get("display_name", "").strip()
    email        = data.get("email", "").strip()
    password     = data.get("password", "")

    # require all fields to be filled up
    if not display_name or not email or not password:
        return jsonify({"error": "All fields are required."}), 400      # 400 - bad request

    # reejcts malformed or invalid email address
    if not EMAIL_REGEX.match(email):
        return jsonify({"error": "Please enter a valid email address."}), 400

    if len(password) < 8:
        return jsonify({"error": "Your password must be at least 8 characters long."}), 400

    connection  = sqlite3.connect(DB_PATH)
    cursor      = connection.cursor()

    # check if account already exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone() is not None:
        cursor.close()
        connection.close()
        return jsonify({"error": "An account with this email already exists."}), 409    # 409 - request conflict

    # hashing password for security
    # generate_password_hash also adds a salt to differentiate two users with identical passwords
    password_hash   = generate_password_hash(password)

    # store into db
    cursor.execute(
        "INSERT INTO users (display_name, email, password_hash) VALUES (?, ?, ?)",
        (display_name, email, password_hash)
    )
    
    connection.commit()
    new_id = cursor.lastrowid  # grabs the auto-generated id of the row just inserted
    cursor.close()
    connection.close()

    return jsonify({"id": new_id, "display_name": display_name, "email": email}), 201   # 201 = sign up successful

# ----- LOGIN ROUTE -----
@app.route("/login", methods=["POST"])
def authenticate(): # login() already exists above
    data = request.get_json()

    email    = data.get("email", "").strip()
    password = data.get("password", "")

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    cursor.execute("SELECT id, password_hash, display_name FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    cursor.close()
    connection.close()

    if user is None:
        return jsonify({"error": "Wrong email or password"}), 401 # 401 = unathorized

    # if user exists:
    user_id, stored_hash, display_name = user   # unpacking user tuple

    if not check_password_hash(stored_hash, password):
        return jsonify({"error": "Wrong email or password"}), 401

    session["user_id"] = user_id

    return jsonify({"id": user_id, "display_name": display_name}), 200 # 200 = successful

# ----- PROFILE ROUTE -----
#get
@app.route("/profile", methods=["GET"])
def get_profile():
    # access-control mechanism for profile page
    user_id = session.get("user_id")
    if user_id is None:
        return redirect("/login")

    connection  = sqlite3.connect(DB_PATH)
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

    connection  = sqlite3.connect(DB_PATH)
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

if __name__ == "__main__":
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    # create task table
    create_task_schema_command = """CREATE TABLE IF NOT EXISTS
    tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, due_datetime TEXT, priority INTEGER, tag TEXT, is_done INTEGER, created_at TEXT)"""
    cursor.execute(create_task_schema_command)

    #create user table
    create_user_schema_command = """CREATE TABLE IF NOT EXISTS
    users(id INTEGER PRIMARY KEY AUTOINCREMENT, display_name TEXT, email TEXT UNIQUE, password_hash TEXT)"""
    cursor.execute(create_user_schema_command)
    connection.commit()     # permanently saves all the pending changes made during the current transaction to the database file
    cursor.close()          # closes the opened Cursor
    connection.close()      # terminates the active link between Py script and SQLite DB

    app.run(debug=True)