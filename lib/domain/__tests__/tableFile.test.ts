import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readTable } from "../import/tableFile";
import { parseSubjectsCsv } from "../import/curriculumImport";

describe("reading an uploaded table", () => {
  it("reads a CSV, dropping a byte-order mark and empty rows", () => {
    assert.deepEqual(readTable('﻿code,title\nCC 101,"Intro, Computing"\n,\n'), [
      ["code", "title"],
      ["CC 101", "Intro, Computing"],
    ]);
  });

  it("reads a web-page .xls like KSU-MIS's Export to Excel", () => {
    const html =
      '<html><head><!--[if gte mso 9]><xml><x:Name>name</x:Name></xml><![endif]--></head><body><table>' +
      '<thead><tr><th><span>Student ID</span><i class="mdi"></i></th><th><span>Name</span></th></tr></thead>' +
      '<tbody><tr><td class="text-start">26-100001</td><td>Dela Cruz, Juan &amp; Co&nbsp;Santos</td></tr></tbody>' +
      "<tfoot><tr><td>Notes are left out</td></tr></tfoot></table></body></html>";
    assert.deepEqual(readTable(html), [
      ["Student ID", "Name"],
      ["26-100001", "Dela Cruz, Juan & Co Santos"],
    ]);
  });

  it("reads the file after Excel saves it again (no <thead> or <tbody>)", () => {
    const excel =
      "<html xmlns:x=\"urn:schemas-microsoft-com:office:excel\"><body><table x:str border=0>" +
      "<col width=64><tr height=20><td height=20>code</td><td>title</td></tr>" +
      "<tr height=20><td height=20>CC 101</td><td class=xl65>Intro<br>Computing</td></tr>" +
      "<tr height=20><td></td><td></td></tr></table></body></html>";
    assert.deepEqual(readTable(excel), [
      ["code", "title"],
      ["CC 101", "Intro Computing"],
    ]);
  });
});

describe("curriculum import from an .xls", () => {
  it("reads the same columns as the CSV and skips note rows quietly", () => {
    const html =
      "<html><body><table><thead><tr><th>code</th><th>title</th><th>units</th><th>year_level</th>" +
      "<th>semester</th><th>prerequisite</th></tr></thead><tbody>" +
      "<tr><td>CC 101</td><td>Intro</td><td>3</td><td>1</td><td>1</td><td></td></tr>" +
      "<tr><td>CC 103</td><td>HCI</td><td>3</td><td>1</td><td>2</td><td>CC 101</td></tr>" +
      "<tr><td></td><td></td><td></td><td></td><td>3 = midyear</td><td>leave it blank if no prerequisite</td></tr>" +
      "</tbody></table></body></html>";
    const result = parseSubjectsCsv(html);
    assert.ok("subjects" in result);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(
      result.subjects.map((s) => [s.code, s.semester, s.requirements]),
      [
        ["CC 101", 1, []],
        ["CC 103", 2, [{ kind: "code", code: "CC 101" }]],
      ]
    );
  });
});
