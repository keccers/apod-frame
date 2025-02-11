const { Pool } = require("pg");

// Log environment variables (but mask sensitive info)
console.log("[DB] 🚀 Initializing database connection...");
console.log("[DB] DATABASE_URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Missing");
console.log("[DB] PGDATABASE:", process.env.PGDATABASE || "❌ Missing");
console.log("[DB] PGHOST:", process.env.PGHOST || "❌ Missing");
console.log("[DB] PGPORT:", process.env.PGPORT || "❌ Missing");
console.log("[DB] PGUSER:", process.env.PGUSER || "❌ Missing");
console.log("[DB] PGPASSWORD:", process.env.PGPASSWORD ? "✅ Set" : "❌ Missing");

// Configure connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? true : false, // Ensures SSL is enabled
});

module.exports = pool;
