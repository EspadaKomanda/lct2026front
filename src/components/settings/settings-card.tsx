import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export function SettingsCard({
  title,
  hint,
  action,
  children,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card bordered className="p-6">
      <div className="flex items-center justify-between gap-4 mb-1">
        <h2 className="text-base font-medium">{title}</h2>
        {action}
      </div>
      {hint !== undefined && <p className="text-xs text-dusk mb-3">{hint}</p>}
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}
