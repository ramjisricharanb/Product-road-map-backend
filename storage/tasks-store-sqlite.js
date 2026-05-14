const { getDb } = require("./sqlite-db");

function getTasks() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, platform, module_name, owners, priority, category_type,
           status, percent_completed, start_date, completed_date,
           description, technical_team, comments, created_at, updated_at
    FROM tasks
    ORDER BY created_at DESC
  `).all();

  return rows.map(mapRowToTask);
}

function createTask(taskInput) {
  validateTask(taskInput);
  const db = getDb();
  const taskId = `task-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tasks (id, platform, module_name, owners, priority, category_type,
                       status, percent_completed, start_date, completed_date,
                       description, technical_team, comments, created_at, updated_at)
    VALUES (@id, @platform, @module_name, @owners, @priority, @category_type,
            @status, @percent_completed, @start_date, @completed_date,
            @description, @technical_team, @comments, @created_at, @updated_at)
  `).run({
    id: taskId,
    platform: taskInput.platform.trim(),
    module_name: taskInput.moduleName.trim(),
    owners: taskInput.owners.trim(),
    priority: taskInput.priority.trim(),
    category_type: taskInput.categoryType?.trim() || null,
    status: taskInput.status.trim(),
    percent_completed: Number(taskInput.percentCompleted || 0),
    start_date: taskInput.startDate || null,
    completed_date: taskInput.completedDate || null,
    description: taskInput.description?.trim() || null,
    technical_team: taskInput.technicalTeam.trim(),
    comments: taskInput.comments?.trim() || null,
    created_at: now,
    updated_at: now,
  });

  return {
    id: taskId,
    ...normalizeTaskForResponse(taskInput),
    createdAt: now,
    updatedAt: now,
  };
}

function updateTask(taskId, taskInput) {
  validateTask(taskInput);
  const db = getDb();
  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE tasks
    SET platform = @platform,
        module_name = @module_name,
        owners = @owners,
        priority = @priority,
        category_type = @category_type,
        status = @status,
        percent_completed = @percent_completed,
        start_date = @start_date,
        completed_date = @completed_date,
        description = @description,
        technical_team = @technical_team,
        comments = @comments,
        updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: taskId,
    platform: taskInput.platform.trim(),
    module_name: taskInput.moduleName.trim(),
    owners: taskInput.owners.trim(),
    priority: taskInput.priority.trim(),
    category_type: taskInput.categoryType?.trim() || null,
    status: taskInput.status.trim(),
    percent_completed: Number(taskInput.percentCompleted || 0),
    start_date: taskInput.startDate || null,
    completed_date: taskInput.completedDate || null,
    description: taskInput.description?.trim() || null,
    technical_team: taskInput.technicalTeam.trim(),
    comments: taskInput.comments?.trim() || null,
    updated_at: now,
  });

  if (result.changes === 0) return null;

  return {
    id: taskId,
    ...normalizeTaskForResponse(taskInput),
    updatedAt: now,
  };
}

function deleteTask(taskId) {
  const db = getDb();
  const result = db.prepare("DELETE FROM tasks WHERE id = @id").run({ id: taskId });
  return result.changes > 0;
}

function validateTask(taskInput) {
  const requiredFields = [
    "platform",
    "moduleName",
    "owners",
    "priority",
    "status",
    "technicalTeam",
  ];

  requiredFields.forEach((field) => {
    const value = taskInput[field];
    if (!value || !String(value).trim()) {
      throw new Error(`${field} is required`);
    }
  });
}

function normalizeTaskForResponse(taskInput) {
  return {
    platform: taskInput.platform.trim(),
    moduleName: taskInput.moduleName.trim(),
    owners: taskInput.owners.trim(),
    priority: taskInput.priority.trim(),
    categoryType: taskInput.categoryType?.trim() || "-",
    status: taskInput.status.trim(),
    percentCompleted: Number(taskInput.percentCompleted || 0),
    startDate: taskInput.startDate || "-",
    completedDate: taskInput.completedDate || "-",
    description: taskInput.description?.trim() || "",
    technicalTeam: taskInput.technicalTeam.trim(),
    comments: taskInput.comments?.trim() || "",
  };
}

function mapRowToTask(row) {
  return {
    id: row.id,
    platform: row.platform,
    moduleName: row.module_name,
    owners: row.owners,
    priority: row.priority,
    categoryType: row.category_type || "-",
    status: row.status,
    percentCompleted: row.percent_completed || 0,
    startDate: row.start_date || "-",
    completedDate: row.completed_date || "-",
    description: row.description || "",
    technicalTeam: row.technical_team,
    comments: row.comments || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
