import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";

const feedUrl = "https://apod.com/feed.rss"; // Replace with correct RSS URL
const parser = new XMLParser({ ignoreAttributes: false });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await axios.get(feedUrl);
    const feed = parser.parse(response.data);

    const latestEntry = feed.rss.channel.item[0];

    // Load content into Cheerio
    const $ = cheerio.load(latestEntry["content:encoded"] || "");

    let mediaUrl = "";

    // Check for embedded YouTube video
    const iframe = $("iframe[src*='youtube.com']");
    if (iframe.length > 0) {
      mediaUrl = iframe.attr("src") || ""; // Extract video URL
      iframe.remove(); // Remove the video from the content so it's not duplicated
    } else {
      // If no video, fall back to image
      mediaUrl = $("img").attr("src") || "";
      $("img").remove();
    }

    // Remove all links from the body
    $("a").each((_, el) => {
      $(el).replaceWith($(el).text());
    });

    // Replace <br> tags with spaces
    $("br").replaceWith(" ");

    // Normalize content
    const cleanedContent = $.html()
      .replace(/>\s+</g, "><") // Remove spaces between tags
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim();

    res.status(200).json({
      title: latestEntry.title,
      link: latestEntry.link,
      content: cleanedContent,
      date: latestEntry.pubDate,
      media: mediaUrl, // Video or image
    });
  } catch (error) {
    console.error("RSS Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch RSS feed" });
  }
}
