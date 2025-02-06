import { NextApiRequest, NextApiResponse } from "next";
import pool from "../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { fid, username } = req.body;
      
      if (!fid || typeof fid !== 'number') {
        console.error('Invalid FID:', fid);
        return res.status(400).json({ error: 'Invalid FID' });
      }

      const result = await pool.query(
        `INSERT INTO users (fid, username) 
         VALUES ($1, $2)
         ON CONFLICT (fid) DO UPDATE 
         SET username = EXCLUDED.username
         RETURNING *`,
        [fid, username]
      );

      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Failed to create/update user' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}