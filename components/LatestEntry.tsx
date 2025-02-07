import { useEffect, useState } from "react";

// Dynamically import the Farcaster SDK
const sdkPromise = import("@farcaster/frame-sdk").then((mod) => mod.default);

interface Entry {
  id: string;
  title: string;
  link: string;
  content: string;
  date: string;
  media: string;
}

// ✅ Function to format the date properly
const formatDate = (isoDate: string): string => {
  if (!isoDate) return "Unknown Date"; // Handle missing dates

  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC", // Ensure consistent formatting
  });
};

export default function LatestEntry() {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [sdk, setSdk] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * 🚀 1. Load the SDK on page load and call `ready()`
   */
  useEffect(() => {
    const loadSDK = async () => {
      try {
        console.log("[Debug] Importing Farcaster SDK...");
        const sdkInstance = await sdkPromise;

        if (!sdkInstance) {
          throw new Error("[Debug] SDK import failed!");
        }

        console.log("[Debug] SDK Imported:", sdkInstance);
        setSdk(sdkInstance);

        // ✅ Call `ready()` FIRST
        console.log("[Debug] Calling `ready()`...");
        sdkInstance.actions.ready();
        console.log("[Debug] `ready()` called successfully!");

        // ✅ Now fetch the context (if available)
        console.log("[Debug] Attempting to fetch user context...");
        const sdkContext = await sdkInstance.context;

        if (sdkContext && sdkContext.user) {
          console.log("[Debug] Context received:", sdkContext);
          setContext(sdkContext);

          // ✅ Save user to database and check if it's their first time
          const response = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fid: sdkContext.user.fid,
              username: sdkContext.user.username,
            }),
          });

          const userData = await response.json();
          console.log("[Debug] User saved. First time?", userData.first_time);

          if (userData.first_time) {
            console.log("[Debug] User is new! Prompting for notifications...");
            handleNotificationPrompt(sdkContext.user.fid);
          }

        } else {
          console.warn("[Debug] No context available. Running in local mode.");
        }
      } catch (error) {
        console.error("[Debug] Error initializing SDK:", error);
        setErrorMessage("Error loading Farcaster SDK.");
      }
    };

    loadSDK(); // Runs once on page load
  }, []);

  /**
   * 🚀 2. Fetch the latest RSS entry from the API AFTER SDK is loaded
   */
  const fetchEntry = async () => {
    console.log("[Debug] Fetching latest RSS entry...");
    try {
      const response = await fetch("/api/fetchLatest");

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: Entry = await response.json();
      setEntry(data);
      console.log("[Debug] Successfully fetched entry:", data);
    } catch (error) {
      console.error("[Debug] Failed to fetch RSS entry:", error);
      setErrorMessage("Failed to load content.");
    }
  };

  useEffect(() => {
    if (sdk) {
      fetchEntry();
    }
  }, [sdk]);

  /**
   * 🚀 3. Handle Notification Prompt
   */
  const handleNotificationPrompt = async (fid: number) => {
    if (!sdk || hasPrompted) return;

    console.log("[Debug] Prompting user to add frame...");
    try {
      const result = await sdk.actions.addFrame();

      if (result.added && result.notificationDetails) {
        console.log("[Debug] User opted in to notifications:", result.notificationDetails);

        // ✅ Save the notification details to the database
        await fetch("/api/users/saveNotifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fid,
            notificationUrl: result.notificationDetails.url,
            notificationToken: result.notificationDetails.token,
          }),
        });

        console.log("[Debug] Notifications enabled and saved.");
      } else {
        console.log("[Debug] User rejected or already added frame:", result.reason);
      }

      setHasPrompted(true); // Prevent re-prompting in the same session

      // ✅ Update user record to ensure they are not prompted again
      await fetch("/api/users/updateFirstTime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid }),
      });

    } catch (error) {
      console.error("[Debug] Error prompting for notifications:", error);
    }
  };

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
        <iframe className="rss-video" src={entry.media} title={entry.title} allowFullScreen></iframe>
      ) : (
        <img src={entry.media} alt={entry.title} className="rss-image" />
      )}

      {/* ✅ Learn More Toggle */}
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
      <button className="rss-button" onClick={() => sdk?.actions.openUrl(entry.link)}>
        See this photo on apod.nasa.gov
      </button>
    </div>
  );
}
