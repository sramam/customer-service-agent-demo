import type { UIMessageChunk } from "ai";

export async function collectUIMessageChunks(
  stream: AsyncIterable<UIMessageChunk>,
): Promise<UIMessageChunk[]> {
  const chunks: UIMessageChunk[] = [];
  for await (const c of stream) chunks.push(c);
  return chunks;
}

export function chunksToReadableStream(
  chunks: UIMessageChunk[],
): ReadableStream<UIMessageChunk> {
  return new ReadableStream({
    start(controller) {
      try {
        for (const c of chunks) controller.enqueue(c);
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}
