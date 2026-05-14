/**
 * One-time migration script: Oracle → SQLite
 * 
 * Run on the VM with:
 *   DB_MODE=oracle node scripts/migrate-oracle-to-sqlite.js
 * 
 * This will:
 *   1. Connect to Oracle and read all tasks and users
 *   2. Write them into a local SQLite database at ./data/nconnect.db
 */

const path = require("path");

// Force-load .env
process.env.DB_MODE = process.env.DB_MODE || "oracle";
require("../config");

const { initOraclePool, getConnection } = require("../storage/oracle-db");
const oracledb = require("oracledb");
const { initSqlite, getDb } = require("../storage/sqlite-db");

async function migrate() {
  console.log("=== Oracle → SQLite Migration ===\n");

  // Initialize Oracle connection
  console.log("1. Connecting to Oracle...");
  await initOraclePool();
  console.log("   Oracle connected.\n");

  // Initialize SQLite
  console.log("2. Initializing SQLite...");
  initSqlite();
  const db = getDb();
  console.log("   SQLite ready.\n");

  // Migrate Tasks
  console.log("3. Migrating tasks...");
  const oracleConn = await getConnection();

  try {
    const taskResult = await oracleConn.execute(
      `SELECT id, platform, module_name, owners, priority, category_type,
              status, percent_completed, start_date, completed_date,
              description, technical_team, comments, created_at, updated_at
       FROM TASKS`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const insertTask = db.prepare(`
      INSERT OR REPLACE INTO tasks (id, platform, module_name, owners, priority, category_type,
                                     status, percent_completed, start_date, completed_date,
                                     description, technical_team, comments, created_at, updated_at)
      VALUES (@id, @platform, @module_name, @owners, @priority, @category_type,
              @status, @percent_completed, @start_date, @completed_date,
              @description, @technical_team, @comments, @created_at, @updated_at)
    `);

    const insertMany = db.transaction((tasks) => {
      for (const row of tasks) {
        insertTask.run({
          id: row.ID,
          platform: row.PLATFORM,
          module_name: row.MODULE_NAME,
          owners: row.OWNERS,
          priority: row.PRIORITY,
          category_type: row.CATEGORY_TYPE || null,
          status: row.STATUS,
          percent_completed: row.PERCENT_COMPLETED || 0,
          start_date: row.START_DATE ? formatDate(row.START_DATE) : null,
          completed_date: row.COMPLETED_DATE ? formatDate(row.COMPLETED_DATE) : null,
          description: typeof row.DESCRIPTION === 'string' ? row.DESCRIPTION : null,
          technical_team: row.TECHNICAL_TEAM,
          comments: typeof row.COMMENTS === 'string' ? row.COMMENTS : null,
          created_at: row.CREATED_AT ? row.CREATED_AT.toISOString() : new Date().toISOString(),
          updated_at: row.UPDATED_AT ? row.UPDATED_AT.toISOString() : new Date().toISOString(),
        });
      }
    });

    insertMany(taskResult.rows);
    console.log(`   Migrated ${taskResult.rows.length} tasks.\n`);

    // Migrate Users
    console.log("4. Migrating users...");
    const userResult = await oracleConn.execute(
      `SELECT id, email, password_hash, role, is_active, created_at, updated_at, last_login_at
       FROM USERS`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const insertUser = db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, role, is_active, created_at, updated_at, last_login_at)
      VALUES (@id, @email, @password_hash, @role, @is_active, @created_at, @updated_at, @last_login_at)
    `);

    const insertManyUsers = db.transaction((users) => {
      for (const row of users) {
        insertUser.run({
          id: row.ID,
          email: row.EMAIL,
          password_hash: row.PASSWORD_HASH,
          role: row.ROLE,
          is_active: row.IS_ACTIVE,
          created_at: row.CREATED_AT ? row.CREATED_AT.toISOString() : new Date().toISOString(),
          updated_at: row.UPDATED_AT ? row.UPDATED_AT.toISOString() : new Date().toISOString(),
          last_login_at: row.LAST_LOGIN_AT ? row.LAST_LOGIN_AT.toISOString() : null,
        });
      }
    });

    insertManyUsers(userResult.rows);
    console.log(`   Migrated ${userResult.rows.length} users.\n`);

  } finally {
    await oracleConn.close();
  }

  // Verify
  console.log("5. Verification...");
  const taskCount = db.prepare("SELECT COUNT(*) as count FROM tasks").get();
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  console.log(`   Tasks in SQLite: ${taskCount.count}`);
  console.log(`   Users in SQLite: ${userCount.count}`);

  console.log("\n=== Migration complete! ===");
  console.log("Now change DB_MODE=sqlite in .env and restart the backend.");
  process.exit(0);
}

function formatDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
