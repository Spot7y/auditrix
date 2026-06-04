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

type AnalyticsData = {
  totalStudents: number;
  validated: number;
  pending: number;
  violated: number;
};

export default function StatCards() {

  const [
    stats,
    setStats,
  ] = useState<
    AnalyticsData | null
  >(null);

  useEffect(() => {

    async function
    fetchAnalytics() {

      const response =
        await fetch(
          "/api/analytics",
        );

      const data =
        await response.json();

      setStats(data);
    }

    fetchAnalytics();

  }, []);

  if (!stats) {

    return (
      <p>
        Loading analytics...
      </p>
    );
  }

  const cards = [
    {
      title:
        "Total Students",
      value:
        stats.totalStudents,
    },
    {
      title:
        "Validated",
      value:
        stats.validated,
    },
    {
      title:
        "Pending",
      value:
        stats.pending,
    },
    {
      title:
        "Violated",
      value:
        stats.violated,
    },
  ];

  return (

    <div
      className="
      grid
      gap-4
      md:grid-cols-2
      lg:grid-cols-4
      "
    >

      {cards.map(
        (card) => (

          <Card
            key={card.title}
          >

            <CardHeader>

              <CardTitle
                className="
                text-sm
                text-slate-500
                "
              >
                {card.title}
              </CardTitle>

            </CardHeader>

            <CardContent>

              <p
                className="
                text-3xl
                font-bold
                "
              >
                {card.value}
              </p>

            </CardContent>

          </Card>
        ),
      )}

    </div>
  );
}