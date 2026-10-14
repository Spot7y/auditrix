import { HeaderSkeleton, Loading, TableSkeleton } from "../../../../../components/ui/Skeleton";

export default function LogbookLoading() {
  return (
    <Loading className="mx-auto max-w-4xl">
      <HeaderSkeleton back eyebrow />
      <TableSkeleton title rows={8} columns={["w-24", "w-1/5", "w-1/3", "w-1/6"]} />
    </Loading>
  );
}
