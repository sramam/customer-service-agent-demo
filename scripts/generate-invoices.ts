import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

function generatePdf(lines: string[]): Buffer {
  const stream = [
    `2 0 obj\n<< /Length 0 >>\nstream\nBT\n/F1 12 Tf\n36 750 Td\n14 TL\n`,
  ];
  for (const line of lines) {
    stream.push(`(${line.replace(/[()\\]/g, "\\$&")}) '\n`);
  }
  stream.push("ET\nendstream\nendobj\n");

  const streamStr = stream.join("");
  const streamLength =
    streamStr.split("stream\n")[1]?.split("\nendstream")[0]?.length ?? 0;
  const correctedStream = streamStr.replace(
    /<< \/Length \d+ >>/,
    `<< /Length ${streamLength} >>`
  );

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n",
    correctedStream,
    "3 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n",
    "4 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 2 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let body = "";
  const offsets: number[] = [];
  const header = "%PDF-1.4\n";
  let pos = header.length;
  for (const obj of objects) {
    offsets.push(pos);
    body += obj;
    pos += obj.length;
  }

  const xrefPos = pos;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(header + body + xref + trailer);
}

interface InvoiceDef {
  file: string;
  lines: string[];
}

function makeInvoice(
  file: string,
  invNum: string,
  dateIssued: string,
  period: string,
  name: string,
  email: string,
  plan: string,
  lineItems: [string, string][],
  total: string
): InvoiceDef {
  const lines = [
    "F5 NETWORKS, INC.",
    "INVOICE",
    "",
    `Invoice Number: ${invNum}`,
    `Date Issued: ${dateIssued}`,
    `Billing Period: ${period}`,
    "",
    "Bill To:",
    `  ${name}`,
    `  ${email}`,
    `  ${plan}`,
    "",
    "Description                              Amount",
    "------------------------------------------------",
  ];
  for (const [desc, amt] of lineItems) {
    lines.push(`${desc.padEnd(40)}${amt}`);
  }
  lines.push(
    "------------------------------------------------",
    `Total${" ".repeat(39)}${total}`,
    "",
    "Payment Terms: Net 30",
    "Thank you for your business."
  );
  return { file, lines };
}

