"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  {
    name: "Validated",
    value: 1204,
  },

  {
    name: "Pending",
    value: 214,
  },

  {
    name: "Violated",
    value: 48,
  },
];

const COLORS = [
  "#22c55e",
  "#facc15",
  "#ef4444",
];

export default function ComplianceChart() {

  return (
    <div
      className="
      h-[350px]
      w-full
      "
    >

      <ResponsiveContainer
        width="100%"
        height="100%"
      >

        <PieChart>

          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={110}
            dataKey="value"
            label
          >

            {data.map(
              (entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    COLORS[index]
                  }
                />
              )
            )}

          </Pie>

          <Tooltip />

        </PieChart>

      </ResponsiveContainer>

    </div>
  );
}