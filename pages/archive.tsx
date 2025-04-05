// pages/archive.tsx

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { generateFrameMetadata } from "@/lib/frameMetadata";

// ✅ Dynamically import Farcaster SDK
const sdkPromise = import("@farcaster/frame-sdk").then((mod) => mod.default);

interface Entry {
  id: string;
  title: string;
  share_image?: string | null;
}

const PAGE_SIZE = 12;

export default function ArchivePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Generate metadata using existing fallback logic in generateFrameMetadata
  const frameMetadata = generateFrameMetadata(null);

  // ✅ Setup Farcaster SDK on page load
  useEffect(() => {
    const initSDK = async () => {
      try {
        const sdk = await sdkPromise;
        sdk.actions.ready();
      } catch (err) {
        console.error("❌ Error loading Farcaster SDK:", err);
      }
    };

    initSDK();
  }, []);

  useEffect(() => {
    const fetchEntries = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/fetchArchive?page=${page}&limit=${PAGE_SIZE}`);
        if (!res.ok) throw new Error("Failed to fetch archive");
        const data = await res.json();
        setEntries(data.entries);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [page]);

  return (
    <>
      <Head>
        <title>Archive | APOD for Farcaster Frames</title>
        <meta name="fc:frame" content={frameMetadata} />
      </Head>

      <main>
        <h1 className="archive-container-title">APOD Archive</h1>

        {isLoading ? (
          <div className="loading-container">
            <svg className="loading-animation" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
              <circle fill="#FFE500" stroke="#FFE500" strokeWidth="15" r="15" cx="40" cy="100">
                <animate attributeName="opacity" calcMode="spline" dur="2s" values="1;0;1" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-0.4s" />
              </circle>
              <circle fill="#FFE500" stroke="#FFE500" strokeWidth="15" r="15" cx="100" cy="100">
                <animate attributeName="opacity" calcMode="spline" dur="2s" values="1;0;1" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-0.2s" />
              </circle>
              <circle fill="#FFE500" stroke="#FFE500" strokeWidth="15" r="15" cx="160" cy="100">
                <animate attributeName="opacity" calcMode="spline" dur="2s" values="1;0;1" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0s" />
              </circle>
            </svg>
          </div>
        ) : (
          <div className="archive-container">
            <div className="archive-grid">
              {entries.map((entry) => (
                <a href={`/entry/${entry.id}`} className="archive-item" key={entry.id}>
                  {entry.share_image ? (
                    <img
                      src={entry.share_image}
                      alt={entry.title}
                      className="archive-thumbnail"
                    />
                  ) : (
                    <div className="archive-thumbnail flex items-center justify-center text-sm text-gray-500 bg-gray-200">
                      No image
                    </div>
                  )}
                  <div className="archive-title">{entry.title}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="page-button-container">
          <button
            className="page-button"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 15V9"/><path d="M15 15h-3v4l-7-7 7-7v4h3v6z"/>
            </svg>
            Previous
          </button>
          <button className="page-button" onClick={() => setPage((p) => p + 1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 9v6"/><path d="M9 9h3V5l7 7-7 7v-4H9V9z"/>
            </svg>
            Next
          </button>
        </div>
      </main>
    </>
  );
}
