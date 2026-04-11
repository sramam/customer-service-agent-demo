import React from "react";
import { AbsoluteFill } from "remotion";

export function FeatureOverlay({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        justifyContent: "flex-end",
        alignItems: "stretch",
        padding: 40,
      }}
    >
      <div
        style={{
          background: "rgba(0, 24, 48, 0.88)",
          borderLeft: "4px solid #3b82f6",
          padding: "18px 22px",
          borderRadius: 8,
          maxWidth: "92%",
          alignSelf: "center",
        }}
      >
        <div
          style={{
            color: "#93c5fd",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Feature
        </div>
        <h2
          style={{
            color: "#fff",
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.25,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            style={{
              color: "#cbd5e1",
              margin: "10px 0 0",
              fontSize: 15,
              lineHeight: 1.45,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}
