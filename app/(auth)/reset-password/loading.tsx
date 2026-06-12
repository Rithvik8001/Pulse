import { AuthFrame } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordLoading() {
  return (
    <AuthFrame>
      <Card className="w-full gap-7 rounded-lg px-2 py-7 shadow-sm">
        <CardHeader className="items-center">
          <Skeleton className="size-12" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
