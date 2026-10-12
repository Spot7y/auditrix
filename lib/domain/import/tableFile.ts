// Reads an uploaded table: a CSV file, an Excel workbook (.xlsx), or an ".xls"
// that is really a web page table. KSU-MIS's "Export to Excel" and Auditrix's
// own .xls template are the latter, and so is such a file after it's opened in
// Excel and saved again. The first row is the header row; empty rows are dropped.

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

export type TableFile = { rows: string[][]; kind: "csv" | "html" | "xlsx" } | { error: string };

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((b, i) => bytes[i] === b);
}

/** The first sheet that has anything on it, as rows of cell text. */
async function readXlsx(bytes: Uint8Array): Promise<string[][]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  // ExcelJS's typings declare its own Buffer type, which Node's no longer matches.
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets.find((ws) => ws.actualRowCount > 0);
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    // `text` is what Excel shows in the cell, so 3 stays "3" and a formula
    // gives its result.
    for (let c = 1; c <= row.cellCount; c++) cells.push(row.getCell(c).text.replace(/\s+/g, " ").trim());
    if (cells.some((cell) => cell.length > 0)) rows.push(cells);
  });
  return rows;
}

/** An uploaded file's rows, header first: a CSV, an Excel workbook (.xlsx) or a web-page ".xls". */
export async function readTableFile(bytes: Uint8Array): Promise<TableFile> {
  // A .xlsx is a zip archive.
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    try {
      return { rows: await readXlsx(bytes), kind: "xlsx" };
    } catch {
      return { error: "This Excel file could not be read. Open it in Excel, save it again as .xlsx or CSV, and import that." };
    }
  }
  // The binary format Excel used before 2007.
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0])) {
    return {
      error: "This is an older Excel 97–2003 file. Open it in Excel, save it as an Excel Workbook (.xlsx) or CSV, and import that.",
    };
  }
  const text = new TextDecoder("utf-8").decode(bytes);
  return { rows: readTable(text), kind: isHtmlTable(text.replace(/^\uFEFF/, "")) ? "html" : "csv" };
}
