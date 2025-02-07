import { NextApiRequest, NextApiResponse } from "next";
import pool from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fid } = req.body;

    if (!fid) {
      return res.status(400).json({ error: "Missing FID" });
    }

    const result = await pool.query("SELECT fid FROM users WHERE fid = $1", [fid]);

    res.status(200).json({ isNewUser: result.rows.length === 0 });
  } catch (error) {
    console.error("[API] Error checking user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
