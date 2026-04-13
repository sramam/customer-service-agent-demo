import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  DemoVideo,
  isDemoVideoEmbedFromEnv,
  resolveDemoVideoEmbedUrl,
} from "@/components/landing/demo-video";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ExternalLink,
  Headset,
  Layers,
  MessageSquare,
  Radio,
  Shield,
  Sparkles,
} from "lucide-react";

const SOURCE_REPO_URL = "https://github.com/sramam/customer-service-agent-demo";

export const metadata: Metadata = {
  title: "F5 AI customer service — demo",
  description:
    "Two-lane AI demo: customer chat from public docs + read-only account data, structured escalation, and an agent workspace with employee AI (internal notes + reviewed customer draft). Thread sync via PartyKit or polling. Neon + AI SDK 6.",
};

export default function HomePage() {
  const embedUrl = resolveDemoVideoEmbedUrl();
  const embedFromEnv = isDemoVideoEmbedFromEnv();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <header className="mb-12 text-center md:mb-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Demo project
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Two-lane AI: customer self-service and an agent copilot
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600">
            <strong className="font-medium text-slate-800">Customer AI</strong> answers from public
            product documentation and read-only account tools—never mutating billing or
            subscriptions. <strong className="font-medium text-slate-800">Employee AI</strong>{" "}
            backs the human with internal runbooks plus read/write account tools, and always
            separates <strong className="font-medium text-slate-800">internal notes</strong> from a{" "}
            <strong className="font-medium text-slate-800">draft customer reply</strong> the agent
            reviews before anything is sent. Escalation hands off in-thread with structured context.
          </p>
        </header>

        <aside className="mb-10 rounded-2xl border border-violet-200 bg-violet-50/80 px-5 py-4 md:mb-12">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" aria-hidden />
            <div className="space-y-2 text-sm leading-relaxed text-slate-700">
              <p className="font-semibold text-violet-900">
                100% of the code in this application and the walkthrough video were generated using
                AI—under constant human supervision.
              </p>
              <p className="text-slate-600">
                Development, UI, agents, automation, and the Remotion pipeline were built with AI
                assistance; direction, review, and quality were guided throughout by a human.
                Voice-over for the demo video uses{" "}
                <strong className="text-slate-800">ElevenLabs</strong> text-to-speech.
              </p>
            </div>
          </div>
        </aside>

        <section className="mb-10 space-y-4 text-slate-700 md:mb-14">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            What you&apos;ll see
          </h2>
          <ul className="space-y-3 text-sm leading-relaxed">
            <li className="flex gap-3">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <span>
                <strong className="text-slate-900">Customer AI</strong> — search public product
                docs (optional product-line focus), read-only account and invoice views, inline
                citations, and suggested chips that send as the customer&apos;s next message when
                tapped.
              </span>
            </li>
            <li className="flex gap-3">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <span>
                <strong className="text-slate-900">Documentation</strong> — markdown sources under{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                  content/docs
                </code>
                ; agents can list product areas and narrow search so answers stay on-topic.
              </span>
            </li>
            <li className="flex gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong className="text-slate-900">Escalation</strong> — structured handoff
                (summary, products involved, agent context) into the same chat; the dashboard
                surfaces escalated threads without a sidebar rail.
              </span>
            </li>
            <li className="flex gap-3">
              <Headset className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                <strong className="text-slate-900">Agent workspace + employee AI</strong> — public
                and <em>internal</em> docs plus account tools; responses split into{" "}
                <strong className="text-slate-900">internal notes</strong> and a{" "}
                <strong className="text-slate-900">draft customer reply</strong> the human edits and
                sends. Nothing internal goes to the customer unless it is copied into that draft.
              </span>
            </li>
            <li className="flex gap-3">
              <Radio className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span>
                <strong className="text-slate-900">Live thread sync</strong> — the agent view stays
                current after customer messages and approved replies:{" "}
                <strong className="text-slate-900">PartyKit</strong> WebSockets when{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                  NEXT_PUBLIC_PARTYKIT_HOST
                </code>{" "}
                is set, otherwise automatic polling (~3s) plus refetch when you return to the tab.
                Same-tab split view also fires an instant refresh so the agent column doesn&apos;t wait
                on the network.
              </span>
            </li>
          </ul>
        </section>

        <section className="mb-12 md:mb-14">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Walkthrough
          </h2>
          <DemoVideo embedUrl={embedUrl} />
          <p className="mt-3 text-center text-xs text-slate-500">
            {embedUrl ? (
              embedFromEnv ? (
                <>
                  Video is embedded from{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL</code>. For local MP4-only
                  playback, run <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">pnpm dev</code> without that env and add{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">public/f5-demo.mp4</code> via{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">pnpm demo:publish-video</code>.
                </>
              ) : (
                <>
                  Production uses the hosted YouTube walkthrough by default. Set{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL</code> to override.
                </>
              )
            ) : (
              <>
                Locally, <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">pnpm showcase:full</code> copies the MP4 to{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">public/f5-demo.mp4</code>, or set{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL</code> to a YouTube embed URL.
              </>
            )}
          </p>
        </section>

        <section className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-8 py-10 text-center">
          <h2 className="text-lg font-semibold text-emerald-950">Try it yourself</h2>
          <p className="max-w-md text-sm leading-relaxed text-slate-600">
            Open the interactive split view at <strong className="text-slate-800">/customer</strong>:
            customer chat on the left, agent column on the right (escalation list, thread, employee
            AI, draft review). Requires{" "}
            <code className="text-slate-700">OPENAI_API_KEY</code> and a Neon{" "}
            <code className="text-slate-700">DATABASE_URL</code> (see{" "}
            <code className="text-slate-700">.env.example</code>). Omitting PartyKit env vars still
            works; you get polling-based sync instead of WebSockets.
          </p>
          <Link
            href="/customer"
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
            )}
          >
            Launch interactive demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="mt-12 md:mt-14 mb-12 md:mb-14">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            <BarChart3 className="h-4 w-4 text-slate-500" aria-hidden />
            Token economics
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            Approximate language-model token usage attributed to building this demo (development
            iterations, refactors, and tooling)—illustrative of cost structure when shipping with AI.
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-slate-600">
                    Input tokens
                  </th>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    5,740,089
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-slate-600">
                    Output tokens
                  </th>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    670,863
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-slate-600">
                    Input cached tokens
                  </th>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    106,106,448
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            <Layers className="h-4 w-4 text-slate-500" aria-hidden />
            Tech stack
          </h2>
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700 shadow-sm">
            <div>
              <h3 className="mb-1.5 font-medium text-slate-900">App &amp; UI</h3>
              <p className="text-slate-600">
                Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn-style UI (Base UI, CVA) ·
                Lucide icons
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-medium text-slate-900">AI &amp; validation</h3>
              <p className="text-slate-600">
                Vercel AI SDK 6 · OpenAI (via AI SDK) · optional Anthropic fallback (
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                  ANTHROPIC_API_KEY
                </code>
                ) · Zod tool schemas (<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">inputSchema</code>)
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-medium text-slate-900">Live sync</h3>
              <p className="text-slate-600">
                Always on: PartyKit when configured, else polling · PartyKit dev/deploy (
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">pnpm party:dev</code>
                ) · same-tab <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">f5-conversation-messages-updated</code> event for instant agent refresh
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-medium text-slate-900">Data</h3>
              <p className="text-slate-600">
                Prisma 7 · PostgreSQL on Neon ·{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                  @prisma/adapter-neon
                </code>{" "}
                (pooled{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                  DATABASE_URL
                </code>
                , direct{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                  DIRECT_URL
                </code>{" "}
                for migrations) · one shared database for local dev and production in this POC
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-medium text-slate-900">Content</h3>
              <p className="text-slate-600">react-markdown · remark-gfm</p>
            </div>
            <div>
              <h3 className="mb-1.5 font-medium text-slate-900">Testing &amp; demo media</h3>
              <p className="text-slate-600">
                Playwright (e2e) · Remotion 4 (walkthrough video) · ElevenLabs (voice-over)
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-medium text-slate-900">Hosting &amp; tooling</h3>
              <p className="text-slate-600">
                Vercel (deploy) · same env pattern as <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">.env</code> — Neon URLs, OpenAI key · pnpm · ESLint
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-slate-200 pt-8 text-center text-xs text-slate-500">
          <p className="mb-4">
            <a
              href={SOURCE_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 font-medium text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              <span>Source: sramam/customer-service-agent-demo</span>
            </a>
          </p>
          <p>
            Standalone routes:{" "}
            <Link href="/customer/standalone" className="text-emerald-700 underline-offset-2 hover:underline">
              customer-only chat
            </Link>
            {" · "}
            <Link href="/agent" className="text-emerald-700 underline-offset-2 hover:underline">
              agent dashboard
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
