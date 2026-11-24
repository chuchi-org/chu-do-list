# ---------------------------------------------
#   routes/auth.py - auth routes
# ---------------------------------------------

import re
import secrets
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, render_template, session, redirect
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_connection

auth_bp = Blueprint("auth", __name__)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")     # basic email format for reference

# ----- SIGNUP ROUTE -----
@auth_bp.route("/signup")
def signup_page():
    return render_template("signup.html")

@auth_bp.route("/signup", methods=["POST"])
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

    connection  = get_connection()
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


# ----- LOGIN / LOGOUT ROUTES -----
@auth_bp.route("/login")
def login():
    if session.get("user_id") is not None:
        return redirect("/profile")     # prevent back button of browser to go to previous page when logged in
    response = render_template("login.html")
    # tells browser to not cache this page for back / forward restoration
    return response, 200, {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache"
    }

@auth_bp.route("/login", methods=["POST"])
def authenticate(): # login() already exists above
    data = request.get_json()

    email    = data.get("email", "").strip()
    password = data.get("password", "")

    connection = get_connection()
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

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"status": "Session ended"}), 200


# ----- FORGOT PASSWORD ROUTE -----
@auth_bp.route("/forgot-password")
def forgot_password():
    return render_template("forgot-password.html")

@auth_bp.route("/forgot-password", methods=["POST"])
def forget_password():
    data = request.get_json()
    email = data.get("email", "").strip()

    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    connection = get_connection()
    cursor = connection.cursor()

    # look up user by email
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    if user is not None:
        # if user exists:
        # generate secure token and expiry time
        user_id = user[0]
        token = secrets.token_urlsafe(32)
        print(f"[DEMO] Reset code for {email}: {token}")
        expiry= (datetime.now() + timedelta(minutes=5)).isoformat()

        # update the user's row with token & expiry
        cursor.execute("UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
                        (token, expiry, user_id)
        )
        connection.commit()
    
    cursor.close()
    connection.close()

    return jsonify({
        "status": "If that email is registered, a reset code has been generated.",
    }), 200


# ----- RESET PASSWORD ROUTES ----- #
@auth_bp.route("/reset-password")
def reset_password_page():
    return render_template("reset-password.html")

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    token = data.get("token", "").strip()
    new_password = data.get("password", "")

    if not token or not new_password:
        return jsonify({"error": "Reset code and new password are required."}), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long."}), 400

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT id, reset_token_expiry FROM users WHERE reset_token = ?", (token,))
    user = cursor.fetchone()

    if user is None or (datetime.fromisoformat(user[1]) < datetime.now()):
        cursor.close()
        connection.close()
        return jsonify({"error": "Invalid or expired reset code."}), 400

    password_hash = generate_password_hash(new_password)

    cursor.execute("UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?", (password_hash, user[0]))

    connection.commit()
    cursor.close()
    connection.close()

    return jsonify({"status": "password_reset"}), 200
