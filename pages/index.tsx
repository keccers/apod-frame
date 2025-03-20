import { useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { generateFrameMetadata, Entry } from "@/lib/frameMetadata";

const LatestEntry = dynamic(() => import("../components/LatestEntry"), {
  ssr: false, // ✅ Ensures it's only loaded client-side
});

const BASE_URL = "https://apod-frame.replit.app";

// ✅ Server-Side Fetching & Metadata Generation
export async function getServerSideProps() {
  try {
    console.log("🔄 Fetching latest entry from API (SSR)...");

    const response = await fetch(`${BASE_URL}/api/fetchLatest`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const latestEntry: Entry = await response.json();
    console.log("✅ Latest entry received (SSR):", latestEntry.title);

    // ✅ Generate metadata on the server
    const frameMetadata = generateFrameMetadata(latestEntry);

    return {
      props: {
        latestEntry,
        frameMetadata, // ✅ Passed as a prop
      },
    };
  } catch (error) {
    console.error("❌ Error in getServerSideProps:", error);
    return {
      props: {
        latestEntry: null,
        frameMetadata: generateFrameMetadata(null), // ✅ Ensure metadata is passed
      },
    };
  }
}

export default function Home({ latestEntry, frameMetadata }: { latestEntry: Entry | null; frameMetadata: string }) {
  const [entry, setEntry] = useState<Entry | null>(latestEntry);

  return (
    <>
      <Head>
        {/* ✅ Server-Side Injected Metadata */}
        <meta name="fc:frame" content={frameMetadata} />
      </Head>

      <main className="min-h-screen flex flex-col p-4">
        <LatestEntry
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
