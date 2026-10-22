// FILENAME: task.js

// priority constants
const HIGH = 1;
const MED  = 2;
const LOW  = 3;

class Task {
    constructor(title, dueDateTime, priority, tag, id = null, createdAt = null, isDone = false, listId = null, isPersonal = 1) {
        this.title       = title;
        this.dueDateTime = dueDateTime;
        this.priority    = priority;
        this.tag         = tag;

        this.id          = id;

        // returns time & date the Task object is instantiated
        // use given value or generate a new one
        this.createdAt   = createdAt ?? new Date().toISOString();
        
        this.isDone      = isDone;

        this.listId      = listId;
        this.isPersonal  = isPersonal;
    }

    // getters and setters are for mutable fields only
    // getters - for reading/reviewing Tasks
    getTitle() {
        return this.title;
    }

    getId() {
        return this.id;
    }

    getDueDateTime() {
        return this.dueDateTime;
    }

    getPriority() {
        return this.priority;
    }

    getTag() {
        return this.tag;
    }
    
    getCreatedAt() {
        return this.createdAt;
    }

    getIsDone() {
        return this.isDone;
    }
    
    // setters - for updating Tasks
    setTitle(newTitle) {
        this.title = newTitle;
    }
    
    setDueDateTime(newDueDateTime) {
        this.dueDateTime = newDueDateTime;
    }
    
    setPriority(newPriority) {
        this.priority = newPriority;
    }
    
    setTag(newTag) {
        this.tag = newTag;
    }

    // setters for isDone
    markDone() {
        this.isDone = true;
    }

    markUndone() {
        this.isDone = false;
    }

    // static because this method belongs to the class itself
    // fromJSON bridges "plain objects" from Flask/SQLite to JS logics
    static fromJSON(data) {
        return new Task(
            data.title,
            data.due_datetime,
            data.priority,
            data.tag,
            data.id,
            data.created_at,
            Boolean(data.is_done),   // converts returned 0/1 to false/true respectively
            data.list_id,
            data.is_personal
        );
    }
}