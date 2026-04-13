/** No heartbeat / takeover after this — another previewer can claim the profile. */
export const DEMO_CLAIM_STALE_MS = 300_000;

/** Client should PUT before this elapses to refresh the claim. */
export const DEMO_CLAIM_HEARTBEAT_MS = 120_000;
