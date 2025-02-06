"use client";

import Head from "next/head";
import dynamic from "next/dynamic";

const LatestEntry = dynamic(() => import("../components/LatestEntry"), {
  ssr: false,
});

// Define the FrameEmbed JSON
const frameEmbed = {
  version: "next",
  imageUrl: "https://apod-frame.replit.app/apod-image.png",
  button: {
    title: "Discover the cosmos",
    action: {
      type: "launch_frame",
      name: "APOD",
      url: "https://apod-frame.replit.app/",
      splashImageUrl: "https://apod-frame.replit.app/apod-icon.png",
      splashBackgroundColor: "#301885",
    },
  },
};

// Convert to a properly formatted string for the meta tag
const frameEmbedString = JSON.stringify(frameEmbed);

export default function Home() {
  return (
    <>
      <Head>
        {/* Add the Frame Metadata */}
        <meta name="fc:frame" content={frameEmbedString} />
      </Head>

      <main className="min-h-screen flex flex-col p-4">
        <LatestEntry />
      </main>
    </>
  );
}