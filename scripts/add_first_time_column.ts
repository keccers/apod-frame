import pool from "../lib/db";

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN first_time BOOLEAN DEFAULT TRUE;
    `);
    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();