import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";

export type ConversationExportTranscriptLine = {
  id: string;
  speakerLabel: string;
  text: string;
  offsetMsFromStart: number | null;
};

export type ConversationExportVideoProps = {
  transcript: ConversationExportTranscriptLine[];
  /** Seconds each message card stays on screen (sequential layout). */
  dwellSeconds: number;
};

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export const ConversationExportVideo: React.FC<ConversationExportVideoProps> = ({
  transcript,
  dwellSeconds,
}) => {
  const { fps } = useVideoConfig();
  const dwellFrames = Math.max(1, Math.round(dwellSeconds * fps));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        color: "#e2e8f0",
      }}
    >
      {transcript.map((line, i) => (
        <Sequence
          key={line.id || `line-${i}`}
          from={i * dwellFrames}
          durationInFrames={dwellFrames}
          layout="none"
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 48,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                maxWidth: 960,
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(148, 163, 184, 0.35)",
                background: "rgba(15, 23, 42, 0.92)",
                padding: "28px 32px",
                boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  marginBottom: 12,
                }}
              >
                {line.speakerLabel}
              </div>
              <div
                style={{
                  fontSize: 22,
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {truncate(line.text, 4000)}
              </div>
            </div>
          </div>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
