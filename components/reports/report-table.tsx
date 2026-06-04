"use client";

import jsPDF
from "jspdf";

import autoTable
from "jspdf-autotable";

import {
  useEffect,
  useState,
} from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";


type StudentReport = {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  department: string;
  audit_status: string;
};

export default function ReportTable() {

  const [
    students,
    setStudents,
  ] = useState<
    StudentReport[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    filter,
    setFilter,
  ] = useState("All");

  useEffect(() => {

    async function
    fetchReports() {

      try {

        const response =
          await fetch(
            "/api/reports/students",
          );

        const data =
          await response.json();

        setStudents(
          data,
        );

      } catch (error) {

        console.error(
          error,
        );

      } finally {

        setLoading(
          false,
        );
      }
    }

    fetchReports();

  }, []);

  if (loading) {

    return (
      <p>
        Loading reports...
      </p>
    );
  }

  const filteredStudents =
    filter === "All"
      ? students
      : students.filter(
          (student) =>
            student.audit_status ===
            filter,
        );

function exportCSV() {

  const headers = [
    "student_number",
    "first_name",
    "last_name",
    "department",
    "audit_status",
  ];

  const csvRows = [
    headers.join(","),
    ...filteredStudents.map(
      (student) =>
        [
          student.student_number,
          student.first_name,
          student.last_name,
          student.department,
          student.audit_status,
        ].join(","),
    ),
  ];

  const csvContent =
    csvRows.join("\n");

  const blob =
    new Blob(
      [csvContent],
      {
        type:
          "text/csv;charset=utf-8;",
      },
    );

const url =
  URL.createObjectURL(blob);

const link =
  document.createElement("a");

link.href = url;

link.download =
  `audit-report-${filter}.csv`;

document.body.appendChild(
  link,
);

link.click();

document.body.removeChild(
  link,
);

URL.revokeObjectURL(
  url,
);
}

    function exportPDF() {

  const doc =
    new jsPDF();

  doc.setFontSize(18);

  doc.text(
    "AUDITRIX STUDENT AUDIT REPORT",
    14,
    20,
  );

  autoTable(doc, {

    startY: 30,

    head: [[
      "Student No.",
      "Name",
      "Department",
      "Status",
    ]],

    body:
      filteredStudents.map(
        (student) => [

          student.student_number,

          `${student.first_name} ${student.last_name}`,

          student.department,

          student.audit_status,
        ],
      ),
  });

  doc.save(
    `audit-report-${filter}.pdf`,
  );
}

  return (

    <Card>

      <CardHeader>

        <CardTitle>
          Student Audit Reports
        </CardTitle>

      </CardHeader>

      <CardContent>

        <div
  className="
  mb-4
  flex
  gap-2
  "
>

  <button
    onClick={exportCSV}
    className="
    rounded-lg
    bg-black
    px-4
    py-2
    text-white
    "
  >
    Export CSV
  </button>

  <button
    onClick={exportPDF}
    className="
    rounded-lg
    bg-black
    
    px-4
    py-2
    text-white
    "
  >
    Export PDF
  </button>

</div>

        <div
          className="
          mb-4
          flex
          gap-2
          "
        >

          {[
            "All",
            "Validated",
            "Pending",
            "Violated",
          ].map((status) => (

            <button
              key={status}
              onClick={() =>
                setFilter(status)
              }
              className={`
                rounded-lg
                px-4
                py-2
                text-sm
                ${
                  filter === status
                    ? "bg-black text-white"
                    : "bg-slate-200"
                }
              `}
            >
              {status}
            </button>

          ))}

        </div>

        <div
          className="
          overflow-x-auto
          "
        >

          <table
            className="
            w-full
            text-sm
            "
          >

            <thead>

              <tr
                className="
                border-b
                "
              >

                <th
                  className="
                  p-3
                  text-left
                  "
                >
                  Student No.
                </th>

                <th
                  className="
                  p-3
                  text-left
                  "
                >
                  Name
                </th>

                <th
                  className="
                  p-3
                  text-left
                  "
                >
                  Department
                </th>

                <th
                  className="
                  p-3
                  text-left
                  "
                >
                  Audit Status
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredStudents.map(
                (
                  student,
                ) => (

                  <tr
                    key={
                      student.id
                    }
                    className="
                    border-b
                    "
                  >

                    <td
                      className="
                      p-3
                      "
                    >
                      {
                        student.student_number
                      }
                    </td>

                    <td
                      className="
                      p-3
                      "
                    >
                      {
                        student.first_name
                      }{" "}
                      {
                        student.last_name
                      }
                    </td>

                    <td
                      className="
                      p-3
                      "
                    >
                      {
                        student.department
                      }
                    </td>

                    <td
                      className="
                      p-3
                      font-medium
                      "
                    >
                      {
                        student.audit_status
                      }
                    </td>

                  </tr>
                ),
              )}

            </tbody>

          </table>

        </div>

      </CardContent>

    </Card>
  );
}