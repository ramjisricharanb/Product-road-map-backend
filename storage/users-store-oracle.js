const crypto = require("crypto");
const { getConnection } = require("./oracle-db");

// User Functions

async function createUser(email, passwordHash, role = "USER") {
  const connection = await getConnection();
  try {
    const userId = crypto.randomUUID();
    const cleanEmail = email.trim().toLowerCase();

    await connection.execute(
      `INSERT INTO USERS (
         id, email, password_hash, role, is_active
       ) VALUES (
         :id, :email, :password_hash, :role, 1
       )`,
      {
        id: userId,
        email: cleanEmail,
        password_hash: passwordHash,
        role: role.toUpperCase(),
      },
      { autoCommit: true }
    );

    return { id: userId, email: cleanEmail, role: role.toUpperCase(), isActive: 1 };
  } finally {
    await connection.close();
  }
}

async function getUserByEmail(email) {
  const connection = await getConnection();
  try {
    const cleanEmail = email.trim().toLowerCase();
    const result = await connection.execute(
      `SELECT id, email, password_hash, role, is_active, created_at, updated_at, last_login_at 
       FROM USERS WHERE email = :email`,
      { email: cleanEmail },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) return null;
    return mapOracleRowToUser(result.rows[0]);
  } finally {
    await connection.close();
  }
}

async function getUserById(id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT id, email, password_hash, role, is_active, created_at, updated_at, last_login_at 
       FROM USERS WHERE id = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) return null;
    return mapOracleRowToUser(result.rows[0]);
  } finally {
    await connection.close();
  }
}

async function getAllUsers() {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT id, email, role, is_active, created_at, last_login_at 
       FROM USERS ORDER BY created_at DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows.map(row => ({
      id: row.ID,
      email: row.EMAIL,
      role: row.ROLE,
      isActive: row.IS_ACTIVE === 1,
      createdAt: row.CREATED_AT,
      lastLoginAt: row.LAST_LOGIN_AT
    }));
  } finally {
    await connection.close();
  }
}

async function updateUserLastLogin(id) {
  const connection = await getConnection();
  try {
    await connection.execute(
      `UPDATE USERS SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id`,
      { id },
      { autoCommit: true }
    );
  } finally {
    await connection.close();
  }
}

async function updateUserStatus(id, isActive) {
  const connection = await getConnection();
  try {
    await connection.execute(
      `UPDATE USERS SET is_active = :is_active, updated_at = CURRENT_TIMESTAMP WHERE id = :id`,
      { is_active: isActive ? 1 : 0, id },
      { autoCommit: true }
    );
  } finally {
    await connection.close();
  }
}

async function updateUserPassword(id, passwordHash) {
  const connection = await getConnection();
  try {
    await connection.execute(
      `UPDATE USERS SET password_hash = :password_hash, updated_at = CURRENT_TIMESTAMP WHERE id = :id`,
      { password_hash: passwordHash, id },
      { autoCommit: true }
    );
  } finally {
    await connection.close();
  }
}

// Password Reset Token Functions

async function createPasswordResetToken(userId, tokenHash, expiresAt) {
  const connection = await getConnection();
  try {
    const tokenId = crypto.randomUUID();
    
    // First, clear any existing tokens for this user
    await connection.execute(
      `DELETE FROM PASSWORD_RESET_TOKENS WHERE user_id = :user_id`,
      { user_id: userId }
    );

    // Insert new token
    await connection.execute(
      `INSERT INTO PASSWORD_RESET_TOKENS (
         id, user_id, token_hash, expires_at
       ) VALUES (
         :id, :user_id, :token_hash, :expires_at
       )`,
      {
        id: tokenId,
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt
      },
      { autoCommit: true }
    );
  } finally {
    await connection.close();
  }
}

async function getValidResetToken(tokenHash) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT id, user_id, token_hash, expires_at 
       FROM PASSWORD_RESET_TOKENS 
       WHERE token_hash = :token_hash AND expires_at > CURRENT_TIMESTAMP`,
      { token_hash: tokenHash },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) return null;
    return {
      id: result.rows[0].ID,
      userId: result.rows[0].USER_ID,
      tokenHash: result.rows[0].TOKEN_HASH,
      expiresAt: result.rows[0].EXPIRES_AT
    };
  } finally {
    await connection.close();
  }
}

async function deleteResetTokensForUser(userId) {
  const connection = await getConnection();
  try {
    await connection.execute(
      `DELETE FROM PASSWORD_RESET_TOKENS WHERE user_id = :user_id`,
      { user_id: userId },
      { autoCommit: true }
    );
  } finally {
    await connection.close();
  }
}

function mapOracleRowToUser(row) {
  return {
    id: row.ID,
    email: row.EMAIL,
    passwordHash: row.PASSWORD_HASH,
    role: row.ROLE,
    isActive: row.IS_ACTIVE === 1,
    createdAt: row.CREATED_AT,
    updatedAt: row.UPDATED_AT,
    lastLoginAt: row.LAST_LOGIN_AT,
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
  deleteResetTokensForUser
};
