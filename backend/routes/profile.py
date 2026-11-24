# ----------------------------------------------------
#   routes/profile.py - get_profile & update_profile
# ----------------------------------------------------

from flask import Blueprint, jsonify, request, render_template, session, redirect
from werkzeug.security import generate_password_hash
from db import get_connection
from auth import EMAIL_REGEX
from access import login_required

profile_bp = Blueprint("profile", __name__)

# ----- PROFILE ROUTE -----
@profile_bp.route("/profile", methods=["GET"])
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
@profile_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    # user_id always comes from session, not the request body
    user_id = session["user_id"]

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