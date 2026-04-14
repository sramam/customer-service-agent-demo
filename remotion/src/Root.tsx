import React from "react";
import { Composition, staticFile } from "remotion";
import { getVideoMetadata } from "@remotion/media-utils";
import {
  minTimelineSecondsForVoice,
  SHOWCASE_SOURCE_VIDEO_DURATION_FALLBACK_SEC,
} from "./demo-timeline";
import { F5Demo } from "./F5Demo";
import { ConversationExportVideo } from "./ConversationExportVideo";

const FPS = 30;

/** Fallback when metadata is missing; real size comes from `playwright-demo.webm` (see calculateMetadata). */
const DEMO_FALLBACK_WIDTH = 1920;
const DEMO_FALLBACK_HEIGHT = 1080;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="F5Demo"
        component={F5Demo}
        fps={FPS}
        width={DEMO_FALLBACK_WIDTH}
        height={DEMO_FALLBACK_HEIGHT}
        defaultProps={{
          videoSrc: "playwright-demo.webm",
          sourceDurationSec: SHOWCASE_SOURCE_VIDEO_DURATION_FALLBACK_SEC,
        }}
        calculateMetadata={async ({ props }) => {
          const meta = await getVideoMetadata(staticFile(props.videoSrc));
          const minForVoice = minTimelineSecondsForVoice();
          const durationInSeconds = Math.max(1, minForVoice);
          const durationInFrames = Math.max(1, Math.ceil(durationInSeconds * FPS));
          return {
            durationInFrames,
            width: meta.width,
            height: meta.height,
            props: {
              ...props,
              sourceDurationSec: meta.durationInSeconds,
            },
          };
        }}
      />
      <Composition
        id="ConversationExportVideo"
        component={ConversationExportVideo}
        fps={FPS}
        width={1280}
        height={720}
        defaultProps={{
          transcript: [],
          dwellSeconds: 4,
        }}
        calculateMetadata={({ props }) => {
          const n = props.transcript?.length ?? 0;
          const dwell = props.dwellSeconds ?? 4;
          const durationInSeconds = Math.max(1, n * dwell + 0.5);
          const durationInFrames = Math.max(1, Math.ceil(durationInSeconds * FPS));
          return { durationInFrames };
        }}
      />
    </>
  );
};
