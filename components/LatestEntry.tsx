import { useCallback, useEffect, useState } from "react";

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

export default function LatestEntry({ onLoad }: { onLoad: (entry: Entry) => void }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [sdk, setSdk] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * 🚀 1. Load SDK and User Context
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
   * 🚀 2. Check user in DB & Update first_time
   */
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

  /**
   * 🚀 3. Fetch the latest RSS entry (Fixed useCallback placement)
   */
  const fetchEntry = useCallback(async () => {
    try {
      const response = await fetch("/api/fetchLatest");
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data: Entry = await response.json();
      setEntry(data);
      onLoad(data); // ✅ Pass entry up for dynamic metadata updates
    } catch (error) {
      setErrorMessage("Failed to load content.");
    }
  }, [onLoad]); // ✅ Depend on `onLoad` (not `entry` or `sdk`)

  useEffect(() => {
    if (sdk) fetchEntry();
  }, [sdk, fetchEntry]); // ✅ Now properly tracks `fetchEntry`

  /**
   * 🚀 4. Handle Frame Addition (No Notification Saving)
   */
  const handleFrameAddition = async () => {
    if (!sdk || !context?.user?.fid) return;

    try {
      await sdk.actions.addFrame();
    } catch (error) {
      console.error("Error prompting for frame add:", error);
    }
  };

  useEffect(() => {
    if (sdk && isNewUser === true) {
      handleFrameAddition();
    }
  }, [sdk, isNewUser]);

  if (errorMessage) {
    return (
      <div className="error-container">
        <p className="error-message">{errorMessage}</p>
      </div>
    );
  }

  if (!entry) return <p>Loading...</p>;

  // ✅ Ensure Farcaster metadata uses `share_image_edit`
  const metaImageUrl = entry.share_image_edit || entry.share_image || entry.media;

  // ✅ Ensure the full post body uses `share_image` (NOT `share_image_edit`)
  const postImageUrl = entry.share_image || entry.media;

  // ✅ Check if the post is a YouTube video
  const isYouTube = entry.media.includes("youtube.com");

  return (
    <>
      {/* 🔹 Fullscreen Header (Handles Image or Video) */}
      <div className="fullscreen-header">
        {isYouTube ? (
          <iframe
            className="fullscreen-media"
            src={entry.media}
            title={entry.title}
            allowFullScreen
          ></iframe>
        ) : (
          <img src={postImageUrl} alt={entry.title} className="fullscreen-media" />
        )}
      </div>

      {/* 🔹 Content Section (Below Header) */}
      <div className="content-container">
        <h2 className="rss-title">{entry.title}</h2>
        <h4 className="rss-date">{entry.date ? formatDate(entry.date) : "Unknown Date"}</h4>

        {/* ✅ Explanation Always Visible */}
        <div className="rss-explanation">
          {entry.content ? (
            <div dangerouslySetInnerHTML={{ __html: entry.content }} />
          ) : (
            <p>No description available.</p>
          )}
        </div>

        {/* 🔹 Open Link Button */}
        {sdk && (
          <button className="rss-button" onClick={() => sdk.actions.openUrl(entry.link)}>
            See this photo on apod.nasa.gov
          </button>
        )}
      </div>
    </>
  );
}
