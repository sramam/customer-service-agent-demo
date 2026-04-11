import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SHOWCASE_BEATS, type ShowcaseBeat } from "./demo-timeline";

function useKenBurnsZoom(
  beats: ShowcaseBeat[],
  frame: number,
  fps: number
): { scale: number; focus: { x: number; y: number } } {
  return useMemo(() => {
    const t = frame / fps;
    for (const b of beats) {
      const start = b.startSec;
      const end = b.startSec + b.durationSec;
      if (t < start || t >= end) continue;
      const u = (t - start) / (end - start);
      const pulse = interpolate(
        u,
        [0, 0.1, 0.85, 1],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      const scale = 1 + (b.scale - 1) * pulse;
      return { scale, focus: b.focus };
    }
    return { scale: 1, focus: { x: 0.5, y: 0.5 } };
  }, [beats, frame, fps]);
}

export const F5Demo: React.FC<{
  videoSrc: string;
}> = ({ videoSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scale, focus } = useKenBurnsZoom(SHOWCASE_BEATS, frame, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", overflow: "hidden" }}>
      {SHOWCASE_BEATS.map((b, i) => (
        <Sequence
          key={b.phase}
          from={Math.round(b.startSec * fps)}
          layout="none"
        >
          <Audio
            src={staticFile(
              `voice/beat-${String(i + 1).padStart(2, "0")}.mp3`
            )}
            volume={1}
          />
        </Sequence>
      ))}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${scale})`,
            transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
          }}
        >
          <OffthreadVideo
            src={staticFile(videoSrc)}
            muted
            volume={0}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
