const puppeteer = require("puppeteer");
const pool = require("../lib/db");
const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");

// ✅ AWS S3 Setup
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

// ✅ Function to sanitize the filename (Removes Apostrophes & Special Characters)
function sanitizeFilename(title) {
  return title
    .replace(/[^a-zA-Z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .toLowerCase();
}

// ✅ Upload Image to S3
async function uploadImageToS3(filePath, filename) {
  try {
    const fileStream = fs.createReadStream(filePath);
    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: `share_images/${filename}`,
      Body: fileStream,
      ContentType: "image/png",
    };

    const result = await s3.upload(uploadParams).promise();
    return `${CLOUDFRONT_URL}share_images/${filename}`;
  } catch (error) {
    console.error(`❌ Error uploading ${filename} to S3:`, error);
    return null;
  }
}

// ✅ Puppeteer Script
async function generateShareImage() {
  try {
    console.log("🟢 Starting Puppeteer to capture /share page...");

    // ✅ Fetch latest entry from DB
    console.log("📡 Fetching latest share_image from DB...");
    const result = await pool.query(
      "SELECT share_image, title FROM latest_rss ORDER BY date DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      console.warn("⚠️ No image found in database.");
      return;
    }

    const { share_image: imageUrl, title } = result.rows[0];
    if (!imageUrl) {
      console.error("❌ Image URL is missing!");
      return;
    }

    console.log(`🔍 Using Image URL: ${imageUrl}`);
    console.log(`🖋️ Title: ${title}`);

    // ✅ Sanitize filename
    const safeFilename = sanitizeFilename(title) + ".png";
    console.log(`✅ Sanitized Filename: ${safeFilename}`);

    // ✅ Launch Puppeteer with system-installed Chromium
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: puppeteer.executablePath(), // Auto-detect system-installed Chromium
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    const sharePageUrl = `https://apod-frame.replit.app/share`; // Update to your deployed share page
    await page.goto(sharePageUrl, { waitUntil: "networkidle2" });

    // ✅ Capture screenshot
    const screenshotPath = path.join(__dirname, "../public", safeFilename);
    await page.screenshot({ path: screenshotPath, type: "png" });

    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    await browser.close();

    // ✅ Upload to S3
    console.log("📤 Uploading image to S3...");
    const s3Url = await uploadImageToS3(screenshotPath, safeFilename);

    if (!s3Url) {
      console.error("❌ Failed to upload image to S3.");
      return;
    }

    console.log(`✅ Image uploaded: ${s3Url}`);

    // ✅ Update Database
    console.log("📡 Saving new share_image_edit URL to database...");
    await pool.query("UPDATE latest_rss SET share_image_edit = $1 WHERE title = $2", [s3Url, title]);

    console.log("✅ Database updated with new share image!");

    // ✅ Cleanup local file
    fs.unlinkSync(screenshotPath);
    console.log(`🗑️ Deleted local screenshot: ${screenshotPath}`);
  } catch (error) {
    console.error("❌ Error generating share image:", error);
  }
}

// ✅ Run the function
generateShareImage();
