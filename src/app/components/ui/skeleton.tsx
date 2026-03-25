import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "skeleton-subtle-shimmer rounded-md bg-gray-200/70",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
