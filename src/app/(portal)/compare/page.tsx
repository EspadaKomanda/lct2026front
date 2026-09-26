"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import { getComparison } from "@/lib/api/modules/analytics";
import { getSession } from "@/lib/api/modules/sessions";
import { listVersions } from "@/lib/api/modules/scenarios";
import { CRITERION_LABEL, DIFFICULTY_LABEL, MODE_LABEL } from "@/lib/labels";
import { cx } from "@/lib/utils";
import {
  Badge,
  Button,
  EmptyState,
  FinalRank,
  Notice,
  PageSpinner,
  RankDots,
  SegmentControl,
} from "@/components/ui";
import { CRITERIA } from "@/components/results/criteria";
import { SessionFlagBadges } from "@/components/results/flag-badges";

function CompareInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const idsKey = ids.join(",");
  const [sort, setSort] = useState<"result" | "process">("result");

  const { data, loading, error } = useApi(async () => {
    if (ids.length === 0) {
      throw new ApiError({ type: "no_ids", title: "Не выбраны сессии для сравнения", status: 0 });
    }
    const first = await getSession(ids[0]);
    const versions = await listVersions(first.header.scenario_id);
    const version = versions.find((v) => v.number === first.header.version_number);
    if (!first.group_id || !version) {
      throw new ApiError({
        type: "no_conditions",
        title: "Не удалось определить условия сравнения",
        status: 0,
      });
    }
    return getComparison({
      group_id: first.group_id,
      scenario_version_id: version.id,
      difficulty: first.header.difficulty,
      criteria_set: first.header.criteria_set,
      scoring_profile: first.header.scoring_profile ?? "normal",
      sort,
    });
  }, [idsKey, sort]);

  if (loading) return <PageSpinner />;
  if (error) {
    if (error.problem.type === "forbidden_group") {
      return (
        <EmptyState
          icon="lock"
          text="Нет доступа к результатам группы. Доступ выдаёт администратор"
        />
      );
    }
    return (
      <div className="flex flex-col items-start gap-3">
        <Notice variant="error" title={error.problem.title} />
        <Button variant="secondary" size="sm" onClick={() => router.push("/results")}>
          К результатам
        </Button>
      </div>
    );
  }
  if (!data) return null;

  if (!data.complete) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-medium">Сравнение</h1>
        <EmptyState
          icon="users"
          text="Сравнение недоступно: выбранные сессии не образуют единый набор условий (сценарий, версия, уровень, режим, профиль оценки). Выберите попытки в одинаковых условиях или откройте одну из доступных комбинаций ниже."
        />
        {data.available_conditions.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">Доступные комбинации условий</h2>
            {data.available_conditions.map((c, i) => (
              <button
                key={`${c.scenario_version_id}-${c.difficulty}-${c.mode}-${i}`}
                type="button"
                onClick={() =>
                  router.push(
                    `/results?scenario_id=${c.scenario_id ?? ""}&difficulty=${c.difficulty}&mode=${c.mode}`
                  )
                }
                className="text-left bg-surface rounded-card border border-line p-3 hover:border-accent transition-colors"
              >
                <span className="text-sm">
                  {MODE_LABEL[c.mode]} · {c.scenario_title ?? "Сценарий"} · версия{" "}
                  {c.version_number ?? "—"} · {DIFFICULTY_LABEL[c.difficulty]} · {c.criteria_set}
                </span>
                <span className="block text-xs text-dusk mt-0.5">
                  {c.sessions_n} сессий в этих условиях — открыть список
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const condition = data.conditions[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-medium mr-auto">Сравнение</h1>
        <Button variant="secondary" onClick={() => router.push("/results")}>
          Изменить выбор
        </Button>
      </div>

      {condition && (
        <p className="text-13 text-dusk">
          {MODE_LABEL[condition.mode]} · {condition.scenario_title ?? "Сценарий"} · версия{" "}
          {condition.version_number ?? "—"} · {DIFFICULTY_LABEL[condition.difficulty]} ·{" "}
          {condition.criteria_set}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SegmentControl
          value={sort}
          onChange={(v) => setSort(v as "result" | "process")}
          options={[
            { value: "result", label: "по результату" },
            { value: "process", label: "по процессу" },
          ]}
        />
        {data.sample?.small && <Badge variant="smallData">мало данных</Badge>}
      </div>

      {data.training_note && <p className="text-xs text-dusk">{data.training_note}</p>}
      {data.simplified_excluded !== undefined && data.simplified_excluded > 0 && (
        <p className="text-xs text-dusk">
          Упрощённые сессии исключены из сравнения: {data.simplified_excluded}
        </p>
      )}

      <div className="bg-surface rounded-card border border-line overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="h-10 px-4 bg-frost text-13 font-medium border-b border-line text-left w-[200px]">
                Показатель
              </th>
              {data.rows.map((r) => {
                const selected = ids.includes(r.last_session_id);
                return (
                  <th
                    key={r.person.subject_id}
                    className={cx(
                      "h-10 px-4 bg-frost text-13 font-medium border-b border-line text-left",
                      selected && "bg-frost"
                    )}
                  >
                    <a
                      href={`/results/${r.last_session_id}`}
                      className="text-accent hover:underline font-medium"
                    >
                      {r.person.display_name ?? r.person.number}
                    </a>
                    <span className="block text-xs text-dusk font-normal">
                      {r.attempts} попыток
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="h-11 px-4 border-b border-line text-13">Результат</td>
              {data.rows.map((r) => (
                <td
                  key={r.person.subject_id}
                  className={cx("h-11 px-4 border-b border-line text-13", ids.includes(r.last_session_id) && "bg-frost")}
                >
                  {r.score_columns.result_rank ? (
                    <FinalRank
                      rank={r.score_columns.result_rank}
                      size="sm"
                      titleClassName="max-w-[160px]"
                      title={
                        <span className="block truncate max-w-[160px]">
                          {r.score_columns.final_title ?? "—"}
                        </span>
                      }
                    />
                  ) : (
                    "—"
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="h-11 px-4 border-b border-line text-13">Процесс</td>
              {data.rows.map((r) => (
                <td
                  key={r.person.subject_id}
                  className={cx("h-11 px-4 border-b border-line text-13", ids.includes(r.last_session_id) && "bg-frost")}
                >
                  {r.score_columns.process_number !== null ? (
                    <span className="font-medium">{r.score_columns.process_number}</span>
                  ) : (
                    "—"
                  )}
                </td>
              ))}
            </tr>
            {CRITERIA.map((c) => (
              <tr key={c}>
                <td className="h-11 px-4 border-b border-line text-13">{CRITERION_LABEL[c]}</td>
                {data.rows.map((r) => (
                  <td
                    key={r.person.subject_id}
                    className={cx("h-11 px-4 border-b border-line text-13", ids.includes(r.last_session_id) && "bg-frost")}
                  >
                    <RankDots value={r.score_columns.criteria_bands?.[c] ?? 0} />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="h-11 px-4 border-b border-line text-13">Пометки</td>
              {data.rows.map((r) => (
                <td
                  key={r.person.subject_id}
                  className={cx("h-11 px-4 border-b border-line text-13", ids.includes(r.last_session_id) && "bg-frost")}
                >
                  <SessionFlagBadges flags={r.flags} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <CompareInner />
    </Suspense>
  );
}
