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
  share_image?: string;
  share_image_edit?: string | null;
}

const CACHE_KEY = "latestEntryCache"; // ✅ Session cache key

const formatDate = (isoDate: string): string => {
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

export default function LatestEntry({
  onLoad,
  initialEntry,
}: {
  onLoad: (entry: Entry) => void;
  initialEntry?: Entry;
}) {
  const [entry, setEntry] = useState<Entry | null>(initialEntry || null);
  const [sdk, setSdk] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const checkAndSaveUser = async (fid: number, username: string) => {
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
        return;
      }

      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid, username }),
      });

      setIsNewUser(true);
    } catch (error) {
      console.error("Error checking/saving user:", error);
    }
  };

  useEffect(() => {
    if (initialEntry) {
      console.log("✅ Using initial entry (SSR):", initialEntry.title);
      onLoad(initialEntry);
      return;
    }

    const fetchEntry = async () => {
      try {
        const cachedEntry = sessionStorage.getItem(CACHE_KEY);
        if (cachedEntry) {
          const parsed = JSON.parse(cachedEntry);
          console.log("🟡 Using cached latest entry...");
          setEntry(parsed);
          onLoad(parsed);
        }

        console.log("🔄 Fetching latest entry from API...");
        const response = await fetch("/api/fetchLatest");
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const freshEntry: Entry = await response.json();
        console.log("✅ Latest entry received:", freshEntry.title);

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(freshEntry));
        setEntry(freshEntry);
        onLoad(freshEntry);
      } catch (error) {
        console.error("❌ Error fetching latest entry:", error);
        setErrorMessage("Failed to load content.");
      }
    };

    fetchEntry();
  }, [onLoad, initialEntry]);

  useEffect(() => {
    if (sdk && isNewUser === true) {
      handleFrameAddition();
    }
  }, [sdk, isNewUser]);

  const handleFrameAddition = async () => {
    if (!sdk || !context?.user?.fid) return;

    try {
      await sdk.actions.addFrame();
    } catch (error) {
      console.error("Error prompting for frame add:", error);
    }
  };

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
            <animate
              attributeName="opacity"
              calcMode="spline"
              dur="2s"
              values="1;0;1"
              keySplines=".5 0 .5 1;.5 0 .5 1"
              repeatCount="indefinite"
              begin="-0.4s"
            />
          </circle>
          <circle fill="#FFE500" stroke="#FFE500" strokeWidth="15" r="15" cx="100" cy="100">
            <animate
              attributeName="opacity"
              calcMode="spline"
              dur="2s"
              values="1;0;1"
              keySplines=".5 0 .5 1;.5 0 .5 1"
              repeatCount="indefinite"
              begin="-0.2s"
            />
          </circle>
          <circle fill="#FFE500" stroke="#FFE500" strokeWidth="15" r="15" cx="160" cy="100">
            <animate
              attributeName="opacity"
              calcMode="spline"
              dur="2s"
              values="1;0;1"
              keySplines=".5 0 .5 1;.5 0 .5 1"
              repeatCount="indefinite"
              begin="0s"
            />
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
        <div className="share-button-container">
          <button
            className="entry-button"
            onClick={() => {
              if (!sdk) return;

              const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(
                entry.title
              )}&embeds[]=${encodeURIComponent(`https://apod-frame.replit.app/entry/${entry.id}`)}`;

              console.log("🔗 Opening share URL:", shareUrl);
              sdk.actions.openUrl(shareUrl);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M8 8h8v8" />
              <path d="m8 16 8-8" />
            </svg>
            <span>Share on Warpcast</span>
          </button>

          <button
            className="entry-button"
            onClick={() => {
              if (!sdk) return;

              console.log("🔗 Opening entry link:", entry.link);
              sdk.actions.openUrl(entry.link);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 11a9 9 0 0 1 9 9" />
              <path d="M4 4a16 16 0 0 1 16 16" />
              <circle cx="5" cy="19" r="1" />
            </svg>
            <span>View on apod.gov</span>
          </button>
        </div>
      </div>
    </>
  );
}
