const AWS = require("aws-sdk");
const axios = require("axios");
const cheerio = require("cheerio");
const { XMLParser } = require("fast-xml-parser");
const { parseStringPromise } = require("xml2js");
const pool = require("../lib/db"); // Ensure this points to your PostgreSQL connection

// ✅ Log Environment Variables Before Using
console.log("🔍 DEBUG: Checking environment variables...");
console.log("✅ AWS_REGION:", process.env.AWS_REGION);
console.log("✅ S3_BUCKET_NAME:", process.env.S3_BUCKET_NAME);
console.log("✅ CLOUDFRONT_URL:", process.env.CLOUDFRONT_URL);
console.log("✅ AWS_ACCESS_KEY_ID Set:", !!process.env.AWS_ACCESS_KEY_ID);
console.log("✅ AWS_SECRET_ACCESS_KEY Set:", !!process.env.AWS_SECRET_ACCESS_KEY);

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

const FEED_URL = "https://apod.me/en.rss";
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

// ✅ Initialize AWS S3
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
    return parsed.rss.channel[0].item || [];
  } catch (error) {
    console.error("❌ Error parsing XML:", error);
    return [];
  }
}

// ✅ Extract Image from RSS Content
function extractImageFromContent(content) {
  if (!content) return null;
  const $ = cheerio.load(content);
  return $("img").first().attr("src") || null;
}

// ✅ Extract YouTube Thumbnail from RSS Content
function extractYouTubeThumbnail(content) {
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
async function uploadImageToS3(imageUrl, filename) {
  try {
    console.log(`🔄 Downloading image: ${imageUrl}`);
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

// ✅ Fetch and Store Latest RSS Entry
async function fetchAndStoreLatestEntry() {
  try {
    console.log("🔍 Checking for latest stored entry in DB...");
    const dbResult = await pool.query(
      "SELECT link FROM latest_rss ORDER BY date DESC LIMIT 1"
    );

    const latestStoredEntry = dbResult.rows.length > 0 ? dbResult.rows[0].link : null;

    console.log("🔍 Fetching RSS feed...");
    const entries = await fetchRSSFeed();
    if (!entries.length) {
      console.log("⚠️ No new entries found in RSS feed.");
      return;
    }

    const latestEntry = entries[0]; // Get the latest entry from the RSS feed
    if (!latestEntry) return;

    // ✅ Compare with the most recent stored entry
    if (latestEntry.link === latestStoredEntry) {
      console.log("[RSS] No new entry found. Exiting...");
      return;
    }

    console.log(`🆕 New entry found: ${latestEntry.title[0]}`);

    // ✅ Extract media (YouTube thumbnail or first image)
    const content = latestEntry["content:encoded"] ? latestEntry["content:encoded"][0] : "";
    let imageUrl = extractYouTubeThumbnail(content) || extractImageFromContent(content);

    if (!imageUrl) {
      console.warn(`⚠️ No valid image found for ${latestEntry.title[0]}`);
    }

    let s3Url = null;
    if (imageUrl) {
      // ✅ Upload image to S3
      const filename = `${latestEntry.title[0].replace(/\s+/g, "-").toLowerCase()}.jpg`;
      s3Url = await uploadImageToS3(imageUrl, filename);
    }

    // ✅ Clean content text
    const $ = cheerio.load(content);
    $("a").each((_, el) => $(el).replaceWith($(el).text()));
    $("img").remove();
    $("iframe").remove();
    $("br").remove();

    let cleanedBody = $("<div>").append($("body").contents()).html();
    cleanedBody = cleanedBody
      ?.replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\.(?=\S)/g, ". ")
      .trim() || "";

    // ✅ Add `<b>` tags around "Explanation:"
    cleanedBody = cleanedBody.replace(/^Explanation:/, "<b>Explanation:</b>");

    // ✅ Format Date
    const rawDate = latestEntry.pubDate ? new Date(latestEntry.pubDate) : new Date();
    const formattedDate = rawDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // ✅ Insert new entry into the database
    console.log("💾 Saving new entry to database...");
    const insertResult = await pool.query(
      `INSERT INTO latest_rss (title, link, content, date, media, share_image)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (link) DO NOTHING
       RETURNING *`,
      [latestEntry.title[0], latestEntry.link[0], cleanedBody, formattedDate, latestEntry.link[0], s3Url]
    );

    if (insertResult.rows.length > 0) {
      console.log(`✅ New post saved: ${latestEntry.title[0]}`);
    } else {
      console.log("⚠️ No new post saved (duplicate or error).");
    }
  } catch (error) {
    console.error("❌ Error fetching latest RSS entry:", error);
  }
}

// 🚀 Run the script
fetchAndStoreLatestEntry().then(() => {
  console.log("✅ Fetch latest entry completed!");
  process.exit(0);
});
