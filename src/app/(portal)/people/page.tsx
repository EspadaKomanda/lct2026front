"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionListItem } from "@/lib/api/types";
import { getMe } from "@/lib/api/modules/auth";
import { listGroups, listPeople } from "@/lib/api/modules/people";
import { listSessions } from "@/lib/api/modules/sessions";
import { useApi } from "@/lib/api/hooks";
import { cx, formatDate } from "@/lib/utils";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  FinalRank,
  Icon,
  Menu,
  Notice,
  PageSpinner,
  type Column,
} from "@/components/ui";
import type { Person } from "@/lib/api/types";
import { GroupFormModal, PersonFormModal } from "@/components/people";

interface SubjectStats {
  latest: SessionListItem;
  count: number;
}

export default function PeoplePage() {
  const router = useRouter();
  const me = useApi(getMe, []);
  const isAdmin = me.data?.user.role === "admin";

  const groups = useApi(listGroups, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeGroup =
    groups.data?.find((g) => g.id === selectedId) ??
    groups.data?.find((g) => g.has_access) ??
    groups.data?.[0] ??
    null;

  const people = useApi(
    () => (activeGroup ? listPeople({ group_id: activeGroup.id, limit: 200 }) : Promise.resolve(null)),
    [activeGroup?.id],
  );
  const sessions = useApi(
    () =>
      activeGroup
        ? listSessions({ group_id: activeGroup.id, limit: 200, sort: "started_at_desc" })
        : Promise.resolve(null),
    [activeGroup?.id],
  );

  const statsBySubject = useMemo(() => {
    const map = new Map<string, SubjectStats>();
    for (const s of sessions.data?.items ?? []) {
      const cur = map.get(s.person.subject_id);
      if (cur) cur.count += 1;
      else map.set(s.person.subject_id, { latest: s, count: 1 });
    }
    return map;
  }, [sessions.data]);

  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);

  const reloadAll = () => {
    people.reload();
    groups.reload();
    sessions.reload();
  };

  const columns: Column<Person>[] = [
    {
      key: "person",
      title: "Сотрудник",
      render: (p) => (
        <span className="flex flex-col">
          <span className="flex items-center gap-2">
            <span className="font-medium">{p.full_name ?? p.pseudonym ?? p.number}</span>
            {!p.full_name && <Badge variant="training">псевдоним</Badge>}
          </span>
          <span className="text-xs text-dusk">{p.number}</span>
        </span>
      ),
    },
    {
      key: "job_title",
      title: "Должность",
      render: (p) => p.job_title ?? "—",
    },
    {
      key: "personnel_no",
      title: "Табельный",
      render: (p) => p.personnel_no ?? "—",
    },
    {
      key: "last_attempt",
      title: "Последняя попытка",
      render: (p) => {
        const stat = statsBySubject.get(p.subject_id);
        if (!stat) return "—";
        const sc = stat.latest.score_columns;
        return (
          <span className="flex items-center gap-2">
            {sc.result_rank ? (
              <FinalRank rank={sc.result_rank} size="sm" />
            ) : (
              <span className="text-dusk">—</span>
            )}
            <span className="flex flex-col min-w-0">
              <span className="truncate">{stat.latest.header.scenario_title}</span>
              <span className="text-xs text-dusk">{formatDate(stat.latest.header.started_at)}</span>
            </span>
          </span>
        );
      },
    },
    {
      key: "attempts",
      title: "Тестирований",
      align: "right",
      render: (p) => statsBySubject.get(p.subject_id)?.count ?? 0,
    },
  ];

  return (
    <div className="flex gap-6 items-start">
      <aside className="w-[280px] shrink-0 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-medium">Люди</h1>
          {isAdmin && (
            <Menu
              triggerTitle="Действия с группами"
              items={[
                { key: "add-person", label: "Добавить сотрудника", icon: "user", onClick: () => setAddPersonOpen(true) },
                { key: "add-group", label: "Добавить группу", icon: "users", onClick: () => setAddGroupOpen(true) },
              ]}
            />
          )}
        </div>
        {groups.error && (
          <Notice
            variant="error"
            message={groups.error.problem.title}
            className="mb-2"
          />
        )}
        <Button variant="text" size="xs" onClick={groups.reload} className="self-start mb-1">
          <Icon name="repeat" size={14} /> Обновить
        </Button>
        {(groups.data ?? []).map((g) => {
          const disabled = !g.has_access;
          return (
            <button
              key={g.id}
              type="button"
              disabled={disabled}
              title={disabled ? "Нет доступа" : g.name}
              onClick={() => setSelectedId(g.id)}
              className={cx(
                "w-full text-left p-2.5 rounded-field flex flex-col gap-0.5 transition-colors",
                activeGroup?.id === g.id ? "bg-frost" : "hover:bg-frost/60",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {disabled && <Icon name="lock" size={14} className="text-gray shrink-0" />}
                <span className="truncate">{g.name}</span>
              </span>
              <span className="text-xs text-dusk">
                {g.people_count ?? 0} человек · {g.trainer_profile_name ?? "профиль по умолчанию"}
              </span>
            </button>
          );
        })}
        {groups.data && groups.data.length === 0 && (
          <EmptyState icon="users" text="Групп пока нет" />
        )}
      </aside>

      <section className="flex-1 min-w-0 flex flex-col gap-4">
        {activeGroup && (
          <div>
            <h2 className="text-xl font-medium">{activeGroup.name}</h2>
            <p className="text-13 text-dusk mt-1">
              Профиль тренажёра: {activeGroup.trainer_profile_name ?? "по умолчанию"}
            </p>
          </div>
        )}

        {people.error && (
          <Notice
            variant="error"
            message={people.error.problem.title}
          />
        )}
        {sessions.error && (
          <Notice
            variant="error"
            message={sessions.error.problem.title}
          />
        )}

        {people.loading ? (
          <PageSpinner />
        ) : people.data && people.data.items.length === 0 ? (
          <EmptyState icon="users" text="В этой группе пока нет сотрудников" />
        ) : (
          <DataTable
            columns={columns}
            rows={people.data?.items ?? []}
            rowKey={(p) => p.subject_id}
            onRowClick={(p) => router.push(`/people/${p.subject_id}`)}
            emptyText="В этой группе пока нет сотрудников"
          />
        )}
      </section>

      {groups.data && (
        <PersonFormModal
          open={addPersonOpen}
          onClose={() => setAddPersonOpen(false)}
          groups={groups.data}
          onSaved={reloadAll}
        />
      )}
      <GroupFormModal
        open={addGroupOpen}
        onClose={() => setAddGroupOpen(false)}
        onSaved={() => groups.reload()}
      />
    </div>
  );
}
