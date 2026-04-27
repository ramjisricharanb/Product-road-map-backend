const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const dataFilePath = path.join(__dirname, "..", "data", "tasks.json");

function getTasks() {
  return readTasks();
}

function createTask(taskInput) {
  validateTask(taskInput);

  const tasks = readTasks();
  const newTask = buildTask(taskInput, crypto.randomUUID());
  tasks.unshift(newTask);
  writeTasks(tasks);
  return newTask;
}

function updateTask(taskId, taskInput) {
  validateTask(taskInput);

  const tasks = readTasks();
  const taskIndex = tasks.findIndex((task) => task.id === taskId);

  if (taskIndex === -1) {
    return null;
  }

  const existingTask = tasks[taskIndex];
  const updatedTask = {
    ...existingTask,
    ...buildTask(taskInput, existingTask.id),
    createdAt: existingTask.createdAt,
    updatedAt: new Date().toISOString(),
  };

  tasks[taskIndex] = updatedTask;
  writeTasks(tasks);
  return updatedTask;
}

function deleteTask(taskId) {
  const tasks = readTasks();
  const filteredTasks = tasks.filter((task) => task.id !== taskId);

  if (filteredTasks.length === tasks.length) {
    return false;
  }

  writeTasks(filteredTasks);
  return true;
}

function buildTask(taskInput, taskId) {
  return {
    id: taskId,
    platform: taskInput.platform.trim(),
    moduleName: taskInput.moduleName.trim(),
    owners: taskInput.owners.trim(),
    priority: taskInput.priority.trim(),
    categoryType: taskInput.categoryType?.trim() || "-",
    status: taskInput.status.trim(),
    percentCompleted: Number(taskInput.percentCompleted || 0),
    deadline: taskInput.deadline || "-",
    ogDeadline: taskInput.ogDeadline || "-",
    description: taskInput.description?.trim() || "",
    technicalTeam: taskInput.technicalTeam.trim(),
    comments: taskInput.comments?.trim() || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
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

function readTasks() {
  ensureDataFile();
  const fileContent = fs.readFileSync(dataFilePath, "utf8");
  return JSON.parse(fileContent);
}

function writeTasks(tasks) {
  fs.writeFileSync(dataFilePath, JSON.stringify(tasks, null, 2));
}

function ensureDataFile() {
  const dataDirectory = path.dirname(dataFilePath);

  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, "[]");
  }
}

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
