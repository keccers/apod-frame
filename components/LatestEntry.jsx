import { useEffect, useState } from "react";

// Dynamically import the Farcaster SDK
const sdkPromise = import("@farcaster/frame-sdk").then((mod) => mod.default);

const CACHE_KEY = "latestEntryCache"; // ✅ Session cache key

const formatDate = (isoDate) => {
  if (!isoDate) return "Unknown Date";

  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

export default function LatestEntry({ onLoad }) {
  const [entry, setEntry] = useState(null);
  const [sdk, setSdk] = useState(null);
  const [context, setContext] = useState(null);
  const [isNewUser, setIsNewUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleFrameAddition = async () => {
    if (!sdk || !context?.user?.fid) return;
    try {
      await sdk.actions.addFrame();
      console.log("✅ Frame added for new user.");
    } catch (error) {
      console.error("❌ Error prompting for frame add:", error);
    }
  };

  /**
   * ✅ Handle Farcaster Frame Addition for New Users
   */
  const handleFrameAddition = async () => {
    if (!sdk || !context?.user?.fid) return;

    try {
      await sdk.actions.addFrame();
      console.log("✅ Frame added for new user.");
    } catch (error) {
      console.error("❌ Error prompting for frame add:", error);
    }
  };

  /**
   * ✅ Load Farcaster SDK and Context
   */
  useEffect(() => {
    const loadSDK = async () => {
      try {
        const sdkInstance = await sdkPromise;
        if (!sdkInstance) throw new Error("SDK import failed!");

        setSdk(sdkInstance);
        sdkInstance.actions.ready();

        const sdkContext = await sdkInstance.context;
        if (sdkContext?.user) {
          setContext(sdkContext);
          await checkAndSaveUser(sdkContext.user.fid, sdkContext.user.username);
        }
      } catch (error) {
        setErrorMessage("Error loading Farcaster SDK.");
      }
    };

    loadSDK();
  }, []);

  /**
   * ✅ Check if User is New and Update DB
   */
  const checkAndSaveUser = async (fid, username) => {
    try {
      const response = await fetch("/api/users/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid }),
      });

      const userData = await response.json();

      if (!userData.isNewUser) {
        await fetch("/api/users/updateFirstTime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fid }),
        });
        setIsNewUser(false);
      } else {
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fid, username }),
        });
        setIsNewUser(true);
      }
    } catch (error) {
      console.error("Error checking/saving user:", error);
    }
  };

  /**
   * ✅ Fetch Latest Entry with Caching
   */
  useEffect(() => {
    const fetchEntry = async () => {
      try {
        const cachedEntry = sessionStorage.getItem(CACHE_KEY);
        const parsedCache = cachedEntry ? JSON.parse(cachedEntry) : null;

        console.log("🔄 Fetching latest entry from API...");
        const response = await fetch("/api/fetchLatest");
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const freshEntry = await response.json();
        console.log("✅ Latest entry received:", freshEntry.title);

        if (!parsedCache || parsedCache.id !== freshEntry.id) {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(freshEntry));
          setEntry(freshEntry);
          onLoad(freshEntry);
        } else {
          console.log("🟡 Using cached latest entry...");
          setEntry(parsedCache);
          onLoad(parsedCache);
        }
      } catch (error) {
        console.error("❌ Error fetching latest entry:", error);
        setErrorMessage("Failed to load content.");
      }
    };

    fetchEntry();
  }, [onLoad]);

  /**
   * ✅ Trigger Frame Addition for New Users
   */
  useEffect(() => {
    if (sdk && isNewUser === true) {
      handleFrameAddition();
    }
  }, [sdk, isNewUser]);

  /**
   * ✅ Loading/Error States
   */
  if (errorMessage) {
    return (
      <div className="error-container">
        <p className="error-message">{errorMessage}</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="loading-container">
        <svg
          className="loading-animation"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 200 200"
        >
          <circle fill="#FFE500" stroke="#FFE500" strokeWidth="15" r="15" cx="40" cy="100">
            <animate attributeName="opacity" calcMode="spline" dur="2s" values="1;0;1" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-0.4s" />
          </circle>
          <circle fill="#FFE500" stroke="#FFE500" strokeWidth="15" r="15" cx="100" cy="100">
            <animate attributeName="opacity" calcMode="spline" dur="2s" values="1;0;1" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-0.2s" />
          </circle>
          <circle fill="#FFE500" stroke="#FFE500" strokeWidth="15" r="15" cx="160" cy="100">
            <animate attributeName="opacity" calcMode="spline" dur="2s" values="1;0;1" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0s" />
          </circle>
        </svg>
      </div>
    );
  }

  return (
    <>
      <div className="fullscreen-header">
        {entry.media.includes("youtube.com") ? (
          <iframe
            className="fullscreen-media"
            src={entry.media}
            title={entry.title}
            allowFullScreen
          ></iframe>
        ) : (
          <img src={entry.share_image || entry.media} alt={entry.title} className="fullscreen-media" />
        )}
      </div>

      <div className="content-container">
        <h2 className="rss-title">{entry.title}</h2>
        <h4 className="rss-date">{entry.date ? formatDate(entry.date) : "Unknown Date"}</h4>

        <div className="rss-explanation">
          {entry.content ? (
            <div dangerouslySetInnerHTML={{ __html: entry.content }} />
          ) : (
            <p>No description available.</p>
          )}
        </div>
      </div>
    </>
  );
}
