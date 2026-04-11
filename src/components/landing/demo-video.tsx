/**
 * Landing walkthrough: use NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL in production (e.g. YouTube embed URL)
 * to avoid bundling a large MP4. Falls back to /f5-demo.mp4 for local dev after pnpm demo:publish-video.
 */
export function DemoVideo({ embedUrl }: { embedUrl?: string | null }) {
  const trimmed = embedUrl?.trim();
  if (trimmed) {
    let src = trimmed;
    if (src.includes("youtube.com/watch?v=")) {
      const id = new URL(src).searchParams.get("v");
      if (id) src = `https://www.youtube.com/embed/${id}`;
    } else if (src.includes("youtu.be/")) {
      const id = src.split("youtu.be/")[1]?.split(/[?&]/)[0];
      if (id) src = `https://www.youtube.com/embed/${id}`;
    }

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-black shadow-md">
        <iframe
          src={src}
          title="Demo walkthrough"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-md">
      <video
        className="aspect-video w-full object-contain"
        controls
        playsInline
        preload="metadata"
      >
        <source src="/f5-demo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
