import type { AcademicRecord } from "./AcademicRecord";

export class Student {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly program: string,
    public readonly academicRecord: AcademicRecord
  ) {}
}