import dynamic from "next/dynamic";
import FrameMetadata from "../components/FrameMetadata";
import { generateFrameMetadata, Entry } from "../lib/frameMetadata";
import { useState } from "react";

const LatestEntry = dynamic(() => import("../components/LatestEntry"), {
  ssr: false,
});

const BASE_URL = "https://apod-frame.replit.app";

export async function getServerSideProps() {
  try {
    console.log("🔄 Fetching latest entry from API (SSR)...");

    const response = await fetch(`${BASE_URL}/api/fetchLatest`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const latestEntry: Entry = await response.json();
    console.log("✅ Latest entry received (SSR):", latestEntry.title);

    return {
      props: {
        latestEntry,
        frameMetadata: generateFrameMetadata(latestEntry),
      },
    };
  } catch (error) {
    console.error("❌ Error in getServerSideProps:", error);
    return { props: { latestEntry: null, frameMetadata: generateFrameMetadata(null) } };
  }
}

export default function Home({ latestEntry, frameMetadata }: { latestEntry: Entry | null; frameMetadata: string }) {
  const [entry, setEntry] = useState<Entry | null>(latestEntry);

  return (
    <>
      <FrameMetadata frameMetadata={frameMetadata} />

      <main className="min-h-screen flex flex-col p-4">
        <LatestEntry
          initialEntry={entry}
          onLoad={(newEntry) => {
            if (newEntry?.id !== entry?.id) {
              setEntry(newEntry);
            }
          }}
        />
      </main>
    </>
  );
}
