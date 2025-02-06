import { NextApiRequest, NextApiResponse } from "next";
import pool from "../../lib/db";
import axios from "axios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { fid, message } = req.body;
  console.log("[API] Sending notification to user:", { fid, message });

  // Validate required parameters
  if (!fid || !message) {
    console.error("[API] Missing required fields.");
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const client = await pool.connect();

    // Fetch user's notification details from the database
    const query = `SELECT notification_token, notification_url FROM users WHERE fid = $1`;
    const result = await client.query(query, [fid]);
    client.release();

    if (!result.rows.length) {
      console.error("[API] No user found with that FID.");
      return res.status(404).json({ error: "User not found" });
    }

    const { notification_token, notification_url } = result.rows[0];

    if (!notification_token || !notification_url) {
      console.error("[API] User has not enabled notifications.");
      return res.status(400).json({ error: "User has not enabled notifications." });
    }

    // Send notification request to Farcaster
    await axios.post(
      notification_url, // The endpoint provided by Farcaster for this user
      { message }, // Send the message
      { headers: { Authorization: `Bearer ${notification_token}` } } // Authenticate with token
    );

    console.log("[API] Notification sent successfully!");
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[API] Failed to send notification:", error);
    return res.status(500).json({ error: "Failed to send notification" });
  }
}
