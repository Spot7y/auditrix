"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Field, Input } from "../../../components/ui/Field";
import { Button } from "../../../components/ui/Button";
import { MIN_PASSWORD_LENGTH } from "../../../lib/domain/passwordPolicy";

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

/** Name, email and temporary password for a new chairperson login. */
export default function ChairAccountFields() {
  const [password, setPassword] = useState("");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" htmlFor="chairName">
        <Input id="chairName" name="chairName" required autoComplete="off" placeholder="Juan Dela Cruz" />
      </Field>
      <Field label="Email" htmlFor="chairEmail">
        <Input id="chairEmail" name="chairEmail" type="email" required autoComplete="off" placeholder="name@ksu.edu.ph" />
      </Field>
      <Field
        label="Temporary password"
        htmlFor="chairPassword"
        className="sm:col-span-2"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters with letters and numbers. Give it to the chairperson yourself; it isn’t emailed. They’ll choose their own password when they first log in.`}
      >
        <div className="flex gap-2">
          <Input
            id="chairPassword"
            name="chairPassword"
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
      </Field>
    </div>
  );
}
