import type { SessionFlags } from "@/lib/api/types";
import { cx } from "@/lib/utils";
import { Badge } from "@/components/ui";

export function SessionFlagBadges({
  flags,
  className,
}: {
  flags: SessionFlags;
  className?: string;
}) {
  const violations = flags.opponent_violation_count ?? 0;
  return (
    <span className={cx("inline-flex flex-wrap items-center gap-1", className)}>
      {flags.lucky && <Badge variant="lucky">Повезло</Badge>}
      {flags.simplified && <Badge variant="simplified">Упрощённо</Badge>}
      {violations > 0 && (
        <Badge variant="violation">
          Нарушения оппонента{violations > 1 ? `: ${violations}` : ""}
        </Badge>
      )}
      {flags.has_objection && <Badge variant="objection">Возражение</Badge>}
      {flags.reviewed && <Badge variant="reviewed">Просмотрена</Badge>}
    </span>
  );
}
