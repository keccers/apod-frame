import { fetchAndStoreLatestEntry } from "../lib/fetchRSS";

fetchAndStoreLatestEntry().then(() => {
  console.log("[DEBUG] Manual RSS fetch completed!");
}).catch(error => {
  console.error("[ERROR] Fetch failed:", error);
});
