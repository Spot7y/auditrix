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

type IncAlert = {
  id: string;

  students: {
    first_name: string;
    last_name: string;
  };

  courses: {
    course_code: string;
    course_title: string;
  };

  status: string;
};

export default function
IncAlertTable() {

  const [
    alerts,
    setAlerts,
  ] = useState<
    IncAlert[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {

    async function
    fetchAlerts() {

      try {

        const response =
          await fetch(
            "/api/inc-alerts",
          );

        const data =
          await response.json();

        setAlerts(
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

    fetchAlerts();

  }, []);

  if (loading) {

    return (
      <p>
        Loading INC alerts...
      </p>
    );
  }

  return (

    <Card>

      <CardHeader>

        <CardTitle>
          Unresolved INC Alerts
        </CardTitle>

      </CardHeader>

      <CardContent>

        {alerts.length === 0 ? (

          <p
            className="
            text-slate-500
            "
          >
            No active INC alerts.
          </p>

        ) : (

          <div
            className="
            space-y-4
            "
          >

            {alerts.map(
              (alert) => (

                <div
                  key={alert.id}
                  className="
                  rounded-lg
                  border
                  p-4
                  "
                >

                  <h3
                    className="
                    font-semibold
                    "
                  >
                    {
                      alert.students
                        .first_name
                    }{" "}
                    {
                      alert.students
                        .last_name
                    }
                  </h3>

                  <p
                    className="
                    text-sm
                    text-slate-600
                    "
                  >
                    {
                      alert.courses
                        .course_code
                    }
                    {" - "}
                    {
                      alert.courses
                        .course_title
                    }
                  </p>

                  <p
                    className="
                    mt-2
                    text-sm
                    text-red-600
                    "
                  >
                    Unresolved INC
                  </p>

                </div>
              ),
            )}

          </div>

        )}

      </CardContent>

    </Card>
  );
}