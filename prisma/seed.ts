import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma";
import path from "node:path";

const adapter = new PrismaBetterSqlite3({
  url: "file:" + path.join(__dirname, "dev.db"),
});
const prisma = new PrismaClient({ adapter });

interface CustomerSeed {
  email: string;
  name: string;
  company: string;
  status: string;
  planTier: string;
  supportTier: string;
  products: string[];
  invoices: {
    invoiceNumber: string;
    amountCents: number;
    periodStart: string;
    periodEnd: string;
    issuedAt: string;
    pdfKey: string;
    lineItems: string;
  }[];
}

const customers: CustomerSeed[] = [
  {
    email: "alice@acmecorp.com",
    name: "Alice Chen",
    company: "Acme Corp",
    status: "active",
    planTier: "enterprise",
    supportTier: "premium",
    products: [
      "BIG-IP LTM",
      "BIG-IP ASM",
      "NGINX One",
      "Distributed Cloud WAAP",
    ],
    invoices: [
      {
        invoiceNumber: "INV-F5-2026-0312",
        amountCents: 1250000,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        issuedAt: "2026-04-01",
        pdfKey: "invoices/mock/alice-2026-03.pdf",
        lineItems:
          "BIG-IP VE License (Enterprise) $8,000 | NGINX One $2,500 | Distributed Cloud WAAP $1,500 | Premium Support $500",
      },
      {
        invoiceNumber: "INV-F5-2026-0201",
        amountCents: 1250000,
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        issuedAt: "2026-03-01",
        pdfKey: "invoices/mock/alice-2026-02.pdf",
        lineItems:
          "BIG-IP VE License (Enterprise) $8,000 | NGINX One $2,500 | Distributed Cloud WAAP $1,500 | Premium Support $500",
      },
      {
        invoiceNumber: "INV-F5-2026-0115",
        amountCents: 1250000,
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        issuedAt: "2026-02-01",
        pdfKey: "invoices/mock/alice-2026-01.pdf",
        lineItems:
          "BIG-IP VE License (Enterprise) $8,000 | NGINX One $2,500 | Distributed Cloud WAAP $1,500 | Premium Support $500",
      },
    ],
  },
  {
    email: "bob@globallogistics.io",
    name: "Bob Martinez",
    company: "Global Logistics Inc",
    status: "active",
    planTier: "business",
    supportTier: "standard",
    products: ["BIG-IP LTM", "SSL Orchestrator"],
    invoices: [
      {
        invoiceNumber: "INV-F5-2026-0318",
        amountCents: 650000,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        issuedAt: "2026-04-01",
        pdfKey: "invoices/mock/bob-2026-03.pdf",
        lineItems:
          "BIG-IP LTM License (Business) $4,000 | SSL Orchestrator $2,200 | Standard Support $300",
      },
      {
        invoiceNumber: "INV-F5-2026-0218",
        amountCents: 650000,
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        issuedAt: "2026-03-01",
        pdfKey: "invoices/mock/bob-2026-02.pdf",
        lineItems:
          "BIG-IP LTM License (Business) $4,000 | SSL Orchestrator $2,200 | Standard Support $300",
      },
    ],
  },
  {
    email: "carla@nordikbank.se",
    name: "Carla Johansson",
    company: "Nordik Bank AB",
    status: "active",
    planTier: "enterprise",
    supportTier: "premium",
    products: [
      "Distributed Cloud WAAP",
      "NGINX App Protect",
      "F5 DNS",
      "NGINX One",
    ],
    invoices: [
      {
        invoiceNumber: "INV-F5-2026-0322",
        amountCents: 1800000,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        issuedAt: "2026-04-01",
        pdfKey: "invoices/mock/carla-2026-03.pdf",
        lineItems:
          "Distributed Cloud WAAP $5,500 | NGINX App Protect $4,000 | F5 DNS (GTM) $3,500 | NGINX One $2,500 | Premium Support $2,500",
      },
      {
        invoiceNumber: "INV-F5-2026-0222",
        amountCents: 1800000,
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        issuedAt: "2026-03-01",
        pdfKey: "invoices/mock/carla-2026-02.pdf",
        lineItems:
          "Distributed Cloud WAAP $5,500 | NGINX App Protect $4,000 | F5 DNS (GTM) $3,500 | NGINX One $2,500 | Premium Support $2,500",
      },
      {
        invoiceNumber: "INV-F5-2026-0122",
        amountCents: 1600000,
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        issuedAt: "2026-02-01",
        pdfKey: "invoices/mock/carla-2026-01.pdf",
        lineItems:
          "Distributed Cloud WAAP $5,500 | NGINX App Protect $4,000 | F5 DNS (GTM) $3,500 | NGINX One $2,500 | Premium Support $500",
      },
    ],
  },
  {
    email: "david@startuplab.dev",
    name: "David Park",
    company: "StartupLab",
    status: "active",
    planTier: "starter",
    supportTier: "basic",
    products: ["NGINX One"],
    invoices: [
      {
        invoiceNumber: "INV-F5-2026-0305",
        amountCents: 250000,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        issuedAt: "2026-04-01",
        pdfKey: "invoices/mock/david-2026-03.pdf",
        lineItems: "NGINX One Subscription $2,500",
      },
      {
        invoiceNumber: "INV-F5-2026-0205",
        amountCents: 250000,
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        issuedAt: "2026-03-01",
        pdfKey: "invoices/mock/david-2026-02.pdf",
        lineItems: "NGINX One Subscription $2,500",
      },
    ],
  },
  {
    email: "elena@medicohealth.eu",
    name: "Elena Rossi",
    company: "Medico Health Systems",
    status: "active",
    planTier: "enterprise",
    supportTier: "premium",
    products: ["BIG-IP LTM", "BIG-IP APM", "BIG-IQ", "SSL Orchestrator"],
    invoices: [
      {
        invoiceNumber: "INV-F5-2026-0330",
        amountCents: 2200000,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        issuedAt: "2026-04-01",
        pdfKey: "invoices/mock/elena-2026-03.pdf",
        lineItems:
          "BIG-IP VE License (Enterprise) $8,000 | BIG-IP APM (500 sessions) $5,000 | BIG-IQ Centralized Mgmt $4,500 | SSL Orchestrator $3,000 | Premium Support $1,500",
      },
      {
        invoiceNumber: "INV-F5-2026-0228",
        amountCents: 2200000,
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        issuedAt: "2026-03-01",
        pdfKey: "invoices/mock/elena-2026-02.pdf",
        lineItems:
          "BIG-IP VE License (Enterprise) $8,000 | BIG-IP APM (500 sessions) $5,000 | BIG-IQ Centralized Mgmt $4,500 | SSL Orchestrator $3,000 | Premium Support $1,500",
      },
      {
        invoiceNumber: "INV-F5-2026-0131",
        amountCents: 2200000,
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        issuedAt: "2026-02-01",
        pdfKey: "invoices/mock/elena-2026-01.pdf",
        lineItems:
          "BIG-IP VE License (Enterprise) $8,000 | BIG-IP APM (500 sessions) $5,000 | BIG-IQ Centralized Mgmt $4,500 | SSL Orchestrator $3,000 | Premium Support $1,500",
      },
    ],
  },
];

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.customerAccount.deleteMany();

  for (const c of customers) {
    const account = await prisma.customerAccount.create({
      data: {
        email: c.email,
        name: c.name,
        company: c.company,
        products: c.products.join(", "),
        status: c.status,
        planTier: c.planTier,
        supportTier: c.supportTier,
      },
    });

    await prisma.invoice.createMany({
      data: c.invoices.map((inv) => ({
        accountId: account.id,
        invoiceNumber: inv.invoiceNumber,
        amountCents: inv.amountCents,
        currency: "USD",
        periodStart: new Date(inv.periodStart),
        periodEnd: new Date(inv.periodEnd),
        issuedAt: new Date(inv.issuedAt),
        pdfKey: inv.pdfKey,
      })),
    });

    console.log(
      `Seeded: ${c.email} (${c.company}) — ${c.products.join(", ")} — ${c.invoices.length} invoices`
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
