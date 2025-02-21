import sharp from "sharp";
import axios from "axios";
import fs from "fs-extra";
import path from "path";

const TEST_IMAGE_URL = "https://apod.nasa.gov/apod/image/2502/HH30_Webb_960.jpg";
const TEST_TITLE = "HH 30: A Star System with Planets Now Forming";
const OUTPUT_DIR = "test_output";
const OUTPUT_FILENAME = "test_output.jpg";
const FONT_PATH = path.join(__dirname, "../styles/LibreCaslonDisplay-regular.ttf"); // Your Google Font

async function processImage(imageUrl: string, title: string, outputFilename: string) {
  try {
    console.log(`🔄 Downloading image from: ${imageUrl}`);

    // ✅ Fetch the image from URL
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const inputBuffer = Buffer.from(response.data);

    // ✅ Get image metadata
    const metadata = await sharp(inputBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("❌ Could not determine image dimensions.");
    }

    const width = metadata.width;
    const height = metadata.height;
    const newHeight = Math.round(width * (2 / 3)); // Ensure 3:2 aspect ratio
    const cropY = Math.round((metadata.height - newHeight) / 2); // Center cropping

    console.log(`📏 Cropping to 3:2 ratio -> Width: ${width}, Height: ${newHeight}`);

    // ✅ Generate Text Overlay with SVG
    console.log("🖋️ Creating text overlay with your Google Font...");
    const textSvg = `
      <svg width="${width}" height="100">
        <style>
          @font-face {
            font-family: 'Libre Caslon Display';
            src: url('${FONT_PATH}');
          }
          text {
            font-family: 'Libre Caslon Display';
            font-size: 48px;
            fill: white;
            text-anchor: middle;
          }
        </style>
        <text x="${width / 2}" y="60">${title}</text>
      </svg>
    `;

    // ✅ Convert SVG text to PNG buffer
    const textBuffer = await sharp(Buffer.from(textSvg))
      .png()
      .toBuffer();

    console.log("✅ Text overlay created successfully!");

    // ✅ Process image with sharp
    console.log("🛠️ Compositing text onto image...");
    const editedImage = await sharp(inputBuffer)
      .extract({ left: 0, top: cropY, width, height: newHeight }) // Crop center
      .composite([
        {
          input: textBuffer,
          gravity: "north", // Position text at the top
        },
      ])
      .jpeg({ quality: 90 }) // Save as JPEG with high quality
      .toBuffer();

    // ✅ Ensure output directory exists
    await fs.ensureDir(OUTPUT_DIR);

    // ✅ Save the processed image
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    await fs.writeFile(outputPath, editedImage);

    console.log(`✅ Processed image saved at: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error processing image:`, error);
  }
}

// 🚀 Run the test inside an async function
(async () => {
  console.log("🔍 Starting image processing test...");
  await processImage(TEST_IMAGE_URL, TEST_TITLE, OUTPUT_FILENAME);
  console.log("🏁 Image processing test completed!");
})();
