# Demo video asset

Prerequisites (repo root): `pnpm install`, database seeded (`pnpm db:seed`), and `OPENAI_API_KEY` in `.env` (loaded automatically for Playwright via `dotenv` in `playwright.config.ts`).

1. One command — record, copy WebM here, and render **`../remotion-out/f5-demo.mp4`**:

   ```bash
   pnpm exec playwright install chromium   # once per machine
   pnpm showcase:full
   ```

   For a clean DB and empty conversations before recording:

   ```bash
   pnpm showcase:fresh
   ```

   Or record + copy only (open Remotion Studio separately to tune overlays):

   ```bash
   pnpm showcase
   ```

2. **`playwright-demo.webm`** in this folder is produced automatically by `pnpm showcase`. If you ran `pnpm demo:e2e` only, copy the newest `.webm` from `test-results/` here under that name.

3. Open Remotion Studio (from repo root or `remotion/`):

   ```bash
   pnpm demo:studio
   # or: pnpm --dir remotion dev
   ```

4. Adjust overlay timings in `remotion/src/scenes.ts` so titles match what happens on screen.

5. Set `MAX_DURATION_FRAMES` in `remotion/src/Root.tsx` to match your clip length (seconds × fps).

6. If you used `pnpm showcase` only, render MP4 with:

   ```bash
   pnpm showcase -- --skip-record --render
   ```

   Or after Studio / manual tweaks:

   ```bash
   mkdir -p remotion-out
   pnpm demo:render
   ```
