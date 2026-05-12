const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_local_dev_only";
const JWT_EXPIRES_IN = "7d"; // 7 days

async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

async function comparePassword(plainTextPassword, hashedPassword) {
  return bcrypt.compare(plainTextPassword, hashedPassword);
}

function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function extractTokenFromRequest(request) {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

function authenticateRequest(request) {
  const token = extractTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  extractTokenFromRequest,
  authenticateRequest,
};
