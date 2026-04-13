GET /api/conversations 200 in 490ms (next.js: 826µs, application-code: 489ms)
 GET /api/conversations 200 in 497ms (next.js: 1004µs, application-code: 496ms)
 GET /api/conversations 200 in 478ms (next.js: 980µs, application-code: 477ms)
 GET /api/conversations 200 in 494ms (next.js: 1728µs, application-code: 492ms)
 GET /api/conversations 200 in 556ms (next.js: 47ms, application-code: 509ms)
 GET /customer 200 in 133ms (next.js: 4ms, application-code: 129ms)
 GET /api/conversations/customer?email=david%40startuplab.dev 200 in 206ms (next.js: 27ms, application-code: 179ms)
 GET /api/conversations/customer?email=david%40startuplab.dev 200 in 105ms (next.js: 2ms, application-code: 103ms)
 GET /api/conversations/cmnx15104000xs2xy42ybtybq/customer-messages 200 in 159ms (next.js: 4ms, application-code: 155ms)
 POST /api/chat 200 in 6.7s (next.js: 4ms, application-code: 6.7s)
 GET /api/conversations/cmnx15104000xs2xy42ybtybq/customer-messages 200 in 188ms (next.js: 12ms, application-code: 176ms)
 GET /api/conversations/cmnx15104000xs2xy42ybtybq/customer-messages 200 in 416ms (next.js: 5ms, application-code: 411ms)
 POST /api/chat 200 in 7.4s (next.js: 3ms, application-code: 7.4s)
 GET /api/conversations/cmnx15104000xs2xy42ybtybq/customer-messages 200 in 163ms (next.js: 5ms, application-code: 158ms)
 GET /api/conversations 200 in 442ms (next.js: 4ms, application-code: 438ms)
 GET /api/conversations 200 in 524ms (next.js: 5ms, application-code: 519ms)
 GET /api/conversations 200 in 758ms (next.js: 1975µs, application-code: 756ms)
 GET /api/conversations 200 in 766ms (next.js: 3ms, application-code: 763ms)
{
  type: 'error',
  sequence_number: 2,
  error: {
    type: 'server_error',
    code: 'server_error',
    message: 'An error occurred while processing your request. You can retry your request, or contact us through our help center at help.openai.com if the error persists. Please include the request ID req_a3a0cee17cc6445da19701e23cfeb0f1 in your message.',
    param: null
  }
}
 POST /api/agent-chat 200 in 2.9s (next.js: 3ms, application-code: 2.9s)
 GET /api/conversations 200 in 480ms (next.js: 750µs, application-code: 479ms)
 GET /api/conversations 200 in 485ms (next.js: 1132µs, application-code: 484ms)
 GET /api/conversations 200 in 480ms (next.js: 966µs, application-code: 479ms)
 GET /api/conversations 200 in 483ms (next.js: 1090µs, application-code: 482ms)
 GET /api/conversations 200 in 484ms (next.js: 1551µs, application-code: 483ms)
 GET /api/conversations 200 in 502ms (next.js: 787µs, application-code: 501ms)
 GET /api/conversations 200 in 474ms (next.js: 1679µs, application-code: 472ms)
 GET /api/conversations 200 in 484ms (next.js: 856µs, application-code: 483ms)
 GET /api/conversations 200 in 468ms (next.js: 1896µs, application-code: 466ms)
 GET /api/conversations 200 in 495ms (next.js: 1938µs, application-code: 493ms)
 GET /api/conversations 200 in 500ms (next.js: 5ms, application-code: 495ms)
 GET /api/conversations 200 in 482ms (next.js: 877µs, application-code: 481ms)
 GET /api/conversations 200 in 472ms (next.js: 1784µs, application-code: 471ms)
 GET /api/conversations 200 in 463ms (next.js: 1292µs, application-code: 461ms)
 GET /api/conversations 200 in 477ms (next.js: 1445µs, application-code: 475ms)
 GET /api/conversations 200 in 492ms (next.js: 1543µs, application-code: 490ms)
