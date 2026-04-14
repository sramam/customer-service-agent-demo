/**
 * Turns bare relative invoice PDF paths into markdown links so react-markdown renders
 * clickable "Download PDF" instead of raw `/api/invoices/download?key=...` text.
 * Skips segments that are already a markdown link target (path immediately after `](`).
 */
export function linkifyInvoiceDownloadPaths(markdown: string): string {
  return markdown.replace(
    /(?<!\()(\/api\/invoices\/download\?key=[^\s)\]<>"]+)/g,
    "[Download PDF]($1)",
  );
}
