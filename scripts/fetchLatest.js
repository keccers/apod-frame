const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const cheerio = require("cheerio");
const pool = require("../lib/db"); // Adjust path if needed

const FEED_URL = "https://apod.me/en.rss";
const parser = new XMLParser({ ignoreAttributes: false });

const fetchAndStoreLatestEntry = async () => {
  try {
    const response = await axios.get(FEED_URL);
    const feed = parser.parse(response.data);
    const latestEntry = feed.rss.channel.item[0];

    if (!latestEntry) return;

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

    await pool.query(
      `INSERT INTO latest_rss (title, link, content, date, media)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (link) DO NOTHING`,
      [latestEntry.title, latestEntry.link, cleanedBody, formattedDate, media]
    );
  } catch (error) {
    console.error("Error fetching latest RSS entry:", error);
  }
};

fetchAndStoreLatestEntry();