# INTERNAL ONLY — Pricing touchpoints & fulfillment timelines

**Classification:** Support / Sales ops reference — **not customer-shippable**

## Purpose

Give agents **internal** guidance on how pricing is determined, where to look up amounts on the account, and **typical** time-to-ship / time-to-deploy expectations by product family. Exact customer quotes always go through approved commercial paths; numbers here are **orientation and SLA-style targets** for this demo environment unless otherwise noted.

## Account & invoice data (demo)

- **Source of truth for billed amounts:** `CustomerAccount` + `Invoice` in the demo DB — use **getAccountInfo** / **listInvoices** and cite invoice lines in internal notes when comparing to policy.
- **Do not** invent dollar figures for customers; use tools or say “I’ll confirm against your invoice / contract.”

## Product families — pricing model (internal summary)

| Product / line | How price is usually set | Notes |
|----------------|-------------------------|--------|
| **BIG-IP (appliances & VE)** | Per-SKU list + discount schedule; hardware BOM drives appliance quotes | RMA / replacement may use different entitlement rules — check runbook-account-changes. |
| **BIG-IQ** | Subscription tied to managed device counts / service tiers | Often bundled in enterprise agreements. |
| **NGINX One** | Subscription (tier × term); add-ons (e.g. App Protect) priced per doc | Align **planTier** / products on account with SKU sheet before quoting deltas. |
| **NGINX App Protect** | Add-on to NGINX data plane; signature update cadence may affect support tier | Not a separate “box” — entitlement on subscription. |
| **F5 Distributed Cloud (XC)** | **Custom quote** — base + metered (WAAP, LB, mesh, etc.) | Never quote firm totals in chat without CPQ / approved calculator output. |
| **Professional services** | SOW / time & materials | Scoped separately from product subscription. |

## Time to ship — physical goods

| Item | Typical internal window | Depends on |
|------|-------------------------|------------|
| **BIG-IP appliance (new hardware)** | **4–10 business days** from PO / allocation to ship-to dock (region-dependent) | Stock, export compliance, ship-to country |
| **Spare / FRU (field replaceable)** | **2–6 business days** | Parts depot, severity (e.g. production-down) |
| **RMA return labels** | **1–3 business days** to generate | Ticket completeness |

**Agent guidance:** Give customers **ranges or next milestone** (“we’ll confirm ship window once the order is released”) — not a guaranteed calendar date unless logistics has confirmed.

## Time to deploy — software & cloud

| Offering | Typical “live” window | Notes |
|----------|-------------------------|--------|
| **VE / software license key / entitlement** | **Same day – 2 business days** after entitlement appears in system | Customer-side install/HA still on them. |
| **BIG-IQ license pool / device onboarding** | **1–3 business days** for clean installs | Longer if discovery / firewall change windows apply. |
| **NGINX One / App Protect (subscription)** | **Effective date** usually next billing boundary or **immediate** on upgrade path per policy | Use account + internal approval for mid-cycle proration. |
| **F5 Distributed Cloud (XC)** | **Provisioning:** often **1–5 business days** for standard tenants; **custom** networking / certs can extend | Coordinate with specialist queue; do not promise go-live until runbook checks pass. |

## What to say externally (customer-safe)

- Paraphrase **ranges** and **next steps** (“we’ll confirm effective date / ship date and follow up in this thread”).
- **Never** paste internal SKU codes, discount bands, or unreleased roadmap pricing.
- For **XC custom quotes**, keep scoping questions in customer voice (regions, apps, WAAP vs connectivity) — see public + account context; internal numbers stay in **INTERNAL NOTES** only.

## Related internal docs

- `runbook-account-changes.md` — credits, tier changes, approvals  
- `incident-triage-codes.md` — severity when production timelines slip  
