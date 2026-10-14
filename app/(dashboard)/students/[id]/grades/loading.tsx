import { Bar, CardSkeleton, HeaderSkeleton, Loading, TableSkeleton } from "../../../../../components/ui/Skeleton";

export default function GradeEntryLoading() {
  return (
    <Loading className="mx-auto max-w-4xl">
      <HeaderSkeleton back eyebrow />
      <CardSkeleton className="mb-6 p-5">
        <Bar className="h-5 w-40" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Bar key={i} className="h-10 rounded-lg bg-ink-100" />
          ))}
        </div>
      </CardSkeleton>
      <TableSkeleton title rows={5} columns={["w-20", "w-2/5", "w-1/6", "w-1/6"]} />
    </Loading>
  );
}
