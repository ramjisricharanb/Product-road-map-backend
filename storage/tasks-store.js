const { config } = require("../config");

const jsonStore = require("./tasks-store-json");
const oracleStore = require("./tasks-store-oracle");

function getStore() {
  return config.dbMode === "oracle" ? oracleStore : jsonStore;
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
