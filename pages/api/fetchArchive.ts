// pages/api/fetchArchive.ts

import { NextApiRequest, NextApiResponse } from "next";
import pool from "../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "12", 10);
  const offset = (page - 1) * limit;

  try {
    const totalResult = await pool.query("SELECT COUNT(*) FROM latest_rss");
    const totalEntries = parseInt(totalResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalEntries / limit);

    const result = await pool.query(
      "SELECT id, title, share_image FROM latest_rss ORDER BY date DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    res.status(200).json({
      entries: result.rows,
      totalPages,
    });
  } catch (error) {
    console.error("❌ Error fetching archive:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
