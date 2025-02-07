import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db"; // Ensure correct database import

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("[Webhook] 🚀 Received Webhook Event:", req.body);

    if (!req.body || !req.body.header || !req.body.payload) {
      console.error("[Webhook] ❌ Missing required fields in request body:", req.body);
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔍 Decode and parse the header to extract FID
    const decodedHeader = JSON.parse(Buffer.from(req.body.header, "base64").toString("utf8"));
    const fid = decodedHeader?.fid;

    if (!fid) {
      console.error("[Webhook] ❌ Failed to extract FID:", decodedHeader);
      return res.status(400).json({ error: "Missing or invalid FID" });
    }

    // 🔍 Decode and parse the payload
    const decodedPayload = JSON.parse(Buffer.from(req.body.payload, "base64").toString("utf8"));

    if (!decodedPayload.notificationDetails) {
      console.error("[Webhook] ❌ Missing notificationDetails in payload:", decodedPayload);
      return res.status(400).json({ error: "Missing notification details" });
    }

    const { url, token } = decodedPayload.notificationDetails;
    if (!url || !token) {
      console.error("[Webhook] ❌ Invalid notification details:", decodedPayload.notificationDetails);
      return res.status(400).json({ error: "Invalid notification details" });
    }

    console.log(`[Webhook] ✅ Saving notification details for FID: ${fid}`);

    // 🚀 Save notification details to the database
    const result = await pool.query(
      `UPDATE users SET notification_url = $1, notification_token = $2 WHERE fid = $3 RETURNING *`,
      [url, token, fid]
    );

    if (result.rowCount === 0) {
      console.error(`[Webhook] ❌ Failed to update user notifications for FID: ${fid}`);
      return res.status(400).json({ error: "Failed to update user notifications" });
    }

    console.log(`[Webhook] ✅ Successfully saved notification details for FID: ${fid}`);
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("[Webhook] ❌ Error handling event:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
