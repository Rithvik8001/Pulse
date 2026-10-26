import { cn } from "@/lib/utils";

function Bone({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bone"
      aria-hidden
      className={cn("rounded-bone bg-fill-2", className)}
      {...props}
    />
  );
}

const Skeleton = Bone;

export { Bone, Skeleton };
