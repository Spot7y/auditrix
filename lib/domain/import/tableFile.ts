// Reads an uploaded table: a CSV file, or an ".xls" that is really a web page
// table. KSU-MIS's "Export to Excel" and Auditrix's own templates are the
// latter, and so is such a file after it's opened in Excel and saved again.
// The first row is the header row; empty rows are dropped.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && next === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim().length > 0));
}

function cellText(fragment: string): string {
  return fragment
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The rows of an HTML table, header first. Rows in a <tfoot> (notes under a
 * template's table) are left out. Doesn't rely on <thead>/<tbody>, which
 * Excel leaves out when it saves the file again.
 */
export function parseHtmlTable(html: string): string[][] {
  const body = html.replace(/<tfoot[^>]*>[\s\S]*?<\/tfoot>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const rows: string[][] = [];
  for (const rowMatch of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowMatch[1].matchAll(/<t([hd])[^>]*>([\s\S]*?)<\/t\1>/gi)].map((m) => cellText(m[2]));
    if (cells.some((c) => c.length > 0)) rows.push(cells);
  }
  return rows;
}

export function isHtmlTable(text: string): boolean {
  const start = text.trim().slice(0, 500).toLowerCase();
  return start.startsWith("<") && (start.includes("<html") || start.includes("<table") || start.includes("<!doctype"));
}

/** A file's rows, header first, whether it's a CSV or a web-page ".xls". */
export function readTable(text: string): string[][] {
  // Excel may add a byte-order mark to a saved CSV.
  const clean = text.replace(/^﻿/, "");
  return isHtmlTable(clean) ? parseHtmlTable(clean) : parseCsv(clean);
}
