import { describe, it } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { readTable, readTableFile } from "../import/tableFile";
import { parseSubjectRows, parseSubjectsCsv } from "../import/curriculumImport";

async function xlsx(sheets: Record<string, (string | number | null | { formula: string; result: number })[][]>): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = workbook.addWorksheet(name);
    rows.forEach((row, i) => row.forEach((value, j) => value !== null && (sheet.getCell(i + 1, j + 1).value = value)));
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

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

describe("reading an uploaded file", () => {
  it("reads an Excel workbook (.xlsx) as the cells show, skipping empty sheets and rows", async () => {
    const bytes = await xlsx({
      Empty: [],
      Subjects: [
        ["code", "title", "units", "year_level", "semester", "prerequisite"],
        ["CC 101", "  Intro to\nComputing ", 3, 1, 1, null],
        [null, null, null, null, null, null],
        ["CC 102", "Programming 1", { formula: "1+2", result: 3 }, 1, 2, "CC 101"],
      ],
    });
    const table = await readTableFile(bytes);
    assert.ok("rows" in table);
    assert.equal(table.kind, "xlsx");
    assert.deepEqual(table.rows, [
      ["code", "title", "units", "year_level", "semester", "prerequisite"],
      ["CC 101", "Intro to Computing", "3", "1", "1"],
      ["CC 102", "Programming 1", "3", "1", "2", "CC 101"],
    ]);

    const parsed = parseSubjectRows(table.rows);
    assert.ok("subjects" in parsed);
    assert.deepEqual(
      parsed.subjects.map((s) => [s.code, s.units, s.semester, s.requirements]),
      [
        ["CC 101", 3, 1, []],
        ["CC 102", 3, 2, [{ kind: "code", code: "CC 101" }]],
      ]
    );
  });

  it("reads a CSV and a web-page .xls from their bytes", async () => {
    const csv = await readTableFile(new TextEncoder().encode("\uFEFFcode,title\nCC 101,Intro\n"));
    assert.deepEqual(csv, { rows: [["code", "title"], ["CC 101", "Intro"]], kind: "csv" });

    const html = await readTableFile(new TextEncoder().encode("<html><body><table><tr><td>a</td></tr></table></body></html>"));
    assert.deepEqual(html, { rows: [["a"]], kind: "html" });
  });

  it("asks for an older Excel 97–2003 file to be saved as .xlsx or CSV", async () => {
    const result = await readTableFile(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]));
    assert.ok("error" in result);
    assert.match(result.error, /Excel 97–2003.*\.xlsx/);
  });

  it("reports a damaged .xlsx instead of failing", async () => {
    const result = await readTableFile(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]));
    assert.ok("error" in result);
    assert.match(result.error, /could not be read/);
  });
});
