import type { Requirement } from "./requirements/Requirement";

/** A single curriculum entry — one row of what the six CEIT curriculum docs contained. */
export interface Subject {
  code: string;
  title: string;
  units: number;
  yearLevel: 1 | 2 | 3 | 4;
  semester: 1 | 2 | 3;
  requirements: Requirement[];
}