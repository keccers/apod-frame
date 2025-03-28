const BASE_URL = "https://apod-frame.replit.app";
const DEFAULT_IMAGE = `${BASE_URL}/apod-image.png`;

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
  const imageUrl = entry?.share_image_edit || entry?.share_image || DEFAULT_IMAGE;
  const id = entry?.id;
  const title = "Discover the cosmos";

  // If we have an ID, construct a permalink path
  const frameUrl = id ? `${BASE_URL}/entry/${id}` : BASE_URL;

  const frameEmbed = {
    version: "next",
    imageUrl,
    button: {
      title,
      action: {
        type: "launch_frame",
        name: "APOD",
        url: frameUrl,
        splashImageUrl: `${BASE_URL}/apod-icon.png`,
        splashBackgroundColor: "#301885",
      },
    },
  };

  console.log("🟢 Generated Frame Metadata:", frameEmbed);

  return JSON.stringify(frameEmbed)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
