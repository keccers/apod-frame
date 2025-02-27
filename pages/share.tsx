import { GetServerSideProps } from "next";
import pool from "@/lib/db";

interface Entry {
  title: string;
  share_image: string | null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const result = await pool.query(
      "SELECT title, share_image FROM latest_rss ORDER BY date DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      return { props: { entry: null } };
    }

    return { props: { entry: result.rows[0] } };
  } catch (error) {
    console.error("❌ Error fetching latest entry:", error);
    return { props: { entry: null } };
  }
};

export default function Share({ entry }: { entry: Entry | null }) {
  if (!entry || !entry.share_image) {
    return (
      <div className="share-container">
        <p className="share-no-image">No image available</p>
      </div>
    );
  }

  return (
    <div className="share-container">
      <div className="share-image-wrapper">
        {/* Background Image (3:2 Aspect Ratio) */}
        <img src={entry.share_image} alt={entry.title} className="share-background-image" />

        {/* Overlay Title */}
        <div className="share-overlay">
          <h1 className="share-title">{entry.title}</h1>
        </div>
      </div>
    </div>
  );
}
