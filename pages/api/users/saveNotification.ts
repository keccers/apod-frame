import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fid, notificationUrl, notificationToken } = req.body;

    console.log("[API] 🔄 Received request to save notifications:", req.body);

    if (!fid || !notificationUrl || !notificationToken) {
      console.error("[API] ❌ Missing required fields:", { fid, notificationUrl, notificationToken });
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Update the user's record with notification details
    const result = await pool.query(
      `UPDATE users 
       SET notification_url = $1, notification_token = $2 
       WHERE fid = $3 
       RETURNING *`,
      [notificationUrl, notificationToken, fid]
    );

    if (result.rowCount === 0) {
      console.error("[API] ❌ No user found to update!");
      return res.status(404).json({ error: "User not found" });
    }

    console.log("[API] ✅ Notification details successfully saved:", result.rows[0]);
    res.status(200).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error("[API] ❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
