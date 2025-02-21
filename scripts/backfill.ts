import AWS from "aws-sdk";
import axios from "axios";
import * as cheerio from "cheerio";
import { parseStringPromise } from "xml2js";
import pool from "../lib/db"; // Ensure this points to your PostgreSQL connection

const FEED_URL = "https://apod.me/en.rss";
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL!;

// ✅ Initialize AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

// ✅ Fetch Full RSS Feed
async function fetchRSSFeed() {
  try {
    console.log("🔄 Fetching RSS feed...");
    const response = await axios.get(FEED_URL);
    const parsed = await parseStringPromise(response.data);
    const entries = parsed.rss.channel[0].item || [];

    // ✅ Reverse order so we process the OLDEST entry first
    return entries.reverse();
  } catch (error) {
    console.error("❌ Error fetching RSS feed:", error);
    return [];
  }
}

// ✅ Extract Image from RSS Content
function extractImageFromContent(content: string): string | null {
  if (!content) return null;
  const $ = cheerio.load(content);
  return $("img").first().attr("src") || null;
}

// ✅ Extract YouTube Thumbnail from RSS Content
function extractYouTubeThumbnail(content: string): string | null {
  if (!content) return null;
  const $ = cheerio.load(content);
  const iframeSrc = $("iframe").first().attr("src");
  if (iframeSrc && iframeSrc.includes("youtube.com")) {
    const videoIdMatch = iframeSrc.match(/embed\/([a-zA-Z0-9_-]+)/);
    return videoIdMatch ? `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg` : null;
  }
  return null;
}

// ✅ Clean Up Content & Format "Explanation:"
function cleanContent(content: string): string {
  if (!content) return "";

  const $ = cheerio.load(content);

  // Remove unwanted elements
  $("img, iframe, br").remove();

  // Allow only <b> and <a> tags, remove everything else
  $("*")
    .not("b, a")
    .each((_, el) => {
      $(el).replaceWith($(el).text());
    });

  // Convert to plain text while preserving links
  let cleanedText = $.html();
  cleanedText = cleanedText
    .replace(/\n+/g, " ") // Replace multiple newlines with space
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/\.(?=\S)/g, ". ") // Ensure proper spacing after periods
    .trim();

  // ✅ Ensure the first word is "<b>Explanation:</b>" if it exists
  if (cleanedText.startsWith("Explanation:")) {
    cleanedText = cleanedText.replace(/^Explanation:/, "<b>Explanation:</b>");
  }

  return cleanedText;
}

// ✅ Upload Image to S3
async function uploadImageToS3(imageUrl: string, filename: string) {
  try {
    console.log(`📤 Uploading ${filename} to S3...`);
    const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });

    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: `rss-images/${filename}`,
      Body: imageResponse.data,
      ContentType: "image/jpeg",
    };

    await s3.upload(uploadParams).promise();
    return `${CLOUDFRONT_URL}rss-images/${filename}`;
  } catch (error) {
    console.error(`❌ Error uploading ${filename} to S3:`, error);
    return null;
  }
}

// ✅ Process & Backfill RSS Entries (OLDEST to NEWEST)
async function processEntries() {
  try {
    console.log("🔍 Fetching RSS feed...");
    const entries = await fetchRSSFeed();

    for (const entry of entries) {
      const title = entry.title[0];
      const link = entry.link[0];
      const content = entry["content:encoded"] ? entry["content:encoded"][0] : "";
      const cleanedContent = cleanContent(content);
      const media = extractYouTubeThumbnail(content) || extractImageFromContent(content);
      const rawDate = entry.pubDate ? new Date(entry.pubDate) : new Date();
      const formattedDate = rawDate.toISOString().split("T")[0];

      console.log(`🔄 Processing: ${title}`);

      // ✅ Check if entry exists in DB
      const existingEntry = await pool.query("SELECT title FROM latest_rss WHERE title = $1", [
        title,
      ]);

      if (existingEntry.rows.length > 0) {
        console.log(`✅ Skipping ${title} (Already exists)`);
        continue;
      }

      if (!media) {
        console.warn(`⚠️ No valid image found for ${title}, skipping upload.`);
      }

      // ✅ Upload Image if Found
      let s3Url = "";
      if (media) {
        const filename = `${title.replace(/\s+/g, "-").toLowerCase()}.jpg`;
        s3Url = await uploadImageToS3(media, filename);
      }

      // ✅ Insert Entry into Database
      await pool.query(
        `INSERT INTO latest_rss (title, link, content, date, media, share_image)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [title, link, cleanedContent, formattedDate, media, s3Url]
      );

      console.log(`✅ Inserted ${title} into the database!`);
    }
  } catch (error) {
    console.error("❌ Error processing RSS entries:", error);
  }
}

// 🚀 Run Full Backfill
(async () => {
  console.log("🚀 Starting full RSS feed backfill (Oldest → Newest)...");
  await processEntries();
  console.log("🏁 Backfill completed!");
  process.exit(0);
})();
