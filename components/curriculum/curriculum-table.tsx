"use client";

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

type CurriculumRule = {
  courses: {
    course_code: string;
    course_title: string;
  };

  prerequisite: {
    course_code: string;
    course_title: string;
  };
};

export default function
CurriculumTable() {

  const [
    rules,
    setRules,
  ] = useState<
    CurriculumRule[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {

    async function
    fetchCurriculum() {

      try {

        const response =
          await fetch(
            "/api/curriculum",
          );

        const data =
          await response.json();

        setRules(
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

    fetchCurriculum();

  }, []);

  if (loading) {

    return (
      <p>
        Loading curriculum...
      </p>
    );
  }

  return (

    <Card>

      <CardHeader>

        <CardTitle>
          Course Prerequisite Map
        </CardTitle>

      </CardHeader>

      <CardContent>

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
                  Course
                </th>

                <th
                  className="
                  p-3
                  text-left
                  "
                >
                  Course Title
                </th>

                <th
                  className="
                  p-3
                  text-left
                  "
                >
                  Prerequisite
                </th>

                <th
                  className="
                  p-3
                  text-left
                  "
                >
                  Prerequisite Title
                </th>

              </tr>

            </thead>

            <tbody>

              {rules.map(
                (
                  rule,
                  index,
                ) => (

                  <tr
                    key={index}
                    className="
                    border-b
                    "
                  >

                    <td
                      className="
                      p-3
                      font-medium
                      "
                    >
                      {
                        rule
                        .courses
                        .course_code
                      }
                    </td>

                    <td
                      className="
                      p-3
                      "
                    >
                      {
                        rule
                        .courses
                        .course_title
                      }
                    </td>

                    <td
                      className="
                      p-3
                      "
                    >
                      {
                        rule
                        .prerequisite
                        .course_code
                      }
                    </td>

                    <td
                      className="
                      p-3
                      "
                    >
                      {
                        rule
                        .prerequisite
                        .course_title
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