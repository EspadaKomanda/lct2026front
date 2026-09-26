"use client";

import { useRouter } from "next/navigation";
import type { Criterion, FinalRank, GroupAnalytics } from "@/lib/api/types";
import { CRITERION_LABEL } from "@/lib/labels";
import { cx, formatNumber } from "@/lib/utils";
import { Badge, Card, FinalRank as FinalRankBadge, StatBar } from "@/components/ui";

const RANKS: FinalRank[] = ["S", "A", "B", "C", "D", "F"];

export interface GroupAnalyticsSectionProps {
  analytics: GroupAnalytics;
  onCriterionClick: (criterion: Criterion, groupId: string) => void;
}

function binLabel(i: number): string {
  return i === 9 ? "90–100" : `${i * 10}–${i * 10 + 9}`;
}

function Histogram({ numbers }: { numbers: number[] }) {
  const max = Math.max(1, ...numbers);
  if (numbers.reduce((a, b) => a + b, 0) === 0) {
    return <p className="text-13 text-dusk py-2">Нет данных</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {numbers.map((n, i) => (
        <StatBar key={i} label={binLabel(i)} share={n / max} value={n} />
      ))}
    </div>
  );
}

export function GroupAnalyticsSection({ analytics, onCriterionClick }: GroupAnalyticsSectionProps) {
  const router = useRouter();
  const { sample } = analytics;
  const finals = RANKS.map((r) => ({ rank: r, n: analytics.result_ranks[r] ?? 0 })).filter((f) => f.n > 0);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-13 text-dusk">{analytics.group_name}</span>
        {analytics.headline && (
          <h2 className="text-base font-semibold leading-tight">{analytics.headline}</h2>
        )}
        {sample.small && (
          <Badge variant="smallData">Мало данных (n = {sample.n})</Badge>
        )}
      </div>

      {analytics.empty_note && (
        <p className="text-13 text-dusk">{analytics.empty_note}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card bordered className="p-5 flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <h3 className="text-base font-semibold">Слабые места группы</h3>
            <span className="text-13 text-dusk">из 4, слабые сверху</span>
          </div>
          {analytics.weak_criteria.length === 0 ? (
            <p className="text-13 text-dusk py-2">Нет данных</p>
          ) : (
            analytics.weak_criteria.map((w) => (
              <button
                key={w.criterion}
                type="button"
                title="Открыть сессии критерия"
                onClick={() => onCriterionClick(w.criterion, analytics.group_id)}
                className={cx(
                  "grid grid-cols-[minmax(0,1fr)_140px_64px] gap-3 items-center h-8 px-1 -mx-1 rounded-field",
                  "text-left text-sm hover:bg-bg transition-colors"
                )}
              >
                <span className="truncate text-dusk">{CRITERION_LABEL[w.criterion]}</span>
                <span className="h-2 rounded-[2px] bg-frost overflow-hidden">
                  <span
                    className="block h-full rounded-[2px] bg-accent"
                    style={{ width: `${Math.min(100, Math.max(0, (w.avg_band / 4) * 100))}%` }}
                  />
                </span>
                <span className="font-medium text-right">{formatNumber(w.avg_band, 1)}</span>
              </button>
            ))
          )}
        </Card>

        <Card bordered className="p-5 flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <h3 className="text-base font-semibold">Финалы</h3>
            <span className="text-13 text-dusk">сессий</span>
          </div>
          {finals.length === 0 ? (
            <p className="text-13 text-dusk py-2">Нет данных</p>
          ) : (
            finals.map((f) => (
              <button
                key={f.rank}
                type="button"
                title="Открыть в результатах"
                onClick={() => router.push(`/results?final=${encodeURIComponent(f.rank)}`)}
                className={cx(
                  "grid grid-cols-[minmax(0,1fr)_140px_64px] gap-3 items-center h-8 px-1 -mx-1 rounded-field",
                  "text-left text-sm hover:bg-bg transition-colors"
                )}
              >
                <span className="flex items-center">
                  <FinalRankBadge rank={f.rank} size="sm" />
                </span>
                <span className="h-2 rounded-[2px] bg-frost overflow-hidden">
                  <span
                    className="block h-full rounded-[2px] bg-accent"
                    style={{ width: `${sample.n > 0 ? Math.min(100, (f.n / sample.n) * 100) : 0}%` }}
                  />
                </span>
                <span className="font-medium text-right">{f.n}</span>
              </button>
            ))
          )}
        </Card>

        <Card bordered className="p-5 flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <h3 className="text-base font-semibold">Оценка результата, из 100</h3>
          </div>
          <Histogram numbers={analytics.result_numbers} />
        </Card>

        <Card bordered className="p-5 flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <h3 className="text-base font-semibold">Процесс, из 100</h3>
          </div>
          <Histogram numbers={analytics.process_numbers} />
        </Card>
      </div>
    </section>
  );
}
