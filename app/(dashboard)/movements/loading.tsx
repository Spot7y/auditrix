import { HeaderSkeleton, Loading, TableSkeleton } from "../../../components/ui/Skeleton";

export default function MovementsLoading() {
  return (
    <Loading>
      <HeaderSkeleton />
      <TableSkeleton toolbar rows={8} columns={["w-1/4", "w-1/6", "w-1/5", "w-1/6", "w-1/12"]} />
    </Loading>
  );
}
