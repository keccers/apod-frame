import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fid } = req.body;
  if (!fid) {
    return res.status(400).json({ error: "FID is required" });
  }

  try {
    console.log("[Debug] Setting first_time to FALSE for user:", fid);

    const result = await pool.query(
      `UPDATE users SET first_time = FALSE WHERE fid = $1 RETURNING *`,
      [fid]
    );

    if (result.rowCount === 0) {
      console.warn("[Debug] No user found with FID:", fid);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("[Debug] Successfully updated first_time for FID:", fid);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error("[Debug] Database update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
