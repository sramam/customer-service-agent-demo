import React from "react";
import { Composition, staticFile } from "remotion";
import { getVideoMetadata } from "@remotion/media-utils";
import { minTimelineSecondsForVoice } from "./demo-timeline";
import { F5Demo } from "./F5Demo";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="F5Demo"
        component={F5Demo}
        fps={FPS}
        width={1280}
        height={720}
        defaultProps={{
          videoSrc: "playwright-demo.webm",
        }}
        calculateMetadata={async ({ props }) => {
          const { durationInSeconds: videoSeconds } = await getVideoMetadata(
            staticFile(props.videoSrc)
          );
          const minForVoice = minTimelineSecondsForVoice();
          const durationInSeconds = Math.max(videoSeconds, minForVoice);
          const durationInFrames = Math.max(1, Math.ceil(durationInSeconds * FPS));
          return { durationInFrames };
        }}
      />
    </>
  );
};
