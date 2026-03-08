import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-card via-border/50 to-card bg-[length:200%_100%] rounded-md",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
