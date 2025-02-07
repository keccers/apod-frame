import { useEffect, useCallback, useState } from "react";
import sdk from "@farcaster/frame-sdk";

interface Entry {
  id: string;
  title: string;
  link: string;
  content: string;
  date: string; // Stored in ISO format
  media: string;
}

// Utility function to format the date
const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC", // Force UTC formatting
  });
};


export default function LatestEntry() {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Fetch the latest RSS entry from the API.
   */
  const fetchEntry = async () => {
    try {
      const response = await fetch("/api/fetchLatest");
      const data: Entry = await response.json();
      setEntry(data);
    } catch (error) {
      console.error("Failed to fetch RSS entry:", error);
    }
  };

  useEffect(() => {
    fetchEntry();
  }, []);

  if (errorMessage) {
    return (
      <div className="error-container">
        <p className="error-message">{errorMessage}</p>
      </div>
    );
  }

  if (!entry) return <p>Loading...</p>;

  return (
    <div className="rss-container">
      <h2 className="rss-title">{entry.title}</h2>
      <p className="rss-date">{entry.date ? formatDate(entry.date) : "Unknown Date"}</p>

      {/* Render video or image */}
      {entry.media?.includes("youtube.com") ? (
        <iframe
          className="rss-video"
          src={entry.media}
          title={entry.title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      ) : (
        <img src={entry.media} alt={entry.title} className="rss-image" />
      )}

      {/* Toggle Explanation */}
      <button className="rss-toggle-button" onClick={() => setIsExplanationOpen(!isExplanationOpen)}>
        <span className={`rss-toggle-icon ${isExplanationOpen ? "open" : ""}`}>
          ➤
        </span>
        Learn about this photo
      </button>
      {isExplanationOpen && (
        <div className="rss-explanation">
          <div dangerouslySetInnerHTML={{ __html: entry.content }} />
        </div>
      )}

      {/* Open Link */}
      <button className="rss-button" onClick={() => sdk.actions.openUrl(entry.link)}>
        See this photo on apod.nasa.gov
      </button>
    </div>
  );
}
