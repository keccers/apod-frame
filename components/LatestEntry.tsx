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

export default function LatestEntry() {
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
        console.log("[Debug] 🚀 Importing Farcaster SDK...");
        const sdkInstance = await sdkPromise;

        if (!sdkInstance) {
          throw new Error("[Debug] ❌ SDK import failed!");
        }

        console.log("[Debug] ✅ SDK Imported:", sdkInstance);
        setSdk(sdkInstance);

        console.log("[Debug] 🚀 Calling `ready()`...");
        sdkInstance.actions.ready();
        console.log("[Debug] ✅ `ready()` called successfully!");

        console.log("[Debug] 🔍 Fetching user context...");
        const sdkContext = await sdkInstance.context;

        if (sdkContext && sdkContext.user) {
          console.log("[Debug] ✅ Context received:", sdkContext);
          setContext(sdkContext);

          // ✅ Check & update user existence
          await checkAndSaveUser(sdkContext.user.fid, sdkContext.user.username);
        } else {
          console.warn("[Debug] ⚠️ No context available. Running in local mode.");
        }
      } catch (error) {
        console.error("[Debug] ❌ Error initializing SDK:", error);
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
      console.log("[Debug] 🔄 Checking user existence...");

      const response = await fetch("/api/users/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid }),
      });

      const userData = await response.json();
      console.log("[Debug] ✅ Raw API Response:", userData);

      if (userData.isNewUser === false) {
        console.log("[Debug] ✅ User exists. Updating first_time = false...");
        await fetch("/api/users/updateFirstTime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fid }),
        });

        setIsNewUser(false);
        return; // 🚀 STOP HERE. Do NOT override with a new user save!
      }

      console.log("[Debug] 🚀 New user detected. Saving with first_time = true...");
      const saveResponse = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid, username }),
      });

      const savedUser = await saveResponse.json();
      console.log("[Debug] ✅ New user saved. First time:", savedUser.first_time);

      setIsNewUser(true);
    } catch (error) {
      console.error("[Debug] ❌ Error checking/saving user:", error);
    }
  };

  /**
   * 🚀 3. Handle Frame Addition (No Notification Saving)
   */
  const handleFrameAddition = async () => {
    if (!sdk || !context?.user?.fid) {
      console.log("[Debug] ⚠️ Not prompting for frame add (SDK or user context missing).");
      return;
    }

    console.log("[Debug] 🔔 Prompting user to add frame...");
    try {
      const result = await sdk.actions.addFrame();
      console.log("[Debug] ✅ addFrame() result:", result);

      if (result.added) {
        console.log("[Debug] ✅ User added the frame.");
      } else {
        console.log("[Debug] ❌ User rejected frame add or it failed:", result.reason);
      }
    } catch (error) {
      console.error("[Debug] ❌ Error prompting for frame add:", error);
    }
  };

  /**
   * 🚀 4. Run Frame Addition Prompt & Update first_time
   */
  useEffect(() => {
    const runFrameAdditionPrompt = async () => {
      if (!sdk || isNewUser !== true) return;

      console.log("[Debug] 🔔 Handling frame addition prompt...");
      await handleFrameAddition();

      // ✅ Step 4: Update `first_time = false`
      console.log("[Debug] 🔄 Updating first_time to `false`...");
      await fetch("/api/users/updateFirstTime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: context?.user?.fid }),
      });
      console.log("[Debug] ✅ User first_time updated to false.");
    };

    runFrameAdditionPrompt();
  }, [sdk, isNewUser, context]);

  /**
   * 🚀 5. Fetch the latest RSS entry
   */
  useEffect(() => {
    if (sdk) {
      fetchEntry();
    }
  }, [sdk]);

  const fetchEntry = async () => {
    console.log("[Debug] 🔍 Fetching latest RSS entry...");
    try {
      const response = await fetch("/api/fetchLatest");

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: Entry = await response.json();
      setEntry(data);
      console.log("[Debug] ✅ Successfully fetched entry:", data);
    } catch (error) {
      console.error("[Debug] ❌ Failed to fetch RSS entry:", error);
      setErrorMessage("Failed to load content.");
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

      {entry.media?.includes("youtube.com") ? (
        <iframe className="rss-video" src={entry.media} title={entry.title} allowFullScreen></iframe>
      ) : (
        <img src={entry.media} alt={entry.title} className="rss-image" />
      )}

      <button className="rss-button" onClick={() => sdk?.actions.openUrl(entry.link)}>
        See this photo on apod.nasa.gov
      </button>
    </div>
  );
}
