import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    console.log("[Notifications] 🚀 Fetching latest RSS entry...");
    const rssResult = await pool.query("SELECT * FROM latest_rss ORDER BY date DESC LIMIT 1");

    if (rssResult.rows.length === 0) {
      console.warn("[Notifications] ❌ No RSS entry found.");
      return res.status(404).json({ error: "No RSS entry available" });
    }

    const latestEntry = rssResult.rows[0];
    console.log("[Notifications] ✅ Latest RSS Entry:", latestEntry);

    console.log("[Notifications] 🔍 Fetching opted-in users...");
    const userResult = await pool.query(
      "SELECT notification_url, notification_token FROM users WHERE notification_token IS NOT NULL"
    );

    if (userResult.rows.length === 0) {
      console.warn("[Notifications] ❌ No opted-in users found.");
      return res.status(404).json({ error: "No opted-in users found" });
    }

    console.log(`[Notifications] ✅ Sending notifications to ${userResult.rows.length} users...`);

    const batchSize = 100;
    for (let i = 0; i < userResult.rows.length; i += batchSize) {
      const batch = userResult.rows.slice(i, i + batchSize);

      const tokens = batch.map(user => user.notification_token);
      const url = batch[0].notification_url; 

      const notificationPayload = {
        notificationId: uuidv4(),
        title: latestEntry.title.substring(0, 32),
        body: "Click to view the latest Astronomy Picture of the Day!",
        targetUrl: latestEntry.link,
        tokens,
      };

      console.log(`[Notifications] 📤 Sending batch ${i / batchSize + 1}...`, notificationPayload);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationPayload),
      });

      const result = await response.json();
      console.log("[Notifications] ✅ Response:", result);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Notifications] ❌ Error sending notifications:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}