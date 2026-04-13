/**
 * Public product documentation areas — used to filter search and for listPublicProductDocs.
 */
export const PUBLIC_PRODUCT_DOC_OPTIONS = [
  {
    id: "BIG_IP",
    label: "BIG-IP (LTM, ASM/WAF, AFM)",
    files: ["big-ip-overview.md"],
  },
  {
    id: "NGINX_ONE",
    label: "NGINX One",
    files: ["nginx-one.md"],
  },
  {
    id: "NGINX_APP_PROTECT",
    label: "NGINX App Protect (WAF & bot defense)",
    files: ["nginx-app-protect.md"],
  },
  {
    id: "DISTRIBUTED_CLOUD",
    label: "F5 Distributed Cloud (XC)",
    files: ["distributed-cloud.md"],
  },
  {
    id: "F5_DNS",
    label: "F5 DNS (GTM)",
    files: ["f5-dns.md"],
  },
  {
    id: "SSL_ORCHESTRATOR",
    label: "SSL Orchestrator",
    files: ["ssl-orchestrator.md"],
  },
  {
    id: "BIG_IQ",
    label: "BIG-IQ Centralized Management",
    files: ["big-iq-management.md"],
  },
  {
    id: "APM",
    label: "Access Policy Manager (APM)",
    files: ["access-policy-manager.md"],
  },
] as const;

export const PUBLIC_PRODUCT_FOCUS_IDS = PUBLIC_PRODUCT_DOC_OPTIONS.map(
  (o) => o.id,
);

/** Values for `searchPublicDocs.productFocus` (ANY = search all public files). */
export const PUBLIC_PRODUCT_SEARCH_FOCUS = [
  "ANY",
  ...PUBLIC_PRODUCT_FOCUS_IDS,
] as const;

export type PublicProductFocusId =
  | (typeof PUBLIC_PRODUCT_DOC_OPTIONS)[number]["id"]
  | "ANY";

/** Filenames to search when focusing; `null` means all public files; `[]` means unknown focus. */
export function filesForPublicProductFocus(
  focus: string | undefined,
): string[] | null {
  if (!focus || focus === "ANY") return null;
  const entry = PUBLIC_PRODUCT_DOC_OPTIONS.find((o) => o.id === focus);
  if (!entry) return [];
  return [...entry.files];
}

export function formatPublicDocCatalog(): string {
  const lines = [
    "Available **public** product documentation (use `productFocus` on searchPublicDocs to narrow, or ANY / omit for all):",
    "",
  ];
  for (const o of PUBLIC_PRODUCT_DOC_OPTIONS) {
    lines.push(`- **${o.id}** — ${o.label}: \`${o.files.join("`, `")}\``);
  }
  lines.push("");
  lines.push(
    "Use **listPublicProductDocs** to show this catalog in conversation. Match the customer’s product to a focus when searching.",
  );
  return lines.join("\n");
}
