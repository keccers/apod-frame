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

      // Get user context
      try {
        const context = await importedSdk.context;
        console.log('[Component] Raw SDK context:', context);
        
        const fid = context?.fid ? Number(context.fid) : null;
        const username = context?.username ? String(context.username) : null;
        
        if (fid && username) {
          console.log('[Component] Validated context - FID:', fid, 'Username:', username);
          await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fid: Number(context.fid),
              username: String(context.username),
            }),
          });
        } else {
          console.log('[Component] Invalid or missing user context');
        }
      } catch (error) {
        console.error('[Component] Error processing SDK context:', error);
      }

      importedSdk.actions.ready();
    };

    if (!isSDKLoaded) {
      setIsSDKLoaded(true);
      loadSDK();
    }
  }, [isSDKLoaded]);

  // Function to fetch RSS data
  const fetchEntry = async () => {
    console.log('[Component] Fetching latest entry');
    try {
      const response = await fetch("/api/fetchLatest");
      const data: Entry = await response.json();
      setEntry(data);
      console.log('[Component] Successfully fetched entry:', data.title);
      // If we have user context from Farcaster, post the interaction
      if (sdk && sdk.context?.fid) {
        console.log('[Component] Attempting POST request with FID:', sdk.context.fid);
        try {
          const postResponse = await fetch("/api/fetchLatest", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fid: sdk.context.fid,
              entryId: data.id,
            }),
          });
          console.log('[Component] POST response status:', postResponse.status);
          const postData = await postResponse.json();
          console.log('[Component] POST response data:', postData);
        } catch (error) {
          console.error('[Component] POST request failed:', error);
        }
      } else {
        console.log('[Component] No FID found in SDK context');
      }
    } catch (error) {
      console.error("[Component] Failed to fetch RSS entry:", error);
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

  // Separate useEffect for handling user context
  useEffect(() => {
    const checkUserContext = async () => {
      console.log('[Component] SDK Context:', sdk?.context);
      if (sdk?.context?.fid && typeof sdk.context.fid === 'number' && sdk?.context?.username) {
        console.log('[Component] Found valid user context, attempting to save user');
        try {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fid: sdk.context.fid,
              username: sdk.context.username,
            }),
          });
          const data = await response.json();
          console.log('[Component] User save response:', data);
        } catch (error) {
          console.error('[Component] Failed to save user:', error);
        }
      } else {
        console.log('[Component] No valid user context found');
      }
    };

    checkUserContext();
  }, [sdk]);

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