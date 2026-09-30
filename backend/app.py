from flask import Flask,jsonify, request, render_template
import sqlite3
from pathlib import Path

# dynamically creates an absolute file path to tasks.db located in the same folder of app.py
# __file__ : Python's built-in reference to the current script's path
DB_PATH = Path(__file__).parent / "tasks.db"
app = Flask(__name__, template_folder="../templates", static_folder="../static")

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/login")
def login():
    return render_template("login.html")


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

@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    connection  = sqlite3.connect(DB_PATH)
    cursor      = connection.cursor()
    cursor.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    connection.commit()
    cursor.close()
    connection.close()

    return jsonify({"status": "deleted", "id": task_id})

if __name__ == "__main__":
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    # create task table
    create_schema_command = """CREATE TABLE IF NOT EXISTS
    tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, due_datetime TEXT, priority INTEGER, tag TEXT, is_done INTEGER, created_at TEXT)"""

    cursor.execute(create_schema_command)
    connection.commit()     # permanently saves all the pending changes made during the current transaction to the database file
    cursor.close()          # closes the opened Cursor
    connection.close()      # terminates the active link between Py script and SQLite DB

    app.run(debug=True)