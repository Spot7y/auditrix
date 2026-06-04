

"use client";
import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import { useDebounce }
from "use-debounce";

import {
  Search,
  User,
} from "lucide-react";

import { Input }
from "@/components/ui/input";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  StudentSearchResult,
} from "@/types/student-search";

export default function
StudentSearch() {

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    results,
    setResults,
  ] = useState<
    StudentSearchResult[]
  >([]);

  const [
    debouncedQuery,
  ] = useDebounce(
    query,
    400,
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  useEffect(() => {

    async function
    searchStudents() {

      if (
        !debouncedQuery
      ) {

        setResults([]);

        return;
      }

      try {

        setLoading(true);

        const response =
          await fetch(
            `/api/students/search?query=${debouncedQuery}`,
          );

        const data =
          await response.json();

        if (Array.isArray(data)) {

  setResults(data);

} else {

  console.error(data);

  setResults([]);
}

      } catch (error) {

        console.error(error);

      } finally {

        setLoading(false);
      }
    }

    searchStudents();

  }, [debouncedQuery]);

  return (
    <div
      className="
      space-y-4
      "
    >

      <div
        className="
        relative
        w-full
        "
      >

        <Search
          className="
          absolute
          left-3
          top-1/2
          h-4
          w-4
          -translate-y-1/2
          text-slate-400
          "
        />

        <Input
          value={query}
          onChange={(e) =>
            setQuery(
              e.target.value,
            )
          }
          placeholder="
          Search student number or name...
          "
          className="
          h-12
          pl-10
          text-base
          "
        />

      </div>

      {loading && (

        <p
          className="
          text-sm
          text-slate-500
          "
        >
          Searching students...
        </p>
      )}

      <div
        className="
        space-y-3
        "
      >

        {results.map(
          (student) => (

            <Link
            key={student.id}
  href={`/audit-queue/${student.id}`}
>

              <CardContent
                className="
                flex
                items-center
                justify-between
                p-4
                "
              >

                <div
                  className="
                  flex
                  items-center
                  gap-4
                  "
                >

                  <div
                    className="
                    rounded-full
                    bg-slate-100
                    p-3
                    "
                  >

                    <User
                      className="
                      h-5
                      w-5
                      "
                    />

                  </div>

                  <div>

                    <h3
                      className="
                      font-semibold
                      "
                    >
                      {student.first_name}
                      {" "}
                      {student.last_name}
                    </h3>

                    <p
                      className="
                      text-sm
                      text-slate-500
                      "
                    >
                      {
                        student.student_number
                      }
                    </p>

                  </div>

                </div>

                <div
                  className="
                  text-right
                  "
                >

                  <p
                    className="
                    text-sm
                    font-medium
                    "
                  >
                    {
                      student.department
                    }
                  </p>

                  <p
                    className="
                    text-xs
                    text-slate-500
                    "
                  >
                    Curriculum
                    {" "}
                    {
                      student.curriculum_year
                    }
                  </p>

                </div>

              </CardContent>

            </Link>
          )
        )}

      </div>

    </div>
  );
}