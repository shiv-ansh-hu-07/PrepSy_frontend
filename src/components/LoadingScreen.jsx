import React, { useEffect, useState } from "react";

const SLOW_THRESHOLD_MS = 4000;
const VERY_SLOW_THRESHOLD_MS = 12000;

export default function LoadingScreen() {
  const [elapsedTier, setElapsedTier] = useState("fast");

  useEffect(() => {
    const slowTimer = setTimeout(() => setElapsedTier("slow"), SLOW_THRESHOLD_MS);
    const verySlowTimer = setTimeout(
      () => setElapsedTier("verySlow"),
      VERY_SLOW_THRESHOLD_MS
    );

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(verySlowTimer);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 76px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <span
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          border: "3px solid rgba(95,111,163,0.25)",
          borderTopColor: "var(--text-secondary)",
          animation: "loading-screen-spin 0.8s linear infinite",
        }}
      />

      {elapsedTier === "fast" && (
        <p style={{ color: "var(--text-secondary)", fontSize: "15px", margin: 0 }}>Loading...</p>
      )}

      {elapsedTier === "slow" && (
        <p style={{ color: "var(--text-secondary)", fontSize: "15px", margin: 0, maxWidth: "320px" }}>
          Still working on it — waking up the server. This can take up to a minute if
          the site hasn't been visited in a while.
        </p>
      )}

      {elapsedTier === "verySlow" && (
        <p style={{ color: "var(--text-secondary)", fontSize: "15px", margin: 0, maxWidth: "340px" }}>
          Almost there. The server is spinning back up after being idle — thanks for
          your patience, this only happens on the first visit in a while.
        </p>
      )}

      <style>
        {`@keyframes loading-screen-spin { to { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
}
