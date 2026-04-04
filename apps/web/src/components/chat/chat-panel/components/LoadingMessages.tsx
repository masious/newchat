import { Skeleton } from "@/components/ui/skeleton";

export function LoadingMessages() {
  return (
    <>
      <div className="flex justify-start">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-10 w-48 rounded-2xl" />
        </div>
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-40 rounded-2xl" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-10 w-56 rounded-2xl" />
      </div>
      <div className="flex justify-end">
        <div className="flex flex-col gap-1.5 items-end">
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-10 w-44 rounded-2xl" />
      </div>
    </>
  );
}
