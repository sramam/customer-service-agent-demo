import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Freeze,
  OffthreadVideo,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import {
  SHOWCASE_BEATS,
  SHOWCASE_SOURCE_VIDEO_DURATION_FALLBACK_SEC,
  buildVideoHoldTimeline,
  getBeatAudioDurationFrames,
  getBeatAudioFromFrame,
} from "./demo-timeline";

export const F5Demo: React.FC<{
  videoSrc: string;
  /** From `getVideoMetadata` in Root — actual WebM duration (seconds). */
  sourceDurationSec?: number;
}> = ({ videoSrc, sourceDurationSec }) => {
  const { fps } = useVideoConfig();
  const srcDur =
    sourceDurationSec != null &&
    Number.isFinite(sourceDurationSec) &&
    sourceDurationSec > 0
      ? sourceDurationSec
      : SHOWCASE_SOURCE_VIDEO_DURATION_FALLBACK_SEC;
  const holdSegments = useMemo(
    () => buildVideoHoldTimeline(fps, srcDur),
    [fps, srcDur],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", overflow: "hidden" }}>
      {SHOWCASE_BEATS.map((b, i) => (
        <Sequence
          key={b.phase}
          from={getBeatAudioFromFrame(i, fps)}
          durationInFrames={getBeatAudioDurationFrames(i, fps)}
          layout="none"
        >
          <Audio
            src={staticFile(
              `voice/beat-${String(i + 1).padStart(2, "0")}.mp3`,
            )}
            volume={1}
          />
        </Sequence>
      ))}
      <AbsoluteFill>
        {holdSegments.map((seg, i) => {
          const startFrames = Math.round(seg.anchorSec * fps);
          const playEndFrames = startFrames + seg.durationInFrames;

          return (
            <Sequence
              key={`hold-${seg.fromFrame}-${i}`}
              from={seg.fromFrame}
              durationInFrames={seg.durationInFrames}
              layout="none"
            >
              {seg.videoMode === "play" ? (
                <OffthreadVideo
                  src={staticFile(videoSrc)}
                  muted
                  trimBefore={startFrames}
                  trimAfter={playEndFrames}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Freeze frame={0}>
                  <OffthreadVideo
                    src={staticFile(videoSrc)}
                    muted
                    trimBefore={startFrames}
                    trimAfter={startFrames + 1}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </Freeze>
              )}
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
