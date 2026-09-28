import type { Metadata } from "next";
import { getCurrentStaff } from "../../../lib/queries/staff";
import { updateName } from "./action";
import PasswordChangeForm from "./PasswordChangeForm";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Field, Input } from "../../../components/ui/Field";
import SubmitButton from "../../../components/ui/SubmitButton";

export const metadata: Metadata = { title: "Account settings" };

const ROLE_LABEL = { chairperson: "Chairperson", dean: "Dean", admin: "Admin" } as const;

export default async function SettingsPage() {
  const staff = await getCurrentStaff();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Account settings" description="Your name and password." />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Profile" />
          <form action={updateName}>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="name">
                <Input id="name" name="name" required defaultValue={staff?.name} />
              </Field>
              <Field label="Role" htmlFor="role">
                <Input
                  id="role"
                  disabled
                  value={`${staff ? ROLE_LABEL[staff.role] : ""}${staff?.program ? ` · ${staff.program}` : staff?.collegeName ? ` · ${staff.collegeName}` : ""}`}
                />
              </Field>
            </CardBody>
            <div className="flex justify-end rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
              <SubmitButton pendingLabel="Saving…">Save name</SubmitButton>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Password" description="You’ll stay logged in on this device after changing it." />
          <PasswordChangeForm />
        </Card>
      </div>
    </div>
  );
}
