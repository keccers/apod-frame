const { v4: uuidv4 } = require("uuid");
const pool = require("../lib/db");
const fetch = require("node-fetch");

const sendTestNotification = async () => {
  try {
    console.log("[Test Notification] 🚀 Fetching latest RSS entry...");
    const rssResult = await pool.query("SELECT * FROM latest_rss ORDER BY date DESC LIMIT 1");

    if (rssResult.rows.length === 0) {
      console.warn("[Test Notification] ❌ No RSS entry found.");
      return;
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
      return;
    }

    const user = userResult.rows[0];

    const notificationPayload = {
      notificationId: uuidv4(),
      title: latestEntry.title.substring(0, 32), // Max 32 characters
      body: "Test notification! Click to view today's Astronomy Picture of the Day.",
      targetUrl: "https://apod-frame.replit.app",
      tokens: [user.notification_token], // Send only to you
    };

    console.log("[Test Notification] 📤 Sending notification...", notificationPayload);

    const response = await fetch(user.notification_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();
    console.log("[Test Notification] ✅ Response:", result);
  } catch (error) {
    console.error("[Test Notification] ❌ Error sending test notification:", error);
  }
};

// ✅ Allow running via `node scripts/testNotification.js`
if (require.main === module) {
  sendTestNotification();
}

// ✅ Allow importing if needed
module.exports = sendTestNotification;
