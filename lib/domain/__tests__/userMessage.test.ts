import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { userMessage } from "../../userMessage";

describe("messages shown for refused changes", () => {
  it("passes on Auditrix's own database messages and Supabase Auth's", () => {
    const locked = "This student's record is locked because the student was dropped. Reopen the record to change it.";
    assert.equal(userMessage({ code: "P0001", message: locked }), locked);
    assert.equal(
      userMessage({ name: "AuthWeakPasswordError", message: "Password should be at least 8 characters." }),
      "Password should be at least 8 characters."
    );
  });

  it("hides technical database messages", () => {
    const quiet = console.error;
    console.error = () => {};
    try {
      assert.equal(
        userMessage({ code: "23514", message: 'new row for relation "subject_records" violates check constraint "subject_records_ksu_grade"' }),
        "That value isn’t allowed."
      );
      assert.equal(
        userMessage({ code: "42501", message: 'new row violates row-level security policy for table "students"' }),
        "Your account isn’t allowed to do that."
      );
      assert.equal(userMessage({ message: 'relation "x" does not exist' }), "Something went wrong. Please try again.");
    } finally {
      console.error = quiet;
    }
  });
});
