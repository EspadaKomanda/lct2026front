"use client";

import { useState } from "react";
import { getMe } from "@/lib/api/modules/auth";
import { listAuditEntries, exportAuditLog } from "@/lib/api/modules/audit";
import { listGroups } from "@/lib/api/modules/people";
import { listUsers } from "@/lib/api/modules/users";
import { useApi } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import type { AuditAction, AuditEntry } from "@/lib/api/types";
import { AUDIT_ACTION_LABEL } from "@/lib/labels";
import { formatDateTime, formatNumber } from "@/lib/utils";
import {
  Badge,
  Button,
  DataTable,
  Input,
  Notice,
  PageSpinner,
  Pagination,
  SearchInput,
  Select,
  useToast,
  type Column,
} from "@/components/ui";
import { AdminGate } from "@/components/settings/admin-gate";
import { AUDIT_ACTION_OPTIONS } from "@/components/settings/labels";

const LIMIT = 20;

interface AuditFilters {
  from: string;
  to: string;
  actor_user_id: string;
  group_id: string;
  subject_number: string;
  action: string;
  outcome: string;
}

const EMPTY_FILTERS: AuditFilters = {
  from: "",
  to: "",
  actor_user_id: "",
  group_id: "",
  subject_number: "",
  action: "",
  outcome: "",
};

export default function AuditPage() {
  const meQ = useApi(() => getMe(), []);
  return (
    <AdminGate me={meQ.data}>
      <AuditContent />
    </AdminGate>
  );
}

function AuditContent() {
  const toast = useToast();
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [offset, setOffset] = useState(0);

  const usersQ = useApi(() => listUsers(), []);
  const groupsQ = useApi(() => listGroups(), []);

  const params = {
    from: filters.from || undefined,
    to: filters.to || undefined,
    actor_user_id: filters.actor_user_id || undefined,
    group_id: filters.group_id || undefined,
    subject_number: filters.subject_number.trim() || undefined,
    action: (filters.action || undefined) as AuditAction | undefined,
    outcome: (filters.outcome || undefined) as "ok" | "denied" | undefined,
    limit: LIMIT,
    offset,
  };
  const auditQ = useApi(() => listAuditEntries(params), [JSON.stringify(params)]);

  const patchFilters = (patch: Partial<AuditFilters>) => {
    setOffset(0);
    setFilters((f) => ({ ...f, ...patch }));
  };

  const onExport = async () => {
    try {
      const file = await exportAuditLog({
        from: filters.from || undefined,
        to: filters.to || undefined,
        actor_user_id: filters.actor_user_id || undefined,
        group_id: filters.group_id || undefined,
        subject_number: filters.subject_number.trim() || undefined,
        action: (filters.action || undefined) as AuditAction | undefined,
      });
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename ?? "audit-log.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.show(
        file.rowsCount !== null
          ? `Журнал выгружен: ${formatNumber(file.rowsCount)} строк`
          : "Журнал выгружен",
      );
      auditQ.reload();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.problem.title : "Не удалось выгрузить журнал");
    }
  };

  const columns: Column<AuditEntry>[] = [
    {
      key: "occurred_at",
      title: "Время",
      width: 150,
      render: (a) => formatDateTime(a.occurred_at),
    },
    {
      key: "actor",
      title: "Кто",
      render: (a) => (
        <span className="inline-flex items-center gap-2 flex-wrap">
          <span>{a.actor_name ?? "—"}</span>
          {a.actor_kind === "participant" && <Badge variant="demo" icon="dot">участник</Badge>}
          {a.actor_kind === "system" && <Badge variant="statusGray">система</Badge>}
        </span>
      ),
    },
    {
      key: "action",
      title: "Действие",
      render: (a) => AUDIT_ACTION_LABEL[a.action],
    },
    {
      key: "outcome",
      title: "Результат",
      width: 130,
      render: (a) =>
        a.outcome === "ok" ? (
          <Badge variant="reviewed" icon="check">ок</Badge>
        ) : (
          <Badge variant="violation" icon="x">отказано</Badge>
        ),
    },
    {
      key: "subject_number",
      title: "Участник",
      render: (a) => a.subject_number ?? "—",
    },
    {
      key: "group_name",
      title: "Группа",
      render: (a) => a.group_name ?? "—",
    },
    {
      key: "session_id",
      title: "Сессия",
      render: (a) =>
        a.session_id ? (
          <a
            href={`/results/${a.session_id}`}
            className="text-accent hover:text-accent-hover"
            onClick={(e) => e.stopPropagation()}
          >
            открыть
          </a>
        ) : (
          "—"
        ),
    },
    {
      key: "rows_count",
      title: "Строк",
      align: "right",
      width: 80,
      render: (a) => (a.rows_count != null ? formatNumber(a.rows_count) : "—"),
    },
  ];

  const page = auditQ.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-medium leading-tight">Журнал действий</h1>
        <Button variant="secondary" className="ml-auto" onClick={onExport}>
          Выгрузить CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Период с"
          type="datetime-local"
          value={filters.from}
          onChange={(e) => patchFilters({ from: e.target.value })}
          className="w-[220px]"
        />
        <Input
          label="по"
          type="datetime-local"
          value={filters.to}
          onChange={(e) => patchFilters({ to: e.target.value })}
          className="w-[220px]"
        />
        <Select
          label="Пользователь"
          value={filters.actor_user_id}
          onChange={(v) => patchFilters({ actor_user_id: v })}
          placeholder="Все"
          options={(usersQ.data ?? []).map((u) => ({ value: u.id, label: u.full_name }))}
          className="w-[240px]"
        />
        <Select
          label="Группа"
          value={filters.group_id}
          onChange={(v) => patchFilters({ group_id: v })}
          placeholder="Все"
          options={(groupsQ.data ?? []).map((g) => ({ value: g.id, label: g.name }))}
          className="w-[220px]"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-medium">Номер участника</span>
          <SearchInput
            value={filters.subject_number}
            onChange={(e) => patchFilters({ subject_number: e.target.value })}
            placeholder="N-3Q7KD1"
            className="w-[220px]"
          />
        </div>
        <Select
          label="Действие"
          value={filters.action}
          onChange={(v) => patchFilters({ action: v })}
          placeholder="Все"
          options={AUDIT_ACTION_OPTIONS}
          className="w-[260px]"
        />
        <Select
          label="Результат"
          value={filters.outcome}
          onChange={(v) => patchFilters({ outcome: v })}
          placeholder="Все"
          options={[
            { value: "ok", label: "ок" },
            { value: "denied", label: "отказано" },
          ]}
          className="w-[160px]"
        />
      </div>

      {auditQ.error ? (
        <Notice variant="error" title={auditQ.error.problem.title} />
      ) : auditQ.loading && !page ? (
        <PageSpinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={page?.items ?? []}
            rowKey={(a) => a.id}
            emptyText="Записей нет"
          />
          {page && (
            <Pagination
              offset={page.page.offset}
              limit={page.page.limit}
              total={page.page.total}
              onOffsetChange={setOffset}
            />
          )}
        </>
      )}
    </div>
  );
}
