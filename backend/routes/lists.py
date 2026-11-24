# ----------------------------------------------------
#   routes/lists.py - get_lists, create_lists,
#                     add_list_member
# ----------------------------------------------------

import sqlite3
from flask import Blueprint, jsonify, request, session
from db import get_db
from access import login_required

lists_bp = Blueprint("lists", __name__)

# ----- LIST ROUTES -----
@lists_bp.route("/lists", methods=["GET"])
@login_required
def get_lists():
    # user_id always comes from session, not the request body
    user_id = session["user_id"]    

    with get_db() as connection:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT DISTINCT l.id, l.name, l.owner_id
            FROM lists l
            LEFT JOIN list_members lm ON l.id = lm.list_id
            WHERE l.owner_id = ? OR lm.user_id = ?
        """, (user_id, user_id))
        rows = cursor.fetchall()

    lists = [{"id": r[0], "name": r[1], "owner_id": r[2]} for r in rows]

    return jsonify(lists), 200


@lists_bp.route("/lists", methods=["POST"])
@login_required
def create_list():
    # user_id always comes from session, not the request body
    user_id = session["user_id"]

    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "List name is required."}), 400

    with get_db() as connection:
        cursor = connection.cursor()
        cursor.execute("INSERT INTO lists (name, owner_id) VALUES (?, ?)", (name, user_id))
        new_id = cursor.lastrowid
        cursor.execute("INSERT INTO list_members (list_id, user_id, role) VALUES (?, ?, 'owner')", (new_id, user_id))

    return jsonify({"id": new_id, "name": name, "owner_id": user_id}), 201


@lists_bp.route("/lists/<int:list_id>/members", methods=["POST"])
@login_required
def add_list_member(list_id):
    # user_id always comes from session, not the request body
    user_id = session["user_id"]

    data = request.get_json()
    email = data.get("email", "").strip()
    if not email:
        return jsonify({"error": "Email is required"}), 400

    with get_db() as connection:
        cursor = connection.cursor()

        # verify if list exists and current user is the owner
        cursor.execute("SELECT owner_id FROM lists WHERE id = ?", (list_id,))
        list_row = cursor.fetchone()
        if not list_row or list_row[0] != user_id:
            return jsonify({"error": "List not found."}), 404

        # find target user by email
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        target_user = cursor.fetchone()
        if not target_user:
            return jsonify({"error": "User with this email does not exist."}), 404

        target_user_id = target_user[0]

        try:
            cursor.execute("INSERT INTO list_members (list_id, user_id) VALUES (?, ?)", (list_id, target_user_id))
        except sqlite3.IntegrityError:
            return jsonify({"error": "User is already a member of this list."}), 409

    return jsonify({"status": "Member added.", "email": email}), 200