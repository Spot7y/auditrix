import { HeaderSkeleton, Loading, StatTilesSkeleton, TableSkeleton } from "../../../../components/ui/Skeleton";

export default function StudentAuditLoading() {
  return (
    <Loading>
      <HeaderSkeleton back eyebrow action />
      <StatTilesSkeleton />
      <div className="mt-6 space-y-6">
        <TableSkeleton title rows={5} columns={["w-20", "w-2/5", "w-10", "w-10", "w-1/5"]} />
        <TableSkeleton title rows={4} columns={["w-20", "w-2/5", "w-10", "w-10", "w-1/5"]} />
      </div>
    </Loading>
  );
}
