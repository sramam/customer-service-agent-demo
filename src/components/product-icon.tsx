"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

type Brand = "f5" | "nginx";

interface ProductMeta {
  brand: Brand;
  bg: string;
  text: string;
  border: string;
}

const PRODUCT_MAP: Record<string, ProductMeta> = {
  "BIG-IP LTM": { brand: "f5", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "BIG-IP ASM": { brand: "f5", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "BIG-IP AFM": { brand: "f5", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "BIG-IP APM": { brand: "f5", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  "BIG-IQ": { brand: "f5", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "SSL Orchestrator": { brand: "f5", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "F5 DNS": { brand: "f5", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  "NGINX One": { brand: "nginx", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "NGINX App Protect": { brand: "nginx", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  "Distributed Cloud WAAP": { brand: "f5", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

function fuzzyMatch(name: string): ProductMeta | null {
  const lower = name.toLowerCase();
  for (const [key, meta] of Object.entries(PRODUCT_MAP)) {
    if (lower.includes(key.toLowerCase())) return meta;
  }
  if (lower.includes("big-ip")) return PRODUCT_MAP["BIG-IP LTM"];
  if (lower.includes("nginx")) return PRODUCT_MAP["NGINX One"];
  if (lower.includes("distributed") || lower.includes("waap"))
    return PRODUCT_MAP["Distributed Cloud WAAP"];
  if (lower.includes("ssl") || lower.includes("orchestrator"))
    return PRODUCT_MAP["SSL Orchestrator"];
  if (lower.includes("dns") || lower.includes("gtm"))
    return PRODUCT_MAP["F5 DNS"];
  if (lower.includes("apm") || lower.includes("access"))
    return PRODUCT_MAP["BIG-IP APM"];
  if (lower.includes("big-iq") || lower.includes("bigiq"))
    return PRODUCT_MAP["BIG-IQ"];
  return null;
}

const FALLBACK: ProductMeta = {
  brand: "f5",
  bg: "bg-gray-50",
  text: "text-gray-600",
  border: "border-gray-200",
};

const LOGO_SRC: Record<Brand, string> = {
  f5: "/logos/f5.svg",
  nginx: "/logos/nginx.svg",
};

export function ProductBadge({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "xs";
}) {
  const meta = fuzzyMatch(name) ?? FALLBACK;
  const isXs = size === "xs";
  const iconSize = isXs ? 10 : 14;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        meta.bg,
        meta.text,
        meta.border,
        isXs ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      )}
    >
      <Image
        src={LOGO_SRC[meta.brand]}
        alt={meta.brand === "nginx" ? "NGINX" : "F5"}
        width={iconSize}
        height={iconSize}
        className="shrink-0"
      />
      {name}
    </span>
  );
}

export function getProductMeta(name: string) {
  return fuzzyMatch(name) ?? FALLBACK;
}
