import { useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { generateFrameMetadata, Entry } from "@/lib/frameMetadata";

const LatestEntry = dynamic(() => import("../components/LatestEntry"), {
  ssr: false,
});

const BASE_URL = "https://apod-frame.replit.app";

export async function getServerSideProps() {
  try {
    const res = await fetch(`${BASE_URL}/api/fetchLatest`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const entry: Entry = await res.json();

    return {
      props: {
        latestEntry: entry,
        frameMetadata: generateFrameMetadata(entry),
      },
    };
  } catch (err) {
    console.error("❌ Error fetching latest entry:", err);
    return {
      props: {
        latestEntry: null,
        frameMetadata: generateFrameMetadata(null),
      },
    };
  }
}

export default function Home({ latestEntry, frameMetadata }: { latestEntry: Entry | null; frameMetadata: string }) {
  const [entry, setEntry] = useState<Entry | null>(latestEntry);

  return (
    <>
      <Head>
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
