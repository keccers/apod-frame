import { ImageResponse } from "next/og";
import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export const config = {
  api: {
    responseLimit: false,
  },
};

async function loadGoogleFont() {
  const API = `https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&display=swap`;

  const css = await fetch(API).then((res) => res.text());

  const fontUrl = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/,
  )?.[1];

  if (!fontUrl) {
    throw new Error("Failed to load font");
  }

  return fetch(fontUrl).then((res) => res.arrayBuffer());
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    console.log("🟢 Starting Image Generation API...");

    // Load the font
    console.log("📦 Loading font...");
    const font = await loadGoogleFont();

    // Fetch the latest share_image from DB
    const result = await pool.query(
      "SELECT share_image, title FROM latest_rss ORDER BY date DESC LIMIT 1",
    );

    if (result.rows.length === 0) {
      console.error("❌ No image found in database.");
      return res.status(404).json({ error: "No image found" });
    }

    const { share_image: imageUrl, title } = result.rows[0];
    console.log(`🔍 Using Image URL: ${imageUrl}`);
    console.log(`🖋️ Title: ${title}`);

    if (!imageUrl) {
      console.error("❌ Image URL is missing!");
      return res.status(400).json({ error: "No valid image URL found" });
    }

    // First, try to validate the image URL exists
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to load image: ${imageResponse.statusText}`);
      }
    } catch (error) {
      console.error("❌ Failed to validate image URL:", error);
      return res.status(400).json({ error: "Invalid image URL" });
    }

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            backgroundColor: "black",
            position: "relative",
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "50%",
              transform: "translateX(-50%)",
              maxWidth: "80%",
              display: "flex",
              flexDirection: "column",
              padding: "20px",
              borderRadius: "8px",
              height: "20%",
            }}
          >
            <span
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                color: "white",
                fontSize: "48px",
                fontFamily: "Libre Caslon Display",
                fontWeight: "400",
                textAlign: "center",
                lineHeight: "1.4",
                margin: "auto",
              }}
            >
              {title}
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 800,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
        fonts: [
          {
            name: "Libre Caslon Display",
            data: font,
            style: "normal",
            weight: 400,
          },
        ],
      },
    );

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();

    // Set headers
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Length", Buffer.byteLength(imageBuffer));

    // Send the response
    res.status(200).send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error("❌ Error generating image:", error);
    res.status(500).json({ error: `Error processing image: ${error.message}` });
  }
}
