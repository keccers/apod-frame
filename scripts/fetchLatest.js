const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const cheerio = require("cheerio");
const pool = require("../lib/db"); // Adjust path if needed

const FEED_URL = "https://apod.me/en.rss";
const parser = new XMLParser({ ignoreAttributes: false });

const fetchAndStoreLatestEntry = async () => {
  try {
    // ✅ Step 1: Fetch the latest stored entry from the database
    const dbResult = await pool.query(
      "SELECT link FROM latest_rss ORDER BY date DESC LIMIT 1"
    );

    const latestStoredEntry = dbResult.rows.length > 0 ? dbResult.rows[0].link : null;

    // ✅ Step 2: Fetch the latest entry from the RSS feed
    const response = await axios.get(FEED_URL);
    const feed = parser.parse(response.data);
    const latestEntry = feed.rss.channel.item[0];

    if (!latestEntry) return;

    // ✅ Step 3: Compare with the most recent stored entry
    if (latestEntry.link === latestStoredEntry) {
      console.log("[RSS] No new entry found. Exiting...");
      return; // Stop execution if it's the same entry
    }

    // ✅ Step 4: Extract media and clean content
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

    // ✅ Step 5: Insert only if it's a new entry
    const insertResult = await pool.query(
      `INSERT INTO latest_rss (title, link, content, date, media)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (link) DO NOTHING
       RETURNING *`,
      [latestEntry.title, latestEntry.link, cleanedBody, formattedDate, media]
    );

    if (insertResult.rows.length > 0) {
      console.log("[RSS] New post detected and saved:", latestEntry.title);
    } else {
      console.log("[RSS] No new post detected (duplicate or error).");
    }
  } catch (error) {
    console.error("Error fetching latest RSS entry:", error);
  }
};

// Run the function
fetchAndStoreLatestEntry();
