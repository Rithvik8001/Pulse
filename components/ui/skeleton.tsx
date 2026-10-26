import { cn } from "@/lib/utils";

/** A fill-2 block at the bone radius. Never shimmers. */
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

/** Legacy name; same component. */
const Skeleton = Bone;

export { Bone, Skeleton };
