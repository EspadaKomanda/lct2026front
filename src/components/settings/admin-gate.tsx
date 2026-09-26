import type { ReactNode } from "react";
import type { Me } from "@/lib/api/types";
import { EmptyState, PageSpinner } from "@/components/ui";

export function AdminGate({ me, children }: { me: Me | null; children: ReactNode }) {
  if (!me) return <PageSpinner />;
  if (me.user.role !== "admin") {
    return <EmptyState icon="lock" text="Раздел для администратора" />;
  }
  return <>{children}</>;
}
