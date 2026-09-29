import type { SupabaseClient } from "@supabase/supabase-js";
import type { AcademicRecordRepository } from "../AcademicRecordRepository";
import { AcademicRecord } from "../AcademicRecord";
import { CurriculumMap } from "../CurriculumMap";
import { CoursePrerequisite } from "../requirements/CoursePrerequisite";
import { YearStandingRequirement } from "../requirements/YearStandingRequirement";
import type { Requirement } from "../requirements/Requirement";
import type { Subject } from "../Subject";
import type { SubjectRecord, SubjectRecordStatus } from "../SubjectRecord";
import type { YearLevelEntry } from "../yearLevels";
import { CompletionRequirement } from "../requirements/CompletionRequirement";

/** Keeps each request's list of IDs short enough for a URL. */
const CHUNK = 100;

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

export class SupabaseAcademicRecordRepository implements AcademicRecordRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getRecord(studentId: string): Promise<AcademicRecord | undefined> {
    return (await this.getRecords([studentId])).get(studentId);
  }

  /**
   * Several students' records at once, in a handful of queries rather than a
   * few per student. Students that don't exist, or that row-level security
   * hides, are left out.
   */
  async getRecords(studentIds: string[]): Promise<Map<string, AcademicRecord>> {
    const ids = [...new Set(studentIds)];
    const records = new Map<string, AcademicRecord>();
    if (ids.length === 0) return records;

    const students: { id: string; nominal_year_level: number; curriculum_id: string }[] = [];
    for (const part of chunks(ids)) {
      const { data, error } = await this.client.from("students").select("id, nominal_year_level, curriculum_id").in("id", part);
      if (error) throw error;
      students.push(...(data ?? []));
    }
    if (students.length === 0) return records;

    const curriculumIds = [...new Set(students.map((s) => s.curriculum_id))];
    const { data: curricula, error: curriculaError } = await this.client
      .from("curricula")
      .select("id, program")
      .in("id", curriculumIds);
    if (curriculaError) throw curriculaError;

    const { data: subjectRows, error: subjectsError } = await this.client
      .from("subjects")
      .select("id, curriculum_id, code, title, units, year_level, semester")
      .in("curriculum_id", curriculumIds);
    if (subjectsError) throw subjectsError;

    const idToCode = new Map((subjectRows ?? []).map((s) => [s.id, s.code as string]));

    const requirementsBySubject = new Map<string, Requirement[]>();
    for (const part of chunks((subjectRows ?? []).map((s) => s.id))) {
      const { data: requirementRows, error: requirementsError } = await this.client
        .from("requirements")
        .select("subject_id, type, required_subject_id, required_year_level")
        .in("subject_id", part);
      if (requirementsError) throw requirementsError;

      for (const row of requirementRows ?? []) {
        const requirement: Requirement =
          row.type === "YEAR_STANDING"
            ? new YearStandingRequirement(row.required_year_level as 1 | 2 | 3 | 4)
            : row.type === "COMPLETION"
            ? new CompletionRequirement()
            : new CoursePrerequisite(
                idToCode.get(row.required_subject_id!) ?? "UNKNOWN",
                row.type as "PREREQUISITE" | "COREQUISITE"
              );

        const list = requirementsBySubject.get(row.subject_id) ?? [];
        list.push(requirement);
        requirementsBySubject.set(row.subject_id, list);
      }
    }

    const curriculumMaps = new Map<string, CurriculumMap>();
    for (const curriculum of curricula ?? []) {
      const subjects: Subject[] = (subjectRows ?? [])
        .filter((row) => row.curriculum_id === curriculum.id)
        .map((row) => ({
          code: row.code,
          title: row.title,
          units: row.units,
          yearLevel: row.year_level as 1 | 2 | 3 | 4,
          semester: row.semester as 1 | 2 | 3,
          requirements: requirementsBySubject.get(row.id) ?? [],
        }));
      curriculumMaps.set(curriculum.id, new CurriculumMap(curriculum.program, subjects));
    }

    const subjectRecords = new Map<string, SubjectRecord[]>();
    const history = new Map<string, YearLevelEntry[]>();
    for (const part of chunks(students.map((s) => s.id))) {
      const { data: recordRows, error: recordsError } = await this.client
        .from("subject_records")
        .select("student_id, subject_id, status, grade, term, resolved_term")
        .in("student_id", part);
      if (recordsError) throw recordsError;
      for (const row of recordRows ?? []) {
        const list = subjectRecords.get(row.student_id) ?? [];
        list.push({
          subjectCode: idToCode.get(row.subject_id) ?? "UNKNOWN",
          status: row.status as SubjectRecordStatus,
          grade: row.grade,
          term: row.term,
          resolvedTerm: row.resolved_term,
        });
        subjectRecords.set(row.student_id, list);
      }

      const { data: yearLevelRows, error: yearLevelsError } = await this.client
        .from("student_year_levels")
        .select("student_id, effective_term, year_level, source")
        .in("student_id", part);
      if (yearLevelsError) throw yearLevelsError;
      for (const row of yearLevelRows ?? []) {
        const list = history.get(row.student_id) ?? [];
        list.push({ term: row.effective_term, yearLevel: row.year_level, source: row.source });
        history.set(row.student_id, list);
      }
    }

    for (const student of students) {
      const curriculum = curriculumMaps.get(student.curriculum_id);
      if (!curriculum) continue;
      records.set(
        student.id,
        new AcademicRecord(
          student.id,
          curriculum,
          student.nominal_year_level,
          subjectRecords.get(student.id) ?? [],
          history.get(student.id) ?? []
        )
      );
    }
    return records;
  }

  async upsertSubjectRecord(studentId: string, record: SubjectRecord, performedBy: string): Promise<void> {
    const { data: student, error: studentError } = await this.client
      .from("students")
      .select("curriculum_id")
      .eq("id", studentId)
      .single();
    if (studentError) throw studentError;

    const { data: subject, error: subjectError } = await this.client
      .from("subjects")
      .select("id")
      .eq("curriculum_id", student.curriculum_id)
      .eq("code", record.subjectCode)
      .single();
    if (subjectError) throw subjectError;

    const { data: existing } = await this.client
      .from("subject_records")
      .select("status, grade, term, resolved_term")
      .eq("student_id", studentId)
      .eq("subject_id", subject.id)
      .maybeSingle();

    const { error: upsertError } = await this.client
      .from("subject_records")
      .upsert(
        {
          student_id: studentId,
          subject_id: subject.id,
          status: record.status,
          grade: record.grade,
          term: record.term,
          resolved_term: record.resolvedTerm ?? null,
        },
        { onConflict: "student_id,subject_id" }
      );
    if (upsertError) throw upsertError;

    const { error: logError } = await this.client.from("grade_audit_log").insert({
      student_id: studentId,
      subject_id: subject.id,
      old_status: existing?.status ?? null,
      old_grade: existing?.grade ?? null,
      old_term: existing?.term ?? null,
      old_resolved_term: existing?.resolved_term ?? null,
      new_status: record.status,
      new_grade: record.grade,
      new_term: record.term,
      new_resolved_term: record.resolvedTerm ?? null,
      changed_by: performedBy,
    });
    if (logError) throw logError;
  }
}