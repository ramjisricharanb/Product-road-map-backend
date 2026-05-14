const crypto = require("crypto");
const { getDb } = require("./sqlite-db");

// User Functions

function createUser(email, passwordHash, role = "USER") {
  const db = getDb();
  const userId = crypto.randomUUID();
  const cleanEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
    VALUES (@id, @email, @password_hash, @role, 1, @created_at, @updated_at)
  `).run({
    id: userId,
    email: cleanEmail,
    password_hash: passwordHash,
    role: role.toUpperCase(),
    created_at: now,
    updated_at: now,
  });

  return { id: userId, email: cleanEmail, role: role.toUpperCase(), isActive: true };
}

function getUserByEmail(email) {
  const db = getDb();
  const cleanEmail = email.trim().toLowerCase();
  const row = db.prepare(`
    SELECT id, email, password_hash, role, is_active, created_at, updated_at, last_login_at
    FROM users WHERE email = @email
  `).get({ email: cleanEmail });

  if (!row) return null;
  return mapRowToUser(row);
}

function getUserById(id) {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, email, password_hash, role, is_active, created_at, updated_at, last_login_at
    FROM users WHERE id = @id
  `).get({ id });

  if (!row) return null;
  return mapRowToUser(row);
}

function getAllUsers() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, email, role, is_active, created_at, last_login_at
    FROM users ORDER BY created_at DESC
  `).all();

  return rows.map(row => ({
    id: row.id,
    email: row.email,
    role: row.role,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  }));
}

function updateUserLastLogin(id) {
  const db = getDb();
  db.prepare(`
    UPDATE users SET last_login_at = datetime('now') WHERE id = @id
  `).run({ id });
}

function updateUserStatus(id, isActive) {
  const db = getDb();
  db.prepare(`
    UPDATE users SET is_active = @is_active, updated_at = datetime('now') WHERE id = @id
  `).run({ is_active: isActive ? 1 : 0, id });
}

function updateUserPassword(id, passwordHash) {
  const db = getDb();
  db.prepare(`
    UPDATE users SET password_hash = @password_hash, updated_at = datetime('now') WHERE id = @id
  `).run({ password_hash: passwordHash, id });
}

// Password Reset Token Functions

function createPasswordResetToken(userId, tokenHash, expiresAt) {
  const db = getDb();
  const tokenId = crypto.randomUUID();

  // Clear any existing tokens for this user
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = @user_id").run({ user_id: userId });

  // Insert new token
  db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
    VALUES (@id, @user_id, @token_hash, @expires_at)
  `).run({
    id: tokenId,
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });
}

function getValidResetToken(tokenHash) {
  const db = getDb();
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT id, user_id, token_hash, expires_at
    FROM password_reset_tokens
    WHERE token_hash = @token_hash AND expires_at > @now
  `).get({ token_hash: tokenHash, now });

  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
  };
}

function deleteResetTokensForUser(userId) {
  const db = getDb();
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = @user_id").run({ user_id: userId });
}

function mapRowToUser(row) {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  getAllUsers,
  updateUserLastLogin,
  updateUserStatus,
  updateUserPassword,
  createPasswordResetToken,
  getValidResetToken,
  deleteResetTokensForUser,
};
