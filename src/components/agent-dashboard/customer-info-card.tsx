"use client";

import type { CustomerInfo } from "@/lib/types";
import { ProductBadge } from "@/components/product-icon";
import {
  Building2,
  Mail,
  Shield,
  CreditCard,
  Calendar,
} from "lucide-react";

export function CustomerInfoCard({ customer }: { customer: CustomerInfo }) {
  const products = customer.products
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm" data-testid="demo-customer-info-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900">
              {customer.name}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
              {customer.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {customer.company}
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {customer.email}
            </span>
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {customer.planTier} / {customer.supportTier}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Since {customer.createdAt.slice(0, 10)}
            </span>
          </div>
        </div>
        {customer.latestInvoice && (
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-xs text-slate-500 justify-end">
              <CreditCard className="h-3 w-3" />
              Latest invoice
            </div>
            <div className="text-xs font-medium text-slate-700">
              {customer.latestInvoice.amount}
            </div>
            <div className="text-[10px] text-slate-400">
              {customer.latestInvoice.invoiceNumber}
            </div>
          </div>
        )}
      </div>
      {products.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {products.map((p) => (
            <ProductBadge key={p} name={p} size="xs" />
          ))}
        </div>
      )}
    </div>
  );
}
