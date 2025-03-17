```javascript
import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    console.log("[Test Notification] 🚀 Fetching latest RSS entry...");
    const rssResult = await pool.query("SELECT * FROM latest_rss ORDER BY date DESC LIMIT 1");

    if (rssResult.rows.length === 0) {
      console.warn("[Test Notification] ❌ No RSS entry found.");
      return res.status(404).json({ error: "No RSS entry available" });
    }

    const latestEntry = rssResult.rows[0];
    console.log("[Test Notification] ✅ Latest RSS Entry:", latestEntry);

    console.log("[Test Notification] 🔍 Fetching notification details for FID 4407...");
    const userResult = await pool.query(
      "SELECT notification_url, notification_token FROM users WHERE fid = $1 AND notification_token IS NOT NULL",
      [4407]
    );

    if (userResult.rows.length === 0) {
      console.warn("[Test Notification] ❌ No opted-in user found for FID 4407.");
      return res.status(404).json({ error: "No opted-in user found" });
    }

    const user = userResult.rows[0];

    const notificationPayload = {
      notificationId: uuidv4(), 
      title: latestEntry.title.substring(0, 32),
      body: "Test notification! Click to view today's Astronomy Picture of the Day.",
      targetUrl: "https://apod-frame.replit.app",
      tokens: [user.notification_token],
    };

    console.log("[Test Notification] 📤 Sending notification...", notificationPayload);

    const response = await fetch(user.notification_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();
    console.log("[Test Notification] ✅ Response:", result);

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("[Test Notification] ❌ Error sending test notification:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
```