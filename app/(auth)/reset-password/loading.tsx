import { AuthFrame } from "@/components/auth/auth-form";
import { Bone } from "@/components/ui/skeleton";

export default function ResetPasswordLoading() {
  return (
    <AuthFrame>
      <div className="grid gap-5" aria-busy aria-label="Loading">
        <div className="grid justify-items-center gap-2">
          <Bone className="h-8 w-56" />
          <Bone className="h-5 w-48" />
        </div>
        <Bone className="h-field w-full" />
        <Bone className="h-field w-full" />
        <Bone className="h-control w-full" />
      </div>
    </AuthFrame>
  );
}
