import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db"; // Ensure your DB connection is correct

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    console.log("[Webhook] Received Event:", req.body);

    const { fid, event, notificationUrl, notificationToken } = req.body;

    if (!fid || !event) {
      console.warn("[Webhook] Missing required fields:", req.body);
      return res.status(400).json({ error: "Missing required fields" });
    }

    // If the event is a user adding the frame and enabling notifications
    if (event === "frame_added" && notificationUrl && notificationToken) {
      console.log(`[Webhook] Saving Notification Token for FID: ${fid}`);

      await pool.query(
        `UPDATE users 
         SET notification_url = $1, notification_token = $2 
         WHERE fid = $3`,
        [notificationUrl, notificationToken, fid]
      );

      console.log(`[Webhook] Notification token saved for FID: ${fid}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Webhook] Error handling event:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
