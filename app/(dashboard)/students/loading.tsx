import { HeaderSkeleton, Loading, TableSkeleton } from "../../../components/ui/Skeleton";

export default function StudentsLoading() {
  return (
    <Loading>
      <HeaderSkeleton action />
      <TableSkeleton toolbar rows={10} columns={["w-1/3", "w-1/6", "w-1/6", "w-1/12", "w-1/12"]} />
    </Loading>
  );
}
