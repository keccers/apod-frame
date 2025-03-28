import pool from "../../lib/db";

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing id parameter" });
  }

  try {
    const result = await pool.query("SELECT * FROM latest_rss WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
