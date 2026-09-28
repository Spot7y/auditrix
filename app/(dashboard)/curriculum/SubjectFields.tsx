import { Field, Input, Select } from "../../../components/ui/Field";

/** Code, title, units, year and semester — shared by Add Subject and Edit Subject. */
export default function SubjectFields({
  subject,
}: {
  subject?: { code: string; title: string; units: number; yearLevel: number; semester: number };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <Field label="Code" htmlFor="code" className="sm:col-span-2">
        <Input id="code" name="code" required autoComplete="off" placeholder="CC 101" defaultValue={subject?.code} className="font-mono" />
      </Field>
      <Field label="Title" htmlFor="title" className="sm:col-span-4">
        <Input id="title" name="title" required placeholder="Introduction to Computing" defaultValue={subject?.title} />
      </Field>
      <Field label="Units" htmlFor="units" className="sm:col-span-2">
        <Input id="units" name="units" type="number" step="0.5" min={0} required defaultValue={subject?.units ?? 3} />
      </Field>
      <Field label="Year level" htmlFor="yearLevel" className="sm:col-span-2">
        <Select id="yearLevel" name="yearLevel" defaultValue={subject?.yearLevel ?? 1}>
          <option value="1">1st year</option>
          <option value="2">2nd year</option>
          <option value="3">3rd year</option>
          <option value="4">4th year</option>
        </Select>
      </Field>
      <Field label="Semester" htmlFor="semester" className="sm:col-span-2">
        <Select id="semester" name="semester" defaultValue={subject?.semester ?? 1}>
          <option value="1">First</option>
          <option value="2">Second</option>
          <option value="3">Midyear</option>
        </Select>
      </Field>
    </div>
  );
}
