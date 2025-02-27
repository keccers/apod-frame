const BASE_URL = "https://apod-frame.replit.app"; // ✅ Your deployed domain
const DEFAULT_IMAGE = `${BASE_URL}/apod-image.png`; // ✅ Ensure absolute fallback

export interface Entry {
  id: string;
  title: string;
  link: string;
  content: string;
  date: string;
  media: string;
  share_image?: string;
  share_image_edit?: string | null;
}

/**
 * ✅ Generates a stable Frame Metadata JSON
 */
export function generateFrameMetadata(entry: Entry | null): string {
  // Use the latest edited share image (if available), else fallback
  const imageUrl = entry?.share_image_edit || entry?.share_image || DEFAULT_IMAGE;

  const frameEmbed = {
    version: "next",
    imageUrl,
    button: {
      title: "Discover the cosmos",
      action: {
        type: "launch_frame",
        name: "APOD",
        url: BASE_URL,
        splashImageUrl: `${BASE_URL}/apod-icon.png`,
        splashBackgroundColor: "#301885",
      },
    },
  };

  console.log("🟢 Generated Frame Metadata:", frameEmbed);

  return JSON.stringify(frameEmbed).replace(/</g, "\\u003c"); // ✅ Ensure safe escaping
}
