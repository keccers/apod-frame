```javascript
import { NextApiRequest, NextApiResponse } from "next";
import pool from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { fid, username, notificationToken, notificationUrl } = req.body;

      if (!fid || typeof fid !== "number") {
        console.error("Invalid FID:", fid);
        return res.status(400).json({ error: "Invalid FID" });
      }

      const result = await pool.query(
        `INSERT INTO users (fid, username, notification_token, notification_url) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (fid) DO UPDATE 
         SET username = EXCLUDED.username,
             notification_token = COALESCE(EXCLUDED.notification_token, users.notification_token),
             notification_url = COALESCE(EXCLUDED.notification_url, users.notification_url)
         RETURNING *`,
        [fid, username, notificationToken || null, notificationUrl || null]
      );

      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to create/update user" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
```
