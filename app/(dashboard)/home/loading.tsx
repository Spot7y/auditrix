import { Bar, CardSkeleton, HeaderSkeleton, Loading, StatTilesSkeleton } from "../../../components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <Loading>
      <HeaderSkeleton action />
      <Bar className="mb-4 h-6 w-40" />
      <StatTilesSkeleton />
      <CardSkeleton className="mt-4 p-5">
        <Bar className="h-5 w-48" />
        <Bar className="mt-2 h-3.5 w-3/4 bg-ink-100" />
        <Bar className="mt-6 h-6 w-full rounded-md bg-ink-100" />
      </CardSkeleton>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <CardSkeleton key={i} className="h-72 p-5">
            <Bar className="h-5 w-44" />
            <Bar className="mt-2 h-3.5 w-56 bg-ink-100" />
          </CardSkeleton>
        ))}
      </div>
    </Loading>
  );
}
