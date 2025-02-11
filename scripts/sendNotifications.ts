import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // ✅ Ensure the title is valid & truncated
    const notificationTitle = latestEntry.title
      ? latestEntry.title.substring(0, 32)
      : "New Astronomy Photo!";

    console.log(`[Notifications] 🔔 Notification Title: "${notificationTitle}"`);

    console.log("[Notifications] 🔍 Fetching opted-in users...");
    const userResult = await pool.query(
      "SELECT notification_url, notification_token FROM users WHERE notification_token IS NOT NULL"
    );

    if (userResult.rows.length === 0) {
      console.warn("[Notifications] ❌ No opted-in users found.");
      return res.status(404).json({ error: "No opted-in users found" });
    }

    console.log(`[Notifications] ✅ Found ${userResult.rows.length} users.`);

    // 🔥 Group users by notification URL
    const usersByUrl: Record<string, string[]> = {};
    userResult.rows.forEach(user => {
      if (!usersByUrl[user.notification_url]) {
        usersByUrl[user.notification_url] = [];
      }
      usersByUrl[user.notification_url].push(user.notification_token);
    });

    // 🔥 Send notifications in batches (Farcaster's limit = 100)
    const batchSize = 100;
    for (const [url, tokens] of Object.entries(usersByUrl)) {
      console.log(`[Notifications] 📤 Sending notifications to ${tokens.length} users at ${url}...`);

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batchTokens = tokens.slice(i, i + batchSize);

        const notificationPayload = {
          notificationId: uuidv4(), // Unique ID for deduplication
          title: notificationTitle, // ✅ Always uses the latest entry title
          body: "Click to view the latest Astronomy Picture of the Day!",
          targetUrl: "https://apod-frame.replit.app",
          tokens: batchTokens,
        };

        console.log(`[Notifications] 📤 Sending batch ${i / batchSize + 1}...`, notificationPayload);

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(notificationPayload),
          });

          const result = await response.json();
          console.log("[Notifications] ✅ Response:", result);

          // 🚀 Handle API response errors
          if (result.invalidTokens && result.invalidTokens.length > 0) {
            console.warn("[Notifications] ❌ Invalid Tokens Found:", result.invalidTokens);
            await pool.query("UPDATE users SET notification_token = NULL WHERE notification_token = ANY($1)", [
              result.invalidTokens,
            ]);
          }
        } catch (error) {
          console.error("[Notifications] ❌ Error sending batch:", error);
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Notifications] ❌ Error sending notifications:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
