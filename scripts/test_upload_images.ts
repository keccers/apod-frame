import AWS from "aws-sdk";
import axios from "axios";
import * as cheerio from "cheerio";
import { parseStringPromise } from "xml2js";
import pool from "../lib/db"; // Ensure this points to your PostgreSQL connection

const FEED_URL = "https://apod.me/en.rss";
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL!;

// Initialize AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

// ✅ Fetch RSS Feed
async function fetchRSSFeed() {
  try {
    const response = await axios.get(FEED_URL);
    const parsed = await parseStringPromise(response.data);
    return parsed.rss.channel[0].item || []; // Ensure entries are returned
  } catch (error) {
    console.error("❌ Error parsing XML:", error);
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

// ✅ Upload Image to S3
async function uploadImageToS3(imageUrl: string, filename: string) {
  try {
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

// ✅ Process Each RSS Entry
async function processEntries() {
  try {
    const entries = await fetchRSSFeed();

    for (const entry of entries) {
      const title = entry.title[0];
      console.log(`🔄 Processing: ${title}`);

      // Check if the entry already has an image in the database
      const existingEntry = await pool.query(
        "SELECT title, share_image FROM latest_rss WHERE title = $1",
        [title]
      );

      if (existingEntry.rows.length > 0 && existingEntry.rows[0].share_image) {
        console.log(`✅ Skipping ${title} (Already has an image)`);
        continue;
      }

      // Extract media (YouTube thumbnail or first image)
      const content = entry["content:encoded"] ? entry["content:encoded"][0] : "";
      let imageUrl = extractYouTubeThumbnail(content) || extractImageFromContent(content);

      if (!imageUrl) {
        console.warn(`⚠️ No valid image found for ${title}`);
        continue;
      }

      // Upload image to S3
      const filename = `${title.replace(/\s+/g, "-").toLowerCase()}.jpg`;
      const s3Url = await uploadImageToS3(imageUrl, filename);

      if (!s3Url) {
        console.error(`❌ Failed to upload image for ${title}`);
        continue;
      }

      // ✅ Update Database with the new image URL
      await pool.query(
        "UPDATE latest_rss SET share_image = $1 WHERE title = $2",
        [s3Url, title]
      );

      console.log(`✅ Updated ${title} with new image: ${s3Url}`);
    }
  } catch (error) {
    console.error("❌ Error processing RSS entries:", error);
  }
}

// 🚀 Run the script
processEntries().then(() => {
  console.log("✅ Backfill complete!");
  process.exit(0);
});
