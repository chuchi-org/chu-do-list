# ---------------------------------------------
#   routes/tasks.py - the four task routes
# ---------------------------------------------

from flask import Blueprint, jsonify, request, session
from db import get_connection
from access import user_can_access_list, get_accessible_task

tasks_bp = Blueprint("tasks", __name__)

# ----- TASK ROUTES -----
@tasks_bp.route("/tasks", methods=["GET"])
def get_tasks():
    # session check
    # user_id always comes from session, not the request body
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Not logged in."}), 401

    list_id = request.args.get("list_id", type=int)     # /tasks -> personal, /tasks?list_id=5 -> that list
    
    # defining connection & cursor
    connection  = get_connection()  # opens connection to tasks.db
    cursor      = connection.cursor()   # sends instructions / receives results via connection ^
    
    # accessing personal tasks
    if list_id is None:
        cursor.execute(
            "SELECT id, title, due_datetime, priority, tag, is_done, created_at, list_id, is_personal "
            "FROM tasks WHERE is_personal = 1 AND user_id = ?", (user_id,)
        )
    # accessing list tasks
    else:
        # foreign or nonexistent list id both get 404
        # so user probing id's can't tell which exist
        if not user_can_access_list(cursor, user_id, list_id):
            cursor.close()
            connection.close()
            return jsonify({"error": "List not found."}), 404

        # if list exists, access its corresponding tasks
        cursor.execute(
            "SELECT id, title, due_datetime, priority, tag, is_done, created_at, list_id, is_personal "
            "FROM tasks WHERE list_id = ?", (list_id,)
        )
            
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
            "created_at":row[6],
            "list_id": row[7],
            "is_personal": row[8]
        })
    return jsonify(tasks)   # converts data into a JSON string and sends it as response to caller

@tasks_bp.route("/tasks", methods=["POST"])
def create_task():
    # session check
    # user_id always comes from session, not the request body
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Not logged in."}), 401
    
    data    = request.get_json()   # reads request body (JSON) from frontend and parses it into dict
    list_id = data.get("list_id")

    connection  = get_connection()
    cursor      = connection.cursor()

    if list_id is None:
        is_personal = 1
    else:
        # foreign or nonexistent list id both get 404
        # so user probing id's can't tell which exist
        if not user_can_access_list(cursor, user_id, list_id):
            cursor.close()
            connection.close()
            return jsonify({"error": "List not found."}), 404

        is_personal = 0

    cursor.execute(
        "INSERT INTO tasks (title, due_datetime, priority, tag, is_done, created_at, user_id, list_id, is_personal) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (data["title"], data["due_datetime"], data["priority"], data["tag"], 0, data["created_at"], user_id, list_id, is_personal)
    )   # '?' are placeholder values for the actual values inside the tuple, used to avoid SQL injection

    connection.commit()     # permanently saves all the pending changes made during the current transaction to the database file
    new_id      = cursor.lastrowid  # grabs the auto-generated id of the row just inserted
    cursor.close()          
    connection.close()      

    return jsonify({
        "id": new_id, "title": data["title"], "due_datetime": data["due_datetime"],
        "priority": data["priority"], "tag": data["tag"], "is_done": 0,
        "created_at": data["created_at"], "list_id": list_id, "is_personal": is_personal
    }), 201

@tasks_bp.route("/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    # session check
    # user_id always comes from session, not the request body
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Not logged in."}), 401
    
    data = request.get_json()   # parses updated values given by frontend from a JSON body into a dict

    connection = get_connection()
    cursor = connection.cursor()

    # foreign or nonexistent task id both get 404
    # so user probing id's can't tell which exist
    if get_accessible_task(cursor, user_id, task_id) is None:
        cursor.close()
        connection.close()
        return jsonify({"error": "Task not found."}), 404
    
    cursor.execute(
    "UPDATE tasks SET title=?, due_datetime=?, priority=?, tag=?, is_done=?  WHERE id=?",
    (data["title"], data["due_datetime"], data["priority"], data["tag"], data["is_done"], task_id)
    )

    connection.commit()
    cursor.close()
    connection.close()

    return jsonify({"status": "updated", "id": task_id})

@tasks_bp.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    # session check
    # user_id always comes from session, not the request body
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Not logged in."}), 401
    
    connection  = get_connection()
    cursor      = connection.cursor()

    # foreign or nonexistent task id both get 404
    # so user probing id's can't tell which exist
    if get_accessible_task(cursor, user_id, task_id) is None:
        cursor.close()
        connection.close()
        return jsonify({"error": "Task not found."}), 404

    cursor.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    connection.commit()
    cursor.close()
    connection.close()

    return jsonify({"status": "deleted", "id": task_id})
