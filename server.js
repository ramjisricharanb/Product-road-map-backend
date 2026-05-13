const http = require("http");
const { URL } = require("url");
const {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} = require("./storage/tasks-store");

const {
  hashPassword,
  comparePassword,
  generateToken,
  authenticateRequest,
} = require("./utils/auth-helpers");

const { initOraclePool } = require("./storage/oracle-db");
const { sendPasswordResetEmail } = require("./utils/email");
const {
  createUser,
  getUserByEmail,
  getAllUsers,
  updateUserLastLogin,
  updateUserStatus,
  updateUserPassword,
  createPasswordResetToken,
  getValidResetToken,
  deleteResetTokensForUser,
} = require("./storage/users-store-oracle");
const crypto = require("crypto");

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

    // --- AUTH ROUTES ---

    if (request.method === "POST" && pathname === "/api/auth/signup") {
      const { email, password } = await readJsonBody(request);
      if (!email || !password) {
        return sendJson(response, 400, { message: "Email and password required" });
      }
      
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return sendJson(response, 400, { message: "Email already registered" });
      }

      // First user is Admin, others are Users
      const allUsers = await getAllUsers();
      const role = allUsers.length === 0 ? "ADMIN" : "USER";

      const hashedPwd = await hashPassword(password);
      const newUser = await createUser(email, hashedPwd, role);
      
      const token = generateToken(newUser);
      return sendJson(response, 201, { user: { id: newUser.id, email: newUser.email, role: newUser.role }, token });
    }

    if (request.method === "POST" && pathname === "/api/auth/login") {
      const { email, password } = await readJsonBody(request);
      if (!email || !password) {
        return sendJson(response, 400, { message: "Email and password required" });
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return sendJson(response, 401, { message: "Invalid credentials" });
      }
      
      if (!user.isActive) {
        return sendJson(response, 403, { message: "Account disabled. Contact admin." });
      }

      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return sendJson(response, 401, { message: "Invalid credentials" });
      }

      await updateUserLastLogin(user.id);
      const token = generateToken(user);
      
      return sendJson(response, 200, { user: { id: user.id, email: user.email, role: user.role }, token });
    }

    if (request.method === "GET" && pathname === "/api/auth/me") {
      const userPayload = authenticateRequest(request);
      if (!userPayload) {
        return sendJson(response, 401, { message: "Unauthorized" });
      }
      
      const user = await getUserByEmail(userPayload.email);
      if (!user || !user.isActive) {
        return sendJson(response, 401, { message: "Unauthorized or disabled" });
      }

      return sendJson(response, 200, { user: { id: user.id, email: user.email, role: user.role } });
    }

    if (request.method === "POST" && pathname === "/api/auth/forgot-password") {
      const { email } = await readJsonBody(request);
      if (!email) return sendJson(response, 400, { message: "Email required" });

      const user = await getUserByEmail(email);
      if (user && user.isActive) {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await createPasswordResetToken(user.id, tokenHash, expiresAt);

        const resetLink = `${process.env.FRONTEND_URL || "https://nconnect.co.in"}/reset-password.html?token=${rawToken}`;
        await sendPasswordResetEmail(user.email, resetLink);
      }
      
      // Always return 200 to prevent email enumeration
      return sendJson(response, 200, { message: "If the email exists, a reset link was sent." });
    }

    if (request.method === "POST" && pathname === "/api/auth/reset-password") {
      const { token, newPassword } = await readJsonBody(request);
      if (!token || !newPassword) return sendJson(response, 400, { message: "Token and new password required" });

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const validToken = await getValidResetToken(tokenHash);

      if (!validToken) {
        return sendJson(response, 400, { message: "Invalid or expired reset token" });
      }

      const hashedPwd = await hashPassword(newPassword);
      await updateUserPassword(validToken.userId, hashedPwd);
      await deleteResetTokensForUser(validToken.userId);

      return sendJson(response, 200, { message: "Password updated successfully" });
    }

    // --- ADMIN ROUTES ---

    if (request.method === "GET" && pathname === "/api/admin/users") {
      const userPayload = authenticateRequest(request);
      if (!userPayload || userPayload.role !== "ADMIN") {
        return sendJson(response, 403, { message: "Forbidden: Admins only" });
      }
      const users = await getAllUsers();
      return sendJson(response, 200, users);
    }

    if (request.method === "PUT" && pathname.startsWith("/api/admin/users/") && pathname.endsWith("/revoke")) {
      const userPayload = authenticateRequest(request);
      if (!userPayload || userPayload.role !== "ADMIN") {
        return sendJson(response, 403, { message: "Forbidden: Admins only" });
      }
      
      const targetUserId = pathname.split("/")[4];
      if (targetUserId === userPayload.userId) {
        return sendJson(response, 400, { message: "Cannot revoke yourself" });
      }

      const { isActive } = await readJsonBody(request);
      await updateUserStatus(targetUserId, isActive);
      
      return sendJson(response, 200, { message: "User status updated" });
    }

    // --- EXISTING TASK ROUTES (Public for now per requirements) ---


    if (request.method === "GET" && pathname === "/api/tasks") {
  const tasks = await getTasks();
  sendJson(response, 200, tasks);
  return;
}

    if (request.method === "POST" && pathname === "/api/tasks") {
      const body = await readJsonBody(request);
      const newTask = await createTask(body);
      sendJson(response, 201, newTask);
      return;
    }

    if (pathname.startsWith("/api/tasks/")) {
      const taskId = pathname.split("/").pop();

      if (request.method === "PUT") {
        const body = await readJsonBody(request);
        const updatedTask = await updateTask(taskId, body);

        if (!updatedTask) {
          sendJson(response, 404, { message: "Task not found" });
          return;
        }

        sendJson(response, 200, updatedTask);
        return;
      }

      if (request.method === "DELETE") {
        const deleted = await deleteTask(taskId);

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

(async () => {
  if (config.dbMode === "oracle") {
    await initOraclePool();
  }
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
  });
})();

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
