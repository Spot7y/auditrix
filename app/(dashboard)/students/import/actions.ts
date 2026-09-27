"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";

function parseCsv(text: string): string[][] {
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

function stripHtml(fragment: string): string {
  return fragment
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// KSU-MIS's "Export to Excel" produces an HTML table saved with an .xls
// extension — not a real spreadsheet file at all. This reads it directly,
// matching columns by their header text (not position) so a future export
// with reordered columns still parses correctly.
function parseHtmlTable(html: string): string[][] {
  const theadMatch = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!theadMatch || !tbodyMatch) return [];

  function extractCells(rowHtml: string): string[] {
    const cellMatches = [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)];
    return cellMatches.map((m) => stripHtml(m[1]));
  }

  const headerRowMatch = theadMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
  const headers = headerRowMatch ? extractCells(headerRowMatch[1]) : [];

  const rowMatches = [...tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const dataRows = rowMatches.map((m) => extractCells(m[1]));

  return [headers, ...dataRows];
}

function isHtmlFormat(text: string): boolean {
  const start = text.trim().slice(0, 200).toLowerCase();
  return start.startsWith("<html") || start.includes("<table") || start.includes("<!doctype");
}

export async function importStudentsCsv(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/import?error=${encodeURIComponent("Only a chairperson account can import students.")}`);
  }

  const curriculumId = String(formData.get("curriculumId") ?? "");
  if (!curriculumId) {
    redirect(`/students/import?error=${encodeURIComponent("Please select a curriculum version.")}`);
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    redirect(`/students/import?error=${encodeURIComponent("Please choose a file.")}`);
  }

  const text = await file!.text();

  type ParsedStudent = { id: string; name: string; yearLevel: number };
  const parsedStudents: ParsedStudent[] = [];
  const warnings: string[] = [];

  if (isHtmlFormat(text)) {
    const rows = parseHtmlTable(text);
    if (rows.length < 2) {
      redirect(`/students/import?error=${encodeURIComponent("Could not find a data table in this file.")}`);
    }
    const [headers, ...dataRows] = rows;
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
    const idCol = normalizedHeaders.indexOf("student id");
    const nameCol = normalizedHeaders.indexOf("name");
    const yearCol = normalizedHeaders.indexOf("year");

    if (idCol === -1 || nameCol === -1 || yearCol === -1) {
      redirect(
        `/students/import?error=${encodeURIComponent(
          "Could not find the expected columns (Student ID, Name, Year) in this file's headers."
        )}`
      );
    }

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const id = (row[idCol] ?? "").trim();
      const name = (row[nameCol] ?? "").trim();
      const yearLevel = Number((row[yearCol] ?? "").trim());

      if (!id || !name || Number.isNaN(yearLevel) || yearLevel < 1 || yearLevel > 4) {
        warnings.push(`Row ${i + 2}: missing or invalid data, skipped.`);
        continue;
      }
      parsedStudents.push({ id, name, yearLevel });
    }
  } else {
    const rows = parseCsv(text);
    if (rows.length < 2) {
      redirect(`/students/import?error=${encodeURIComponent("File appears to be empty.")}`);
    }
    const dataRows = rows.slice(1);

    for (let i = 0; i < dataRows.length; i++) {
      const [rawId, rawName, rawYear] = dataRows[i];
      const id = (rawId ?? "").trim();
      const name = (rawName ?? "").trim();
      const yearLevel = Number(rawYear);

      if (!id || !name || Number.isNaN(yearLevel) || yearLevel < 1 || yearLevel > 4) {
        warnings.push(`Row ${i + 2}: missing or invalid data, skipped.`);
        continue;
      }
      parsedStudents.push({ id, name, yearLevel });
    }
  }

  if (parsedStudents.length === 0) {
    const warningsParam = warnings.length > 0 ? `&warnings=${encodeURIComponent(warnings.join(" | "))}` : "";
    redirect(`/students/import?error=${encodeURIComponent("No valid rows found in file.")}${warningsParam}`);
  }

  const supabase = await createServerClientForUser();
  let importedCount = 0;

  for (const s of parsedStudents) {
    if (s.name.includes("**")) {
      const cleanName = s.name.replace(/\*+/g, "").trim();
      warnings.push(`${cleanName} (${s.id}): not yet officially enrolled, skipped.`);
      continue;
    }

    const { error } = await supabase.from("students").insert({
      id: s.id,
      name: s.name,
      curriculum_id: curriculumId,
      nominal_year_level: s.yearLevel,
    });

    if (error) {
      warnings.push(`${s.name} (${s.id}): ${error.message}`);
      continue;
    }

    importedCount++;
  }

  revalidatePath("/students");
  revalidatePath("/home");

  const summary = `Imported ${importedCount} student(s).${warnings.length > 0 ? ` ${warnings.length} note(s).` : ""}`;
  const warningsParam = warnings.length > 0 ? `&warnings=${encodeURIComponent(warnings.join(" | "))}` : "";
  redirect(`/students/import?success=${encodeURIComponent(summary)}${warningsParam}`);
}