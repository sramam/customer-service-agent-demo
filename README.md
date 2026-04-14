# F5 AI customer service — demo

Full-stack POC: customer self-service chat, escalation to humans, and an agent workspace with separate internal vs customer-visible messaging. Persistence is PostgreSQL on [Neon](https://neon.tech); deploy targets [Vercel](https://vercel.com).

## Stack

| Area | Technologies |
|------|----------------|
| **App & UI** | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Base UI / CVA (shadcn-style) · Lucide |
| **AI** | Vercel AI SDK 6 · OpenAI (via AI SDK) · Zod |
| **Data** | Prisma 7 · PostgreSQL (Neon) · `@prisma/adapter-neon` · pooled `DATABASE_URL` + direct `DIRECT_URL` for migrations |
| **Content** | react-markdown · remark-gfm |
| **Testing & media** | Playwright (e2e) · Remotion 4 (walkthrough video) · ElevenLabs (voice-over scripts) |
| **Tooling** | pnpm · ESLint |

Architecture, agents, and data model notes live in [`AGENTS.md`](./AGENTS.md).

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) (see `packageManager` in `package.json`)
- A Neon (or other Postgres) project — copy **pooled** and **direct** connection strings from the Neon console

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env: DATABASE_URL (pooled), DIRECT_URL (direct), OPENAI_API_KEY, optional ElevenLabs / demo video URL
pnpm exec prisma migrate deploy
pnpm db:seed   # optional demo customers/invoices
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

Set the same env vars as in `.env.example` (at minimum `DATABASE_URL`, `DIRECT_URL`, `OPENAI_API_KEY`). The default build command runs `prisma generate`, `prisma migrate deploy`, then `next build`.

## Demo video — background music

After you render the MP4 (`pnpm demo:render` or `pnpm showcase:full`), mix **Creative Minds** from Bensound under the voiceover with **ffmpeg** (music stays low so narration is clear).

1. Place **`bensound-creativeminds.mp3`** at the **repository root** (same folder as `package.json`).
2. With [ffmpeg](https://ffmpeg.org/) on your `PATH`, run **one** of these from the repo root:

   ```bash
   ./mix-demo-music
   ```

   ```bash
   pnpm mix-demo-music
   ```

   ```bash
   node scripts/mix-demo-music.mjs
   ```

   (First time: `chmod +x mix-demo-music` so the standalone script is executable.)

   This reads `remotion-out/f5-demo.mp4`, loops the bed track at low volume, and writes **`remotion-out/f5-demo-with-music.mp4`**. Override paths or level if needed:

   ```bash
   ./mix-demo-music -- --video remotion-out/f5-demo.mp4 --out remotion-out/f5-demo-with-music-custom.mp4
   MUSIC_VOLUME=0.05 ./mix-demo-music
   ```

**Royalty Free Music:** [Bensound.com](https://www.bensound.com)

**License code:** VGBKV94ABCICTAH6

**Artist:** Benjamin Tissot

## License

Private / demo — see repository settings.
