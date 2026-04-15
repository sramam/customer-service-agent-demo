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

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Set on Vercel builds and runtime; hide local-dev-only copy (env names, scripts). */
const isVercelDeploy = process.env.VERCEL === "1";

export const metadata: Metadata = {
  title: "F5 AI customer service — demo",
  description:
    "Two-lane AI demo: customer chat from public docs + account data they can only read, structured escalation, and an agent workspace with employee AI (internal notes + reviewed customer draft). Thread sync via PartyKit or polling. Neon + AI SDK 6.",
};

export default function HomePage() {
  const embedUrl = resolveDemoVideoEmbedUrl();
  const embedFromEnv = isDemoVideoEmbedFromEnv();
  const showDevSetupCopy = !isVercelDeploy;

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
            product documentation and account tools they can only read from—never mutating billing or
            subscriptions. <strong className="font-medium text-slate-800">Employee AI</strong>{" "}
            backs the human with internal runbooks plus read/write account tools, and always
            separates <strong className="font-medium text-slate-800">internal notes</strong> from a{" "}
            <strong className="font-medium text-slate-800">draft customer reply</strong> the agent
            reviews before anything is sent. Escalation hands off in-thread with structured context.
          </p>
        </header>

        <section
          className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-6 shadow-lg md:mb-12"
          aria-labelledby="github-source-heading"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="flex gap-4">
              <GitHubMark className="h-11 w-11 shrink-0 text-white" />
              <div className="min-w-0 text-left">
                <p
                  id="github-source-heading"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Source code
                </p>
                <p className="mt-1 truncate font-mono text-base font-semibold text-white sm:text-lg">
                  sramam/customer-service-agent-demo
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  Browse the full repo—agents, UI, APIs, and demo media pipeline.
                </p>
              </div>
            </div>
            <a
              href={SOURCE_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "lg" }),
                "shrink-0 gap-2 border-0 bg-white text-slate-900 hover:bg-slate-100"
              )}
            >
              View on GitHub
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </section>

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
                docs (optional product-line focus), account and invoice views they can only read, linked
                sources, and suggested chips that send as the customer&apos;s next message when
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
                {showDevSetupCopy ? (
                  <>
                    <strong className="text-slate-900">PartyKit</strong> WebSockets when{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                      NEXT_PUBLIC_PARTYKIT_HOST
                    </code>{" "}
                    is set, otherwise automatic polling (~3s) plus refetch when you return to the tab.
                    Same-tab split view also fires an instant refresh so the agent column doesn&apos;t
                    wait on the network.
                  </>
                ) : (
                  <>
                    <strong className="text-slate-900">PartyKit</strong> WebSockets when configured,
                    otherwise automatic polling plus refetch when you return to the tab. Same-tab split
                    view also refreshes the agent column immediately.
                  </>
                )}
              </span>
            </li>
          </ul>
        </section>

        <section className="mb-12 md:mb-14">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Walkthrough
          </h2>
          <DemoVideo embedUrl={embedUrl} />
          {showDevSetupCopy ? (
            <p className="mt-3 text-center text-xs text-slate-500">
              {embedUrl ? (
                embedFromEnv ? (
                  <>
                    Video is embedded from{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                      NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL
                    </code>
                    . For local MP4-only playback, run{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                      pnpm dev
                    </code>{" "}
                    without that env and add{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                      public/f5-demo.mp4
                    </code>{" "}
                    via{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                      pnpm demo:publish-video
                    </code>
                    .
                  </>
                ) : (
                  <>
                    Production uses the hosted YouTube walkthrough by default. Set{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                      NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL
                    </code>{" "}
                    to override.
                  </>
                )
              ) : (
                <>
                  Locally,{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                    pnpm showcase:full
                  </code>{" "}
                  copies the MP4 to{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                    public/f5-demo.mp4
                  </code>
                  , or set{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                    NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL
                  </code>{" "}
                  to a YouTube embed URL.
                </>
              )}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-8 py-10 text-center">
          <h2 className="text-lg font-semibold text-emerald-950">Try it yourself</h2>
          <p className="max-w-md text-sm leading-relaxed text-slate-600">
            {showDevSetupCopy ? (
              <>
                Open the interactive split view at <strong className="text-slate-800">/customer</strong>:
                customer chat on the left, agent column on the right (escalation list, thread,
                employee AI, draft review). Requires{" "}
                <code className="text-slate-700">OPENAI_API_KEY</code> and a Neon{" "}
                <code className="text-slate-700">DATABASE_URL</code> (see{" "}
                <code className="text-slate-700">.env.example</code>). Omitting PartyKit env vars
                still works; you get polling-based sync instead of WebSockets.
              </>
            ) : (
              <>
                Open the interactive split view at <strong className="text-slate-800">/customer</strong>:
                customer chat on the left, agent column on the right (escalation list, thread,
                employee AI, draft review).
              </>
            )}
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
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tokens
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cost (USD)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-slate-600">
                    Input tokens
                  </th>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    17,603,947
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    $88.02
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-slate-600">
                    Output tokens
                  </th>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    1,851,308
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    $46.28
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-slate-600">
                    Input cached tokens
                  </th>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    311,163,351
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    $155.58
                  </td>
                </tr>
                <tr className="border-t border-slate-200 bg-slate-50/60 font-medium">
                  <th scope="row" className="px-4 py-3 text-left text-slate-800">
                    Total
                  </th>
                  <td className="px-4 py-3 text-right text-slate-500">—</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    $289.88
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
                {showDevSetupCopy ? (
                  <>
                    Vercel AI SDK 6 · OpenAI (via AI SDK) · optional Anthropic fallback (
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                      ANTHROPIC_API_KEY
                    </code>
                    ) · Zod tool schemas (
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                      inputSchema
                    </code>
                    )
                  </>
                ) : (
                  <>
                    Vercel AI SDK 6 · OpenAI (via AI SDK) · optional Anthropic fallback · Zod tool
                    schemas
                  </>
                )}
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-medium text-slate-900">Live sync</h3>
              <p className="text-slate-600">
                {showDevSetupCopy ? (
                  <>
                    Always on: PartyKit when configured, else polling · PartyKit dev/deploy (
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                      pnpm party:dev
                    </code>
                    ) · same-tab{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                      f5-conversation-messages-updated
                    </code>{" "}
                    event for instant agent refresh
                  </>
                ) : (
                  <>
                    PartyKit when configured, otherwise polling · same-tab events for instant agent
                    refresh when using the split view
                  </>
                )}
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-medium text-slate-900">Data</h3>
              <p className="text-slate-600">
                {showDevSetupCopy ? (
                  <>
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
                  </>
                ) : (
                  <>Prisma 7 · PostgreSQL on Neon · Prisma Neon driver adapter</>
                )}
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
                {showDevSetupCopy ? (
                  <>
                    Vercel (deploy) · same env pattern as{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                      .env
                    </code>{" "}
                    — Neon URLs, OpenAI key · pnpm · ESLint
                  </>
                ) : (
                  <>Vercel · pnpm · ESLint</>
                )}
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-slate-200 pt-8 text-center text-xs text-slate-500">
          <p>
            <a
              href={SOURCE_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              <GitHubMark className="h-3.5 w-3.5 shrink-0" />
              GitHub
            </a>
            <span className="mx-2 text-slate-300" aria-hidden>
              ·
            </span>
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
