const oracledb = require("oracledb");
const { getConnection } = require("./oracle-db");

async function getTasks() {
  const connection = await getConnection();

  try {
    const result = await connection.execute(
      `SELECT
         id,
         platform,
         module_name,
         owners,
         priority,
         category_type,
         status,
         percent_completed,
         start_date,
         completed_date,
         description,
         technical_team,
         comments,
         created_at,
         updated_at
       FROM TASKS
       ORDER BY created_at DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows.map(mapOracleRowToTask);
  } finally {
    await connection.close();
  }
}

async function createTask(taskInput) {
  validateTask(taskInput);
  const connection = await getConnection();

  try {
    const taskId = `task-${Date.now()}`;

    await connection.execute(
      `INSERT INTO TASKS (
         id,
         platform,
         module_name,
         owners,
         priority,
         category_type,
         status,
         percent_completed,
         start_date,
         completed_date,
         description,
         technical_team,
         comments
       ) VALUES (
         :id,
         :platform,
         :module_name,
         :owners,
         :priority,
         :category_type,
         :status,
         :percent_completed,
         :start_date,
         :completed_date,
         :description,
         :technical_team,
         :comments
       )`,
      buildOracleBinds(taskInput, taskId),
      { autoCommit: true }
    );

    return {
      id: taskId,
      ...normalizeTaskForResponse(taskInput),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } finally {
    await connection.close();
  }
}

async function updateTask(taskId, taskInput) {
  validateTask(taskInput);
  const connection = await getConnection();

  try {
    const result = await connection.execute(
      `UPDATE TASKS
       SET platform = :platform,
           module_name = :module_name,
           owners = :owners,
           priority = :priority,
           category_type = :category_type,
           status = :status,
           percent_completed = :percent_completed,
           start_date = :start_date,
           completed_date = :completed_date,
           description = :description,
           technical_team = :technical_team,
           comments = :comments,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = :id`,
      buildOracleBinds(taskInput, taskId),
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return null;
    }

    return {
      id: taskId,
      ...normalizeTaskForResponse(taskInput),
      updatedAt: new Date().toISOString(),
    };
  } finally {
    await connection.close();
  }
}

async function deleteTask(taskId) {
  const connection = await getConnection();

  try {
    const result = await connection.execute(
      `DELETE FROM TASKS WHERE id = :id`,
      { id: taskId },
      { autoCommit: true }
    );

    return result.rowsAffected > 0;
  } finally {
    await connection.close();
  }
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

function buildOracleBinds(taskInput, taskId) {
  return {
    id: taskId,
    platform: taskInput.platform.trim(),
    module_name: taskInput.moduleName.trim(),
    owners: taskInput.owners.trim(),
    priority: taskInput.priority.trim(),
    category_type: taskInput.categoryType?.trim() || null,
    status: taskInput.status.trim(),
    percent_completed: Number(taskInput.percentCompleted || 0),
    start_date: toOracleDate(taskInput.startDate),
    completed_date: toOracleDate(taskInput.completedDate),
    description: taskInput.description?.trim() || null,
    technical_team: taskInput.technicalTeam.trim(),
    comments: taskInput.comments?.trim() || null,
  };
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

function mapOracleRowToTask(row) {
  return {
    id: row.ID,
    platform: row.PLATFORM,
    moduleName: row.MODULE_NAME,
    owners: row.OWNERS,
    priority: row.PRIORITY,
    categoryType: row.CATEGORY_TYPE || "-",
    status: row.STATUS,
    percentCompleted: row.PERCENT_COMPLETED || 0,
    startDate: fromOracleDate(row.START_DATE),
    completedDate: fromOracleDate(row.COMPLETED_DATE),
    description: row.DESCRIPTION || "",
    technicalTeam: row.TECHNICAL_TEAM,
    comments: row.COMMENTS || "",
    createdAt: row.CREATED_AT,
    updatedAt: row.UPDATED_AT,
  };
}

function toOracleDate(value) {
  if (!value || value === "-") {
    return null;
  }

  return new Date(`${value}T00:00:00`);
}

function fromOracleDate(value) {
  if (!value) {
    return "-";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
