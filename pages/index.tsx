"use client";

import { useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { generateFrameMetadata, Entry } from "@/lib/frameMetadata";

const LatestEntry = dynamic(() => import("../components/LatestEntry"), {
  ssr: false,
});

const BASE_URL = "https://apod-frame.replit.app";
const DEFAULT_IMAGE = `${BASE_URL}/apod-image.png`;

// ✅ Prefetch latest entry at build time (Ensures metadata is stable)
export async function getServerSideProps() {
  try {
    console.log("🔄 Fetching latest entry from API (SSR)...");

    const response = await fetch(`${BASE_URL}/api/fetchLatest`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

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
      <Head>
        {/* ✅ Embed Frame Metadata (STABLE & PRESENT IN FIRST HTML RESPONSE) */}
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
