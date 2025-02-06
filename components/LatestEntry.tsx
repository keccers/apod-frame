import { useEffect, useCallback, useState } from "react";
import sdk, { type FrameContext } from "@farcaster/frame-sdk";

interface Entry {
  id: string;
  title: string;
  link: string;
  content: string;
  date: string;
  media: string;
}

export default function LatestEntry() {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<FrameContext | undefined>(undefined);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Load the Farcaster SDK and fetch the user context.
   */
  useEffect(() => {
    const loadSDK = async (): Promise<void> => {
      try {
        const importedSdk = (await import("@farcaster/frame-sdk")).default;

        // Fetch the context
        const sdkContext = await importedSdk.context;

        // Validate context
        const userFid = sdkContext?.user?.fid;
        const userUsername = sdkContext?.user?.username;

        if (userFid && userUsername) {
          setContext(sdkContext);

          // Send POST request to save user info
          await fetch("/api/users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fid: userFid,
              username: userUsername,
            }),
          });
        } else {
          setErrorMessage("Unable to fetch user context. Ensure the frame is configured correctly.");
        }

        importedSdk.actions.ready();
      } catch (error) {
        setErrorMessage("An error occurred while loading the SDK. Please refresh and try again.");
      }
    };

    if (!isSDKLoaded) {
      setIsSDKLoaded(true);
      loadSDK();
    }
  }, [isSDKLoaded]);

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
    const interval = setInterval(fetchEntry, 86400000); // Refresh every 24 hours
    return () => clearInterval(interval);
  }, []);

  const openUrl = useCallback(() => {
    if (context && entry?.link) {
      sdk.actions.openUrl(entry.link);
    }
  }, [context, entry]);

  const toggleExplanation = useCallback(() => {
    setIsExplanationOpen((prev) => !prev);
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
      <p className="rss-date">{entry.date}</p>

      {/* Render video or image */}
      {entry.media?.includes("youtube.com") ? (
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

      {/* Toggle Explanation */}
      <button className="rss-toggle-button" onClick={toggleExplanation}>
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
      <button className="rss-button" onClick={openUrl}>
        See this photo on apod.nasa.gov
      </button>
    </div>
  );
}
