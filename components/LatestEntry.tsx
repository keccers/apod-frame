import { useEffect, useCallback, useState } from "react";

interface Entry {
  title: string;
  link: string;
  content: string;
  date: string;
  media: string; // Video or Image
}

export default function LatestEntry() {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [sdk, setSdk] = useState<any>(null);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false); // Toggle state

  useEffect(() => {
    // Dynamically import the SDK and signal readiness
    const loadSDK = async () => {
      const importedSdk = (await import("@farcaster/frame-sdk")).default;
      setSdk(importedSdk);
      importedSdk.actions.ready();
    };

    if (!isSDKLoaded) {
      setIsSDKLoaded(true);
      loadSDK();
    }
  }, [isSDKLoaded]);

  // Function to fetch RSS data
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
    fetchEntry(); // Fetch on initial mount

    // Auto-refresh once a day (24 hours = 86,400,000 milliseconds)
    const interval = setInterval(() => {
      fetchEntry();
    }, 86400000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const openUrl = useCallback(() => {
    if (sdk && entry?.link) {
      sdk.actions.openUrl(entry.link);
    }
  }, [sdk, entry]);

  const toggleExplanation = useCallback(() => {
    setIsExplanationOpen((prev) => !prev);
  }, []);

  if (!entry) return <p>Loading...</p>;

  return (
    <div className="rss-container">
      <h2 className="rss-title">{entry.title}</h2>
      <p className="rss-date">{entry.date}</p>

      {/* Display video if available, otherwise fallback to image */}
      {entry.media.includes("youtube.com") ? (
        <iframe
          className="rss-video"
          src={entry.media}
          title={entry.title}
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      ) : (
        <img src={entry.media} alt={entry.title} className="rss-image" />
      )}

      {/* Toggle Button for Explanation */}
      <button className="rss-toggle-button" onClick={toggleExplanation}>
        <span className={`rss-toggle-icon ${isExplanationOpen ? "open" : ""}`}>
          ➤
        </span>
        Learn about this photo
      </button>

      {/* Show Explanation if Toggle is Open */}
      {isExplanationOpen && (
        <div className="rss-explanation">
          <div dangerouslySetInnerHTML={{ __html: entry.content }} />
        </div>
      )}

      {/* Button to open the link */}
      <button className="rss-button" onClick={openUrl} disabled={!sdk}>
        See this photo on apod.nasa.gov
      </button>
    </div>
  );
}