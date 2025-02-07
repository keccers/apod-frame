import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fid, notificationUrl, notificationToken } = req.body;

    if (!fid || !notificationUrl || !notificationToken) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await pool.query(
      `UPDATE users 
       SET notification_url = $1, notification_token = $2 
       WHERE fid = $3`,
      [notificationUrl, notificationToken, fid]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[API] Error saving notification details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
