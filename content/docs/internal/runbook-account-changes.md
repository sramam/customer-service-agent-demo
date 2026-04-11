# INTERNAL ONLY — Account modification runbook

**Classification:** Engineering / Support operations — **not customer-shippable**

## Purpose

Step-by-step procedures for agents when changing account state in source systems. This document may reference internal tools, ticket queues, and escalation paths that **must not** be pasted verbatim to customers.

## Change types

1. **Plan tier changes:** verify ARR impact in CPQ; open finance approval if discount exceeds threshold.
2. **Write-off / credit:** requires `FIN-CREDIT` approval in ServiceNow; attach invoice IDs.
3. **Emergency suspension:** follow incident bridge protocol; document command references in internal wiki only.

## Systems of record (mock in demo)

- Billing: mock Prisma `CustomerAccount` + `Invoice` tables
- Real production would integrate with SAP / Zuora / etc. — **never expose internal system names or URLs to customers** unless approved by comms.

## Customer-safe phrasing

When confirming an internal action to the customer, use approved templates from the customer-facing KB. Do not forward internal ticket numbers, employee-only dashboards, or unreleased roadmap details.
