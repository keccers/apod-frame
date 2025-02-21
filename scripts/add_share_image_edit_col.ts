import pool from "../lib/db";

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE latest_rss 
      ADD COLUMN share_image_edit TEXT NULL;
    `);
    console.log("Migration completed successfully: Added 'share_image' column to latest_rss");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
