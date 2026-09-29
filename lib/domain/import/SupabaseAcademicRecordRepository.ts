import type { SupabaseClient } from "@supabase/supabase-js";
import type { AcademicRecordRepository } from "../AcademicRecordRepository";
import { AcademicRecord } from "../AcademicRecord";
import { CurriculumMap } from "../CurriculumMap";
import { CoursePrerequisite } from "../requirements/CoursePrerequisite";
import { YearStandingRequirement } from "../requirements/YearStandingRequirement";
import type { Requirement } from "../requirements/Requirement";
import type { Subject } from "../Subject";
import type { SubjectRecord, SubjectRecordStatus } from "../SubjectRecord";
import { CompletionRequirement } from "../requirements/CompletionRequirement";

export class SupabaseAcademicRecordRepository implements AcademicRecordRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getRecord(studentId: string): Promise<AcademicRecord | undefined> {
    const { data: student, error: studentError } = await this.client
      .from("students")
      .select("id, nominal_year_level, curriculum_id")
      .eq("id", studentId)
      .maybeSingle();
    if (studentError) throw studentError;
    if (!student) return undefined;

    const { data: curriculum, error: curriculumError } = await this.client
      .from("curricula")
      .select("program")
      .eq("id", student.curriculum_id)
      .single();
    if (curriculumError) throw curriculumError;

    const { data: subjectRows, error: subjectsError } = await this.client
      .from("subjects")
      .select("id, code, title, units, year_level, semester")
      .eq("curriculum_id", student.curriculum_id);
    if (subjectsError) throw subjectsError;

    const idToCode = new Map(subjectRows.map((s) => [s.id, s.code as string]));
    const subjectIds = subjectRows.map((s) => s.id);

    const { data: requirementRows, error: requirementsError } = await this.client
      .from("requirements")
      .select("subject_id, type, required_subject_id, required_year_level")
      .in("subject_id", subjectIds);
    if (requirementsError) throw requirementsError;

    const requirementsBySubject = new Map<string, Requirement[]>();
    for (const row of requirementRows) {
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

    const subjects: Subject[] = subjectRows.map((row) => ({
      code: row.code,
      title: row.title,
      units: row.units,
      yearLevel: row.year_level as 1 | 2 | 3 | 4,
      semester: row.semester as 1 | 2 | 3,
      requirements: requirementsBySubject.get(row.id) ?? [],
    }));

    const curriculumMap = new CurriculumMap(curriculum.program, subjects);

    const { data: recordRows, error: recordsError } = await this.client
      .from("subject_records")
      .select("subject_id, status, grade, term, resolved_term")
      .eq("student_id", studentId);
    if (recordsError) throw recordsError;

    const subjectRecords: SubjectRecord[] = recordRows.map((row) => ({
      subjectCode: idToCode.get(row.subject_id) ?? "UNKNOWN",
      status: row.status as SubjectRecordStatus,
      grade: row.grade,
      term: row.term,
      resolvedTerm: row.resolved_term,
    }));

    const { data: yearLevelRows, error: yearLevelsError } = await this.client
      .from("student_year_levels")
      .select("effective_term, year_level")
      .eq("student_id", studentId);
    if (yearLevelsError) throw yearLevelsError;
    const yearLevelHistory = (yearLevelRows ?? []).map((row) => ({
      term: row.effective_term as string,
      yearLevel: row.year_level as number,
    }));

    return new AcademicRecord(studentId, curriculumMap, student.nominal_year_level, subjectRecords, yearLevelHistory);
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