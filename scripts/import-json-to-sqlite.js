/**
 * JSON → SQLite Seeding / Import Script
 * 
 * Run on the VM with:
 *   node scripts/import-json-to-sqlite.js
 * 
 * This will:
 *   1. Read the backup tasks from data/tasks.json
 *   2. Insert them into the local SQLite database at data/nconnect.db
 *   3. Create a default admin user if the users table is empty so you can log in / bypass
 */

const path = require("path");
const fs = require("fs");

console.log("=== JSON → SQLite Backup Seeding ===\n");

// Force-load .env
process.env.DB_MODE = "sqlite";
require("../config");

const { initSqlite, getDb } = require("../storage/sqlite-db");

// Initialize SQLite
console.log("1. Initializing SQLite database...");
initSqlite();
const db = getDb();
console.log("   SQLite ready.\n");

// Read tasks.json
const tasksJsonPath = path.join(__dirname, "..", "data", "tasks.json");
if (!fs.existsSync(tasksJsonPath)) {
  console.error(`Error: Backup file tasks.json not found at ${tasksJsonPath}`);
  process.exit(1);
}

const tasks = JSON.parse(fs.readFileSync(tasksJsonPath, "utf8"));
console.log(`2. Found ${tasks.length} tasks in data/tasks.json.`);

// Insert tasks
console.log("3. Seeding tasks...");
const insertTask = db.prepare(`
  INSERT OR REPLACE INTO tasks (id, platform, module_name, owners, priority, category_type,
                                 status, percent_completed, start_date, completed_date,
                                 description, technical_team, comments, created_at, updated_at)
  VALUES (@id, @platform, @module_name, @owners, @priority, @category_type,
          @status, @percent_completed, @start_date, @completed_date,
          @description, @technical_team, @comments, @created_at, @updated_at)
`);

const insertManyTasks = db.transaction((tasksList) => {
  for (const t of tasksList) {
    insertTask.run({
      id: t.id,
      platform: t.platform,
      module_name: t.moduleName,
      owners: t.owners,
      priority: t.priority,
      category_type: t.categoryType || null,
      status: t.status,
      percent_completed: t.percentCompleted || 0,
      start_date: t.startDate && t.startDate !== "-" ? t.startDate : null,
      completed_date: t.completedDate && t.completedDate !== "-" ? t.completedDate : null,
      description: t.description || null,
      technical_team: t.technicalTeam,
      comments: t.comments || null,
      created_at: t.createdAt || new Date().toISOString(),
      updated_at: t.updatedAt || new Date().toISOString(),
    });
  }
});

insertManyTasks(tasks);
console.log(`   Successfully seeded ${tasks.length} tasks into SQLite.\n`);

// Verify & Seed Default Admin User
console.log("4. Seeding default admin user...");
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();

if (userCount.count === 0) {
  // Seed the admin user: ramji.sricharan@narayanagroup.com
  // Using a pre-hashed password for: Gtet@12345678 (matching production .env DB_PASSWORD)
  const defaultAdmin = {
    id: "user-admin-default",
    email: "ramji.sricharan@narayanagroup.com",
    password_hash: "$2b$10$7RUp91GjS5N5D6z.2r2vUuS/RzP5F8L0G/gH7QW7N1FhQ3Kx2L1P6", // Pre-hashed password
    role: "ADMIN",
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
    VALUES (@id, @email, @password_hash, @role, @is_active, @created_at, @updated_at)
  `).run(defaultAdmin);

  console.log("   Successfully seeded default admin user (ramji.sricharan@narayanagroup.com).\n");
} else {
  console.log(`   Found ${userCount.count} existing users. Skipping default user seed.\n`);
}

// Verification
const finalTaskCount = db.prepare("SELECT COUNT(*) as count FROM tasks").get();
const finalUserCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
console.log("=== Seeding Verification ===");
console.log(`Tasks in SQLite database: ${finalTaskCount.count}`);
console.log(`Users in SQLite database: ${finalUserCount.count}`);
console.log("\nSeeding complete! You are ready to run the server in DB_MODE=sqlite.");
process.exit(0);
