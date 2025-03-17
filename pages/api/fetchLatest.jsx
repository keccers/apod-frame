import { NextApiRequest, NextApiResponse } from "next";
import pool from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      console.log("[API] Fetching latest RSS entry from database...");

      const result = await pool.query("SELECT * FROM latest_rss ORDER BY date DESC LIMIT 1;");

      if (result.rows.length === 0) {
        console.warn("[API] No RSS data found in the database.");
        return res.status(404).json({ error: "No RSS data available" });
      }

      console.log("[API] Latest RSS entry retrieved:", result.rows[0]);
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("[API] Database error fetching RSS entry:", error);
      res.status(500).json({ error: "Failed to fetch RSS entry" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
