const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const cheerio = require("cheerio");
const pool = require("../lib/db"); // Adjust path if needed

console.log("[RSS] 🔍 Starting fetchLatest script...");

(async () => {
  try {
    console.log("[RSS] 🚀 Testing DB connection...");
    const testResult = await pool.query("SELECT NOW()");
    console.log("[RSS] ✅ DB Connection Successful:", testResult.rows[0]);

    console.log("[RSS] 🔍 Fetching latest RSS entry...");
    const rssResult = await pool.query("SELECT * FROM latest_rss ORDER BY date DESC LIMIT 1");

    if (rssResult.rows.length === 0) {
      console.warn("[RSS] ❌ No RSS entry found.");
      return;
    }

    console.log("[RSS] ✅ Latest RSS Entry:", rssResult.rows[0]);
  } catch (error) {
    console.error("[RSS] ❌ Error fetching latest entry:", error);
  }
})();

const FEED_URL = "https://apod.me/en.rss";
const parser = new XMLParser({ ignoreAttributes: false });

const fetchAndStoreLatestEntry = async () => {
  try {
    console.log("[RSS] Fetching latest RSS entry...");

    const response = await axios.get(FEED_URL);
    const feed = parser.parse(response.data);
    const latestEntry = feed.rss.channel.item[0];

    if (!latestEntry) {
      console.warn("[RSS] No RSS entry found.");
      return;
    }

    // Extract media
    const $ = cheerio.load(latestEntry["content:encoded"] || "");

    const imgSrc = $("img").first().attr("src") || "";
    const videoSrc = $("iframe").first().attr("src") || "";
    const media = videoSrc ? videoSrc : imgSrc;

    $("a").each((_, el) => $(el).replaceWith($(el).text()));
    $("img").remove();
    $("iframe").remove();
    $("br").remove();

    const cleanedBody = $("<div>")
      .append($("body").contents())
      .html()
      ?.replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\.(?=\S)/g, ". ")
      .trim() || "";

    const rawDate = latestEntry.pubDate ? new Date(latestEntry.pubDate) : new Date();
    const formattedDate = rawDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    console.log("[DEBUG] Extracted Data:", {
      title: latestEntry.title,
      link: latestEntry.link,
      date: formattedDate,
      media,
      content: cleanedBody,
    });

    const result = await pool.query(
      `INSERT INTO latest_rss (title, link, content, date, media)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (link) DO NOTHING
       RETURNING *`,
      [
        latestEntry.title,
        latestEntry.link,
        cleanedBody,
        formattedDate,
        media,
      ]
    );

    if (result.rows.length > 0) {
      console.log("[RSS] New post detected and saved:", latestEntry.title);
    } else {
      console.log("[RSS] No new post detected (duplicate or error).");
    }
  } catch (error) {
    console.error("[RSS] Error fetching latest entry:", error);
  }
};

fetchAndStoreLatestEntry();
