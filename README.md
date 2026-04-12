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

## License

Private / demo — see repository settings.
