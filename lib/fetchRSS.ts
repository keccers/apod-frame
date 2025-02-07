import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import pool from "./db";

const FEED_URL = "https://apod.me/en.rss";
const parser = new XMLParser({ ignoreAttributes: false });

export const fetchAndStoreLatestEntry = async () => {
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
    const imgSrc = $("img").attr("src") || "";
    const videoSrc = $("iframe").attr("src") || "";
    const media = videoSrc ? videoSrc : imgSrc;

    // Remove unnecessary tags while preserving meaningful content
    $("a").replaceWith(function() { return $(this).text(); }); // Replace links with text
    $("img").remove(); // Remove images
    $("iframe").remove(); // Remove iframes
    $("br").remove(); // Remove all <br> tags

    const cleanedBody = $("body")
    .html() // Ensure we're calling `.html()` safely
    ?.toString() // Convert to string explicitly
    .replace(/\n+/g, " ") // Remove extra newlines
    .replace(/\s+/g, " ") // Remove excess spaces
    .replace(/\.(?=\S)/g, ". ") // Ensure proper spacing after periods
    .trim() || "";


    // Format the date
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

    // Insert into PostgreSQL
    const result = await pool.query(
      `INSERT INTO latest_rss (title, link, content, date, media)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (link) DO NOTHING
       RETURNING *`,
      [
        latestEntry.title,
        latestEntry.link,
        cleanedBody, // Save cleaned content
        formattedDate, // Store formatted date
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