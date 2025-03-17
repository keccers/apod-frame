import Head from "next/head";

export default function FrameMetadata({
  frameMetadata,
}: {
  frameMetadata: string;
}) {
  return (
    <Head>
      <title>APOD for Farcaster Frames</title>
      <meta
        name="description"
        content="NASA's Astronomy Photo of the Day, for a Farcaster Frame"
      />
      <meta property="og:image" content="/apod-image.png" />
      <meta name="fc:frame" content={frameMetadata} />
    </Head>
  );
}
