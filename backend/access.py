# ---------------------------------------------
#   access.py - ownership helpers
# ---------------------------------------------

def user_can_access_list(cursor, user_id, list_id):
    cursor.execute(
        "SELECT 1 FROM list_members WHERE list_id = ? AND user_id = ?",
        (list_id, user_id)
    )
    return cursor.fetchone() is not None

def get_accessible_task(cursor, user_id, task_id):
    cursor.execute(
        """SELECT tasks.id
            FROM tasks
            LEFT JOIN list_members
                ON list_members.list_id = tasks.list_id
                AND list_members.user_id = :user_id
            WHERE tasks.id = :task_id
                AND (
                    (tasks.is_personal = 1 AND tasks.user_id = :user_id)
                    OR (tasks.is_personal = 0 AND list_members.user_id IS NOT NULL)
                )""",
        {"user_id": user_id, "task_id": task_id}
    )
    return cursor.fetchone()