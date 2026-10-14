"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Field, Input } from "../../../components/ui/Field";
import { Button } from "../../../components/ui/Button";
import { MIN_PASSWORD_LENGTH } from "../../../lib/domain/passwordPolicy";
import PasswordChecklist from "../../../components/PasswordChecklist";

// No look-alike characters (0/O, 1/l/I), so it can be read out or copied by hand.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generatePassword(length = 12) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  let password = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  // The policy needs letters and numbers; make sure both are present.
  if (!/[0-9]/.test(password)) password = password.slice(0, -1) + "7";
  if (!/[A-Za-z]/.test(password)) password = "k" + password.slice(1);
  return password;
}

/**
 * Name, email and temporary password for a new chairperson (or dean) login,
 * posted as chairName/chairEmail/chairPassword (or deanName/deanEmail/deanPassword).
 */
export default function ChairAccountFields({ role = "chairperson" }: { role?: "chairperson" | "dean" }) {
  const [password, setPassword] = useState("");
  const prefix = role === "dean" ? "dean" : "chair";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" htmlFor={`${prefix}Name`}>
        <Input id={`${prefix}Name`} name={`${prefix}Name`} required autoComplete="off" placeholder="Juan Dela Cruz" />
      </Field>
      <Field label="Email" htmlFor={`${prefix}Email`}>
        <Input
          id={`${prefix}Email`}
          name={`${prefix}Email`}
          type="email"
          required
          autoComplete="off"
          placeholder="name@ksu.edu.ph"
        />
      </Field>
      <Field
        label="Temporary password"
        htmlFor={`${prefix}Password`}
        className="sm:col-span-2"
        hint={`Give it to the ${role} yourself; it isn’t emailed. They’ll choose their own password when they first log in.`}
      >
        <div className="flex gap-2">
          <Input
            id={`${prefix}Password`}
            name={`${prefix}Password`}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="font-mono"
          />
          <Button variant="secondary" onClick={() => setPassword(generatePassword())}>
            <Wand2 aria-hidden />
            Generate
          </Button>
        </div>
        <div className="mt-2">
          <PasswordChecklist password={password} />
        </div>
      </Field>
    </div>
  );
}
