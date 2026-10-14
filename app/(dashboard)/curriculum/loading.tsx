import { Bar, HeaderSkeleton, Loading, TableSkeleton } from "../../../components/ui/Skeleton";

export default function CurriculumLoading() {
  return (
    <Loading>
      <HeaderSkeleton action />
      <Bar className="mb-6 h-10 w-64 rounded-lg bg-ink-100" />
      <Bar className="mb-6 h-11 w-full rounded-xl bg-ink-100" />
      <div className="space-y-6">
        <TableSkeleton title rows={4} columns={["w-20", "w-2/5", "w-10", "w-1/4"]} />
        <TableSkeleton title rows={4} columns={["w-20", "w-2/5", "w-10", "w-1/4"]} />
      </div>
    </Loading>
  );
}
