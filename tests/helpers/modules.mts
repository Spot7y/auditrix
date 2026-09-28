import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mock } from "node:test";

// Server action tests swap out Next.js internals, the logged-in user and the
// Supabase clients, then import the real action code. Module mocks must be
// registered before the action is imported, so tests import actions with
// `await importFromRoot(...)` after calling these helpers.

const root = fileURLToPath(new URL("../..", import.meta.url));
const requireFromRoot = createRequire(path.join(root, "package.json"));

/** URL of a project file, e.g. "lib/queries/staff.ts". */
export function projectFile(relativePath: string): string {
  return pathToFileURL(path.join(root, relativePath)).href;
}

export function importFromRoot<T = Record<string, unknown>>(relativePath: string): Promise<T> {
  return import(projectFile(relativePath)) as Promise<T>;
}

/** Thrown by the mocked `redirect()`, carrying the decoded target URL. */
export class Redirect extends Error {
  constructor(public readonly url: string) {
    super(url);
  }
}

export function mockNext() {
  const dependency = (name: string) => pathToFileURL(requireFromRoot.resolve(name)).href;
  mock.module(dependency("next/navigation"), {
    namedExports: {
      redirect: (url: string) => {
        throw new Redirect(decodeURIComponent(url));
      },
    },
  });
  mock.module(dependency("next/cache"), { namedExports: { revalidatePath: () => {} } });
}

export type Staff = {
  id: string;
  name: string;
  role: "chairperson" | "dean" | "admin";
  program: string | null;
  collegeId: string | null;
} | null;

/** Makes `getCurrentStaff()` return whatever `current.staff` is at call time. */
export function mockCurrentStaff(current: { staff: Staff }) {
  mock.module(projectFile("lib/queries/staff.ts"), {
    namedExports: { getCurrentStaff: async () => current.staff },
  });
}

/** Runs a server action and returns where it redirected to. */
export async function redirectOf(action: (formData: FormData) => Promise<unknown>, formData: FormData) {
  try {
    await action(formData);
  } catch (error) {
    if (error instanceof Redirect) return error.url;
    throw error;
  }
  return null;
}

export function form(fields: Record<string, string | File>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}
