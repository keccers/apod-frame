const { v4: uuidv4 } = require("uuid");
const pool = require("../lib/db");
const fetch = require("node-fetch");

const sendNotifications = async () => {
  try {
    console.log("[Notifications] 🚀 Fetching latest RSS entry...");
    const rssResult = await pool.query("SELECT * FROM latest_rss ORDER BY date DESC LIMIT 1");

    if (rssResult.rows.length === 0) {
      console.warn("[Notifications] ❌ No RSS entry found.");
      return;
    }

    const latestEntry = rssResult.rows[0];
    console.log("[Notifications] ✅ Latest RSS Entry:", latestEntry);

    console.log("[Notifications] 🔍 Fetching opted-in users...");
    const userResult = await pool.query(
      "SELECT notification_url, notification_token FROM users WHERE notification_token IS NOT NULL"
    );

    if (userResult.rows.length === 0) {
      console.warn("[Notifications] ❌ No opted-in users found.");
      return;
    }

    console.log(`[Notifications] ✅ Sending notifications to ${userResult.rows.length} users...`);

    const usersByUrl = {};
    userResult.rows.forEach(user => {
      if (!usersByUrl[user.notification_url]) {
        usersByUrl[user.notification_url] = [];
      }
      usersByUrl[user.notification_url].push(user.notification_token);
    });

    const batchSize = 100;
    for (const [url, tokens] of Object.entries(usersByUrl)) {
      console.log(`[Notifications] 📤 Sending notifications to ${tokens.length} users at ${url}...`);

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batchTokens = tokens.slice(i, i + batchSize);

        const notificationPayload = {
          notificationId: uuidv4(),
          title: latestEntry.title ? latestEntry.title.substring(0, 32) : "New Astronomy Photo!",
          body: "Click to view the latest Astronomy Picture of the Day!",
          targetUrl: "https://yourwebsite.com",
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
  } catch (error) {
    console.error("[Notifications] ❌ Error sending notifications:", error);
  }
};

sendNotifications();
