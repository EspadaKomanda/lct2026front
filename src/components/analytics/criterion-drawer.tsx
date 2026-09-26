"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/api/hooks";
import { listCriterionSessions } from "@/lib/api/modules/analytics";
import type { Criterion, Difficulty } from "@/lib/api/types";
import { CRITERION_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";
import { DataTable, Drawer, PageSpinner, Pagination, RankDots, SegmentControl, Notice, type Column } from "@/components/ui";

const LIMIT = 20;

export interface CriterionDrawerState {
  criterion: Criterion;
  groupId: string;
}

export interface CriterionFilters {
  scenario_version_id?: string;
  difficulty?: Difficulty;
  from?: string;
  to?: string;
}

interface CriterionDrawerProps {
  state: CriterionDrawerState | null;
  filters: CriterionFilters;
  onClose: () => void;
}

export function CriterionDrawer({ state, filters, onClose }: CriterionDrawerProps) {
  const router = useRouter();
  const [maxBand, setMaxBand] = useState("1");
  const [offset, setOffset] = useState(0);

  const drawerKey = state ? `${state.criterion}:${state.groupId}` : null;
  const [prevDrawerKey, setPrevDrawerKey] = useState(drawerKey);
  if (prevDrawerKey !== drawerKey) {
    setPrevDrawerKey(drawerKey);
    setMaxBand("1");
    setOffset(0);
  }

  const pageApi = useApi(
    () =>
      state
        ? listCriterionSessions(state.criterion, {
            group_id: [state.groupId],
            max_band: Number(maxBand),
            scenario_version_id: filters.scenario_version_id || undefined,
            difficulty: filters.difficulty || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
            limit: LIMIT,
            offset,
          })
        : Promise.resolve(null),
    [state, maxBand, offset, filters.scenario_version_id, filters.difficulty, filters.from, filters.to]
  );

  const page = pageApi.data;

  const columns: Column<NonNullable<typeof page>["items"][number]>[] = [
    {
      key: "started_at",
      title: "Дата",
      width: 130,
      render: (row) => formatDateTime(row.started_at),
    },
    {
      key: "person",
      title: "Сотрудник",
      render: (row) => row.person.display_name ?? row.person.number,
    },
    {
      key: "band",
      title: "Полоса",
      width: 110,
      render: (row) => <RankDots value={row.band} label={String(row.band)} />,
    },
    {
      key: "example",
      title: "Пример",
      render: (row) =>
        row.example ? (
          <span className="block max-w-[320px]">
            <span className="block truncate italic">«{row.example.quote}»</span>
            {row.example.observation && (
              <span className="block truncate text-dusk">{row.example.observation}</span>
            )}
          </span>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <Drawer
      open={state !== null}
      onClose={onClose}
      width={680}
      title={
        state ? (
          <>
            Сессии критерия <span className="text-dusk">«{CRITERION_LABEL[state.criterion]}»</span>
          </>
        ) : undefined
      }
    >
      {state && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-13 text-dusk">Полоса не выше</span>
            <SegmentControl
              value={maxBand}
              onChange={(v) => {
                setMaxBand(v);
                setOffset(0);
              }}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
              ]}
            />
          </div>

          {pageApi.error && <Notice variant="error" title={pageApi.error.problem.title} />}

          {pageApi.loading && !page ? (
            <PageSpinner />
          ) : page ? (
            <>
              <DataTable
                columns={columns}
                rows={page.items}
                rowKey={(row) => row.session_id}
                onRowClick={(row) => router.push(`/results/${row.session_id}`)}
                emptyText="Сессий с такой полосой нет"
              />
              <Pagination
                offset={page.page.offset}
                limit={page.page.limit}
                total={page.page.total}
                onOffsetChange={setOffset}
              />
              <p className="text-13 text-dusk">
                Сессии показаны по текущим фильтрам страницы «Статистика».
              </p>
            </>
          ) : null}
        </div>
      )}
    </Drawer>
  );
}
