"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { StudentTableItem } from "@/types/student-table";

const columns: ColumnDef<StudentTableItem>[] = [
  {
    accessorKey: "student_number",

    header: "Student Number",
  },

  {
    accessorKey: "first_name",

    header: "First Name",
  },

  {
    accessorKey: "last_name",

    header: "Last Name",
  },

  {
    accessorKey: "department",

    header: "Department",
  },

  {
    accessorKey: "status",

    header: "Status",

    cell: ({ row }) => {

      const status =
        row.original.status;

      return (
        <Badge>
          {status}
        </Badge>
      );
    },
  },

  {
    id: "actions",

    header: "Actions",

    cell: () => {

      return (
        <Button size="sm">
          Audit
        </Button>
      );
    },
  },
];

export default function StudentTable({
  data,
}: {
  data: StudentTableItem[];
}) {

  const table =
    useReactTable({
      data,

      columns,

      getCoreRowModel:
        getCoreRowModel(),
    });

  return (
    <div
      className="
      rounded-xl
      border
      bg-white
      "
    >

      <Table>

        <TableHeader>

          {table
            .getHeaderGroups()
            .map(
              (headerGroup) => (

                <TableRow
                  key={
                    headerGroup.id
                  }
                >

                  {headerGroup
                    .headers
                    .map((header) => (

                      <TableHead
                        key={
                          header.id
                        }
                      >

                        {flexRender(
                          header
                            .column
                            .columnDef
                            .header,

                          header.getContext()
                        )}

                      </TableHead>
                    ))}

                </TableRow>
              )
            )}

        </TableHeader>

        <TableBody>

          {table
            .getRowModel()
            .rows
            .map((row) => (

              <TableRow
                key={row.id}
              >

                {row
                  .getVisibleCells()
                  .map((cell) => (

                    <TableCell
                      key={cell.id}
                    >

                      {flexRender(
                        cell
                          .column
                          .columnDef
                          .cell,

                        cell.getContext()
                      )}

                    </TableCell>
                  ))}

              </TableRow>
            ))}

        </TableBody>

      </Table>

    </div>
  );
}