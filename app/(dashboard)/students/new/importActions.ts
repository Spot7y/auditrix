"use server";

import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import type { ImportResult } from "../../../../components/ImportDialog";
import { isValidStudentId, normalizeStudentId } from "../../../../lib/domain/studentId";
import { readTableFile } from "../../../../lib/domain/import/tableFile";

export async function importStudentsCsv(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return { error: "Only a chairperson account can import students." };
  }

  const curriculumId = String(formData.get("curriculumId") ?? "");
  if (!curriculumId) {
    return { error: "Please select a curriculum version." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please choose a file." };
  }

  type ParsedStudent = { id: string; name: string; yearLevel: number };
  const parsedStudents: ParsedStudent[] = [];
  const warnings: string[] = [];

  const table = await readTableFile(new Uint8Array(await file.arrayBuffer()));
  if ("error" in table) return { error: table.error };
  const { rows } = table;
  if (rows.length < 2) {
    return { error: table.kind === "html" ? "Could not find a data table in this file." : "File appears to be empty." };
  }
  const [headers, ...dataRows] = rows;

  // Columns are found by their header (the template and KSU-MIS exports
  // have "Student ID", "Name" and "Year" among others); a file without
  // those headers is read as ID, name, year level.
  const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/[_\s]+/g, " ").trim());
  const column = (names: string[], fallback: number) => {
    const index = normalizedHeaders.findIndex((h) => names.includes(h));
    return index === -1 ? fallback : index;
  };
  const idCol = column(["student id", "id", "id number", "student number"], 0);
  const nameCol = column(["name", "full name", "student name"], 1);
  const yearCol = column(["year", "year level"], 2);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const id = normalizeStudentId(row[idCol] ?? "");
    const name = (row[nameCol] ?? "").trim();
    const yearLevel = Number((row[yearCol] ?? "").trim());

    if (!id && !name) continue;
    if (!id || !name || Number.isNaN(yearLevel) || yearLevel < 1 || yearLevel > 4) {
      warnings.push(`Row ${i + 2}: missing or invalid data, skipped.`);
      continue;
    }
    if (!isValidStudentId(id)) {
      warnings.push(`Row ${i + 2}: "${id}" is not a valid ID number, skipped.`);
      continue;
    }
    parsedStudents.push({ id, name, yearLevel });
  }

  if (parsedStudents.length === 0) {
    return { error: "No valid rows found in file.", warnings };
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
  return { success: summary, warnings };
}