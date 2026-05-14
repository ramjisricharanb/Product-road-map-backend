const { config } = require("../config");

const jsonStore = require("./tasks-store-json");
const oracleStore = require("./tasks-store-oracle");
const sqliteStore = require("./tasks-store-sqlite");

function getStore() {
  if (config.dbMode === "oracle") return oracleStore;
  if (config.dbMode === "sqlite") return sqliteStore;
  return jsonStore;
}

async function getTasks() {
  return getStore().getTasks();
}

async function createTask(taskInput) {
  return getStore().createTask(taskInput);
}

async function updateTask(taskId, taskInput) {
  return getStore().updateTask(taskId, taskInput);
}

async function deleteTask(taskId) {
  return getStore().deleteTask(taskId);
}

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
