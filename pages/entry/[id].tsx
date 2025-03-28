import dynamic from "next/dynamic";
import Head from "next/head";
import { GetServerSideProps } from "next";
import { generateFrameMetadata, Entry } from "@/lib/frameMetadata";

const BASE_URL = "https://apod-frame.replit.app";

// ✅ Dynamically import because it uses Farcaster SDK (client-only)
const LatestEntry = dynamic(() => import("../../components/LatestEntry"), {
  ssr: false,
});

interface Props {
  entry: Entry | null;
  frameMetadata: string;
}

export default function EntryPage({ entry, frameMetadata }: Props) {
  return (
    <>
      <Head>
        <title>{entry?.title || "Discover the cosmos"}</title>
        <meta name="fc:frame" content={frameMetadata} />
      </Head>
      <main className="min-h-screen flex flex-col p-4">
        {entry && (
          <LatestEntry
            onLoad={() => {
              // Do nothing — entry is already loaded
            }}
            initialEntry={entry} // ✅ Custom prop we'll use inside LatestEntry
          />
        )}
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id;

  try {
    const response = await fetch(`${BASE_URL}/api/fetchById?id=${id}`);
    if (!response.ok) throw new Error("Entry not found");

    const entry: Entry = await response.json();
    const frameMetadata = generateFrameMetadata(entry);

    return {
      props: {
        entry,
        frameMetadata,
      },
    };
  } catch (error) {
    console.error("❌ Error loading entry:", error);
    return {
      props: {
        entry: null,
        frameMetadata: generateFrameMetadata(null),
      },
    };
  }
};
