
import Head from 'next/head';

interface FrameMetadataProps {
  version: string;
  imageUrl: string;
  button?: {
    title: string;
    action: {
      type: string;
      name: string;
      url: string;
      splashImageUrl: string;
      splashBackgroundColor: string;
    };
  };
}

export default function FrameMetadata({ version, imageUrl, button }: FrameMetadataProps) {
  return (
    <Head>
      <meta property="fc:frame" content={version} />
      <meta property="fc:frame:image" content={imageUrl} />
      {button && (
        <>
          <meta property="fc:frame:button:1" content={button.title} />
          <meta property="fc:frame:button:1:action" content={button.action.type} />
          <meta property="fc:frame:button:1:target" content={button.action.url} />
        </>
      )}
    </Head>
  );
}
