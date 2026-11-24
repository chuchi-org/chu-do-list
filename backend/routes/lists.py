# ----------------------------------------------------
#   routes/lists.py - get_lists, create_lists,
#                     add_list_member
# ----------------------------------------------------

import sqlite3
from flask import Blueprint, jsonify, request, session
from db import get_connection

lists_bp = Blueprint("lists", __name__)

# ----- LIST ROUTES -----
@lists_bp.route("/lists", methods=["GET"])
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

@lists_bp.route("/lists", methods=["POST"])
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


@lists_bp.route("/lists/<int:list_id>/members", methods=["POST"])
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