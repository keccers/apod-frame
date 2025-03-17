const BASE_URL = "https://apod-frame.replit.app"; // Your deployed domain
const DEFAULT_IMAGE = `${BASE_URL}/apod-image.png`; // Ensure absolute fallback

/**
 * Generates a stable Frame Metadata JSON
 */
export function generateFrameMetadata(entry) {
  // Use the latest edited share image (if available), else fallback
  const imageUrl = entry?.share_image_edit || entry?.share_image || DEFAULT_IMAGE;

  const frameEmbed = {
    version: "next",
    imageUrl: imageUrl,
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

  // ✅ Properly stringify and escape characters for the meta tag
  const safeString = JSON.stringify(frameEmbed)
    .replace(/</g, "\\u003c")   // Escape <
    .replace(/>/g, "\\u003e")   // Escape >
    .replace(/&/g, "\\u0026");  // Escape & to prevent HTML parsing errors

  console.log("🟢 Generated Frame Metadata:", safeString);

  return safeString;
}