const invoices: InvoiceDef[] = [
  // ── Alice Chen (Acme Corp) — Enterprise/Premium ──
  makeInvoice("alice-2026-03.pdf",
    "INV-F5-2026-0312", "April 1, 2026", "March 1 - March 31, 2026",
    "Alice Chen", "alice@acmecorp.com", "Enterprise Plan - Premium Support",
    [["BIG-IP VE License (Enterprise)", "$8,000.00"], ["NGINX One Subscription", "$2,500.00"],
     ["Distributed Cloud - WAAP", "$1,500.00"], ["Premium Support", "$500.00"]],
    "$12,500.00"
  ),
  makeInvoice("alice-2026-02.pdf",
    "INV-F5-2026-0201", "March 1, 2026", "February 1 - February 28, 2026",
    "Alice Chen", "alice@acmecorp.com", "Enterprise Plan - Premium Support",
    [["BIG-IP VE License (Enterprise)", "$8,000.00"], ["NGINX One Subscription", "$2,500.00"],
     ["Distributed Cloud - WAAP", "$1,500.00"], ["Premium Support", "$500.00"]],
    "$12,500.00"
  ),
  makeInvoice("alice-2026-01.pdf",
    "INV-F5-2026-0115", "February 1, 2026", "January 1 - January 31, 2026",
    "Alice Chen", "alice@acmecorp.com", "Enterprise Plan - Premium Support",
    [["BIG-IP VE License (Enterprise)", "$8,000.00"], ["NGINX One Subscription", "$2,500.00"],
     ["Distributed Cloud - WAAP", "$1,500.00"], ["Premium Support", "$500.00"]],
    "$12,500.00"
  ),

  // ── Bob Martinez (Global Logistics) — Business/Standard ──
  makeInvoice("bob-2026-03.pdf",
    "INV-F5-2026-0318", "April 1, 2026", "March 1 - March 31, 2026",
    "Bob Martinez", "bob@globallogistics.io", "Business Plan - Standard Support",
    [["BIG-IP LTM License (Business)", "$4,000.00"], ["SSL Orchestrator", "$2,200.00"],
     ["Standard Support", "$300.00"]],
    "$6,500.00"
  ),
  makeInvoice("bob-2026-02.pdf",
    "INV-F5-2026-0218", "March 1, 2026", "February 1 - February 28, 2026",
    "Bob Martinez", "bob@globallogistics.io", "Business Plan - Standard Support",
    [["BIG-IP LTM License (Business)", "$4,000.00"], ["SSL Orchestrator", "$2,200.00"],
     ["Standard Support", "$300.00"]],
    "$6,500.00"
  ),

  // ── Carla Johansson (Nordik Bank) — Enterprise/Premium ──
  makeInvoice("carla-2026-03.pdf",
    "INV-F5-2026-0322", "April 1, 2026", "March 1 - March 31, 2026",
    "Carla Johansson", "carla@nordikbank.se", "Enterprise Plan - Premium Support",
    [["Distributed Cloud WAAP", "$5,500.00"], ["NGINX App Protect", "$4,000.00"],
     ["F5 DNS (GTM)", "$3,500.00"], ["NGINX One", "$2,500.00"], ["Premium Support", "$2,500.00"]],
    "$18,000.00"
  ),
  makeInvoice("carla-2026-02.pdf",
    "INV-F5-2026-0222", "March 1, 2026", "February 1 - February 28, 2026",
    "Carla Johansson", "carla@nordikbank.se", "Enterprise Plan - Premium Support",
    [["Distributed Cloud WAAP", "$5,500.00"], ["NGINX App Protect", "$4,000.00"],
     ["F5 DNS (GTM)", "$3,500.00"], ["NGINX One", "$2,500.00"], ["Premium Support", "$2,500.00"]],
    "$18,000.00"
  ),
  makeInvoice("carla-2026-01.pdf",
    "INV-F5-2026-0122", "February 1, 2026", "January 1 - January 31, 2026",
    "Carla Johansson", "carla@nordikbank.se", "Enterprise Plan - Premium Support",
    [["Distributed Cloud WAAP", "$5,500.00"], ["NGINX App Protect", "$4,000.00"],
     ["F5 DNS (GTM)", "$3,500.00"], ["NGINX One", "$2,500.00"], ["Premium Support", "$500.00"]],
    "$16,000.00"
  ),

  // ── David Park (StartupLab) — Starter/Basic ──
  makeInvoice("david-2026-03.pdf",
    "INV-F5-2026-0305", "April 1, 2026", "March 1 - March 31, 2026",
    "David Park", "david@startuplab.dev", "Starter Plan - Basic Support",
    [["NGINX One Subscription", "$2,500.00"]],
    "$2,500.00"
  ),
  makeInvoice("david-2026-02.pdf",
    "INV-F5-2026-0205", "March 1, 2026", "February 1 - February 28, 2026",
    "David Park", "david@startuplab.dev", "Starter Plan - Basic Support",
    [["NGINX One Subscription", "$2,500.00"]],
    "$2,500.00"
  ),

  // ── Elena Rossi (Medico Health) — Enterprise/Premium ──
  makeInvoice("elena-2026-03.pdf",
    "INV-F5-2026-0330", "April 1, 2026", "March 1 - March 31, 2026",
    "Elena Rossi", "elena@medicohealth.eu", "Enterprise Plan - Premium Support",
    [["BIG-IP VE License (Enterprise)", "$8,000.00"], ["BIG-IP APM (500 sessions)", "$5,000.00"],
     ["BIG-IQ Centralized Mgmt", "$4,500.00"], ["SSL Orchestrator", "$3,000.00"],
     ["Premium Support", "$1,500.00"]],
    "$22,000.00"
  ),
  makeInvoice("elena-2026-02.pdf",
    "INV-F5-2026-0228", "March 1, 2026", "February 1 - February 28, 2026",
    "Elena Rossi", "elena@medicohealth.eu", "Enterprise Plan - Premium Support",
    [["BIG-IP VE License (Enterprise)", "$8,000.00"], ["BIG-IP APM (500 sessions)", "$5,000.00"],
     ["BIG-IQ Centralized Mgmt", "$4,500.00"], ["SSL Orchestrator", "$3,000.00"],
     ["Premium Support", "$1,500.00"]],
    "$22,000.00"
  ),
  makeInvoice("elena-2026-01.pdf",
    "INV-F5-2026-0131", "February 1, 2026", "January 1 - January 31, 2026",
    "Elena Rossi", "elena@medicohealth.eu", "Enterprise Plan - Premium Support",
    [["BIG-IP VE License (Enterprise)", "$8,000.00"], ["BIG-IP APM (500 sessions)", "$5,000.00"],
     ["BIG-IQ Centralized Mgmt", "$4,500.00"], ["SSL Orchestrator", "$3,000.00"],
     ["Premium Support", "$1,500.00"]],
    "$22,000.00"
  ),
];

const dir = path.join(__dirname, "..", "content", "invoices", "mock");
mkdirSync(dir, { recursive: true });

for (const inv of invoices) {
  const pdf = generatePdf(inv.lines);
  writeFileSync(path.join(dir, inv.file), pdf);
  console.log(`Generated: ${inv.file} (${pdf.length} bytes)`);
}
