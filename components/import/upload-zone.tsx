"use client";

import ImportErrors
from "./import-errors";

import {
  validateStudents,
} from "@/lib/import/validate-students";

import ImportPreview
from "./import-preview";

import { useState } from "react";

import Papa from "papaparse";

export default function UploadZone() {

  const [
    fileName,
    setFileName,
  ] = useState("");

  const [
    rows,
    setRows,
  ] = useState<any[]>([]);

  const [
  errors,
  setErrors,
] = useState<any[]>([]);

  async function handleFile(
    event:
    React.ChangeEvent<HTMLInputElement>,
  ) {


    
    const file =
      event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,

      complete: (results) => {


        
  const parsedRows =
    results.data as any[];

  setRows(
    parsedRows,
  );

  const validationErrors =
    validateStudents(
      parsedRows,
    );

  setErrors(
    validationErrors,
  );
},
    });
  }

  async function
handleImport() {

console.log(
  "ROWS BEING SENT:",
  rows,
);

console.log(
  "ROWS LENGTH:",
  rows.length,
);

console.log("ROWS BEING SENT:", rows);

  const response =
    await fetch(
      "/api/import/students",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            rows,
          ),
      },
    );

  const result =
    await response.json();

  alert(
    JSON.stringify(
      result,
      null,
      2,
    ),
  );
}

  return (
    <div
      className="
      rounded-xl
      border
      p-6
      bg-white
      "
    >

      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
      />

      {fileName && (

        <div className="mt-4">

          <p>
            File:
            {" "}
            {fileName}
          </p>

          <p>
            Records:
            {" "}
            {rows.length}
          </p>

        </div>

      )}

      <ImportPreview
  rows={rows}
/>

<ImportErrors
  errors={errors}
/>



<button
  onClick={handleImport}
  className="
  mt-4
  rounded-lg
  bg-black
  px-4
  py-2
  text-white
  disabled:opacity-50
  "
>
  Import Students
</button>

    </div>
  );
}