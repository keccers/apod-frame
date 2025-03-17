
const BASE_URL = "https://apod-frame.replit.app";
const DEFAULT_IMAGE = `${BASE_URL}/apod-image.png`;

export function generateFrameMetadata(entry) {
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
        splashBackgroundColor: "#301885"
      }
    }
  };

  return JSON.stringify(frameEmbed)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
