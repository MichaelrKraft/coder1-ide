// Task management module
class TaskManager {
    constructor() {
        this.tasks = new Map();
    }

    createTask(description, userId = 'default') {
        const task = {
            id: Date.now().toString(),
            description,
            userId,
            status: 'pending',
            createdAt: new Date(),
            completedAt: null
        };
        this.tasks.set(task.id, task);
        return task;
    }

    getTask(taskId) {
        return this.tasks.get(taskId);
    }

    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    updateTaskStatus(taskId, status) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.status = status;
            if (status === 'completed') {
                task.completedAt = new Date();
            }
            return task;
        }
        return null;
    }

    deleteTask(taskId) {
        return this.tasks.delete(taskId);
    }
}

// Singleton instance
const taskManager = new TaskManager();

module.exports = { taskManager };