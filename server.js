const http = require("http");
const { URL } = require("url");
const {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} = require("./storage/tasks-store");

const { config } = require("./config");
const PORT = config.port;

const server = http.createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const { pathname } = requestUrl;

  try {
    if (request.method === "GET" && pathname === "/api/health") {
      sendJson(response, 200, {
        message: "Backend is running",
        service: "project-dashboard-backend",
      });
      return;
    }

    if (request.method === "GET" && pathname === "/api/tasks") {
  const tasks = await getTasks();
  sendJson(response, 200, tasks);
  return;
}

    if (request.method === "POST" && pathname === "/api/tasks") {
      const body = await readJsonBody(request);
      const newTask = createTask(body);
      sendJson(response, 201, newTask);
      return;
    }

    if (pathname.startsWith("/api/tasks/")) {
      const taskId = pathname.split("/").pop();

      if (request.method === "PUT") {
        const body = await readJsonBody(request);
        const updatedTask = updateTask(taskId, body);

        if (!updatedTask) {
          sendJson(response, 404, { message: "Task not found" });
          return;
        }

        sendJson(response, 200, updatedTask);
        return;
      }

      if (request.method === "DELETE") {
        const deleted = deleteTask(taskId);

        if (!deleted) {
          sendJson(response, 404, { message: "Task not found" });
          return;
        }

        sendJson(response, 200, { message: "Task deleted successfully" });
        return;
      }
    }

    sendJson(response, 404, { message: "Route not found" });
  } catch (error) {
    sendJson(response, 500, {
      message: "Something went wrong in the backend",
      error: error.message,
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(data, null, 2));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString();
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    request.on("error", reject);
  });
}
