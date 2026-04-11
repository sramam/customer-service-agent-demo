import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { DemoVideo } from "@/components/landing/demo-video";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  ExternalLink,
  Headset,
  Layers,
  MessageSquare,
  Shield,
  Sparkles,
} from "lucide-react";

const SOURCE_REPO_URL = "https://github.com/sramam/customer-service-agent-demo";

export const metadata: Metadata = {
  title: "F5 AI customer service — demo",
  description:
    "Human-supervised, AI-built full-stack customer service demo: self-service, escalation, agent workspace, Remotion video with ElevenLabs voice-over.",
};

export default function HomePage() {
  const embedUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <header className="mb-12 text-center md:mb-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Demo project
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            AI-assisted customer service with human escalation
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600">
            A full-stack agent where customers self-serve technical and account questions from
            trusted sources. Changes to systems of record escalate to people—for accuracy and
            commercial follow-up—while the agent workspace keeps internal documents separate from
            anything sent to the customer.
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
                <strong className="text-slate-900">Customer</strong> chat grounded in public
                documentation—with citations—and read-only account views.
              </span>
            </li>
            <li className="flex gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong className="text-slate-900">Escalation</strong> when a change needs a human;
                the agent sees profile, products, and context in one place.
              </span>
            </li>
            <li className="flex gap-3">
              <Headset className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                <strong className="text-slate-900">Agent + employee AI</strong> with internal
                notes and an editable, auto-formed customer reply—internal text never ships by
                accident.
              </span>
            </li>
          </ul>
        </section>

        <section className="mb-12 md:mb-14">
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
                Vercel AI SDK 6 · OpenAI (via AI SDK) · Zod
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-medium text-slate-900">Data</h3>
              <p className="text-slate-600">
                Prisma 7 · SQLite · better-sqlite3 (Prisma adapter)
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
              <h3 className="mb-1.5 font-medium text-slate-900">Tooling</h3>
              <p className="text-slate-600">pnpm · ESLint</p>
            </div>
          </div>
        </section>

        <section className="mb-12 md:mb-14">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Walkthrough
          </h2>
          <DemoVideo embedUrl={embedUrl} />
          <p className="mt-3 text-center text-xs text-slate-500">
            {embedUrl ? (
              <>
                Video is embedded from your configured URL (e.g. YouTube). For local MP4-only
                playback, unset <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL</code> and add{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">public/f5-demo.mp4</code> via{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">pnpm demo:publish-video</code>.
              </>
            ) : (
              <>
                Locally, <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">pnpm showcase:full</code> copies the MP4 to{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">public/f5-demo.mp4</code>. For Vercel or Cloudflare, set{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">NEXT_PUBLIC_DEMO_VIDEO_EMBED_URL</code> to a YouTube embed URL instead of shipping a large file.
              </>
            )}
          </p>
        </section>

        <section className="mb-12 md:mb-14">
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

        <section className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-8 py-10 text-center">
          <h2 className="text-lg font-semibold text-emerald-950">Try it yourself</h2>
          <p className="max-w-md text-sm leading-relaxed text-slate-600">
            Open the interactive split view: customer on the left, agent tools on the right—same
            flow as in the recording (requires{" "}
            <code className="text-slate-700">OPENAI_API_KEY</code>).
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
