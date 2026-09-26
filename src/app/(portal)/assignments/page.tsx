"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  Menu,
  Modal,
  Notice,
  PageSpinner,
  Pagination,
  Select,
  useToast,
  type BadgeVariant,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import {
  cancelAssignment,
  listAssignments,
  reissueCodes,
  unblockAssignmentCode,
  updateAssignment,
  type AssignmentListParams,
} from "@/lib/api/modules/assignments";
import { getMe } from "@/lib/api/modules/auth";
import { listGroups } from "@/lib/api/modules/people";
import { listScenarios } from "@/lib/api/modules/scenarios";
import type { Assignment, AssignmentCreateResult, AssignmentStatus } from "@/lib/api/types";
import { ASSIGNMENT_STATUS_LABEL, DIFFICULTY_LABEL, MODE_LABEL } from "@/lib/labels";
import { cx, formatDate } from "@/lib/utils";
import { CodesPanel } from "@/components/assignments/codes-panel";
import { CreateTestingDrawer } from "@/components/assignments/create-testing-drawer";

const LIMIT = 20;

const STATUS_VARIANT: Record<AssignmentStatus, BadgeVariant> = {
  not_started: "statusGray",
  in_progress: "default",
  passed: "reviewed",
  abandoned: "objection",
  expired: "archived",
  cancelled: "statusGray",
  code_blocked: "violation",
};

const isOverdue = (a: Assignment) =>
  Date.parse(a.due_at) < Date.now() && a.status !== "passed" && a.status !== "cancelled";

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface CodesState {
  result: AssignmentCreateResult;
  title: string;
  skippedNames: Record<string, string>;
}

export default function AssignmentsPage() {
  const toast = useToast();
  const [groupId, setGroupId] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [extendTarget, setExtendTarget] = useState<Assignment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Assignment | null>(null);
  const [codes, setCodes] = useState<CodesState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const me = useApi(getMe, []);
  const isAdmin = me.data?.user.role === "admin";

  const assignments = useApi(
    () =>
      listAssignments({
        group_id: groupId || undefined,
        scenario_id: scenarioId || undefined,
        mode: mode || undefined,
        status: (status || undefined) as AssignmentStatus | undefined,
        limit: LIMIT,
        offset,
      } as AssignmentListParams),
    [groupId, scenarioId, mode, status, offset],
  );
  const { reload } = assignments;

  const groups = useApi(() => listGroups(), []);
  const scenarios = useApi(() => listScenarios({ status: "published", limit: 200 }), []);

  const resetFilters = () => {
    setGroupId("");
    setScenarioId("");
    setMode("");
    setStatus("");
    setOffset(0);
  };

  const filtersActive = !!(groupId || scenarioId || mode || status);

  const failToast = (e: unknown, fallback: string) =>
    toast.show(e instanceof ApiError ? e.problem.title : fallback);

  const handleReissue = async (a: Assignment) => {
    setBusyId(a.id);
    try {
      const result = await reissueCodes([a.id]);
      setCodes({ result, title: "Коды перевыпущены", skippedNames: {} });
      reload();
    } catch (e) {
      failToast(e, "Не удалось перевыпустить код");
    } finally {
      setBusyId(null);
    }
  };

  const handleUnblock = async (a: Assignment) => {
    setBusyId(`${a.id}:unblock`);
    try {
      await unblockAssignmentCode(a.id);
      toast.show("Код разблокирован");
      reload();
    } catch (e) {
      failToast(e, "Не удалось разблокировать код");
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<Assignment>[] = [
    {
      key: "person",
      title: "Кому",
      render: (a) => (
        <div className="flex flex-col py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm">{a.person.display_name ?? "Обезличен"}</span>
            {a.person.is_pseudonym && <Badge variant="training">только тренировка</Badge>}
          </div>
          <span className="text-xs text-dusk">{a.person.number}</span>
        </div>
      ),
    },
    {
      key: "scenario",
      title: "Сценарий",
      render: (a) => (
        <div className="flex flex-col py-1.5">
          <span className="text-13">{a.scenario_title ?? "—"}</span>
          <span className="text-xs text-dusk">версия {a.version_number}</span>
        </div>
      ),
    },
    {
      key: "difficulty",
      title: "Уровень",
      render: (a) => DIFFICULTY_LABEL[a.difficulty].toLowerCase(),
    },
    {
      key: "mode",
      title: "Режим",
      render: (a) => <Badge variant={a.mode}>{MODE_LABEL[a.mode]}</Badge>,
    },
    {
      key: "due",
      title: "Срок",
      render: (a) => (
        <span className={cx(isOverdue(a) && "text-danger")}>{formatDate(a.due_at)}</span>
      ),
    },
    {
      key: "attempts",
      title: "Попыток",
      align: "center",
      render: (a) => a.attempts ?? 0,
    },
    {
      key: "status",
      title: "Статус",
      render: (a) => <Badge variant={STATUS_VARIANT[a.status]}>{ASSIGNMENT_STATUS_LABEL[a.status]}</Badge>,
    },
    {
      key: "code",
      title: "Код",
      render: (a) => {
        const blocked = a.status === "code_blocked" || !!a.code?.blocked_at;
        if (blocked) {
          return (
            <div className="flex items-center gap-2">
              <Badge variant="violation">код заблокирован</Badge>
              {isAdmin && (
                <Button
                  size="xs"
                  variant="secondary"
                  loading={busyId === `${a.id}:unblock`}
                  onClick={() => void handleUnblock(a)}
                >
                  Разблокировать
                </Button>
              )}
            </div>
          );
        }
        return <span className="text-dusk">{a.code ? "выдан" : "—"}</span>;
      },
    },
    {
      key: "actions",
      title: "",
      align: "right",
      render: (a) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Menu
            items={[
              {
                key: "extend",
                label: "Продлить",
                icon: "clock",
                onClick: () => setExtendTarget(a),
              },
              {
                key: "reissue",
                label: "Перевыпустить код",
                icon: "repeat",
                disabled: a.status === "cancelled" || a.status === "passed",
                onClick: () => void handleReissue(a),
              },
              {
                key: "cancel",
                label: "Отменить",
                icon: "stop",
                danger: true,
                disabled: a.status === "cancelled",
                onClick: () => setCancelTarget(a),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const closeCodes = () => {
    setCodes(null);
    setDrawerOpen(false);
    reload();
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium">Назначения</h1>
        <Button onClick={() => setDrawerOpen(true)}>
          <Icon name="plus" size={16} />
          Назначить тестирование
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          placeholder="Все группы"
          value={groupId}
          onChange={(v) => {
            setGroupId(v);
            setOffset(0);
          }}
          options={(groups.data ?? [])
            .filter((g) => g.has_access)
            .map((g) => ({ value: g.id, label: g.name }))}
          className="w-52"
        />
        <Select
          placeholder="Все сценарии"
          value={scenarioId}
          onChange={(v) => {
            setScenarioId(v);
            setOffset(0);
          }}
          options={(scenarios.data?.items ?? []).map((s) => ({ value: s.id, label: s.title }))}
          className="w-60"
        />
        <Select
          placeholder="Все режимы"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setOffset(0);
          }}
          options={[
            { value: "training", label: MODE_LABEL.training },
            { value: "assessment", label: MODE_LABEL.assessment },
          ]}
          className="w-44"
        />
        <Select
          placeholder="Все статусы"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setOffset(0);
          }}
          options={Object.entries(ASSIGNMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
          className="w-44"
        />
      </div>

      {groups.error || scenarios.error ? (
        <Notice
          variant="error"
          title="Не удалось загрузить справочники для фильтров"
          message={(groups.error ?? scenarios.error)?.problem.title}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              groups.reload();
              scenarios.reload();
            }}
          >
            Повторить
          </Button>
        </Notice>
      ) : null}

      {assignments.error ? (
        <Notice
          variant="error"
          title="Не удалось загрузить назначения"
          message={assignments.error.problem.title}
        >
          <Button variant="secondary" size="sm" onClick={reload}>
            Повторить
          </Button>
        </Notice>
      ) : assignments.loading && !assignments.data ? (
        <PageSpinner label="Загрузка назначений…" />
      ) : !assignments.data || assignments.data.items.length === 0 ? (
        <EmptyState
          icon="inbox"
          text={
            filtersActive
              ? "Назначений с такими фильтрами нет. Попробуйте изменить условия отбора."
              : "Назначений пока нет. Назначьте тестирование, чтобы выдать сотрудникам коды доступа."
          }
          actionLabel={filtersActive ? "Сбросить фильтры" : undefined}
          onAction={filtersActive ? resetFilters : undefined}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={assignments.data.items}
            rowKey={(a) => a.id}
            emptyText="Нет данных"
          />
          <Pagination
            offset={assignments.data.page.offset}
            limit={assignments.data.page.limit}
            total={assignments.data.page.total}
            onOffsetChange={setOffset}
          />
        </>
      )}

      <CreateTestingDrawer
        open={drawerOpen}
        groups={groups.data}
        scenarios={scenarios.data?.items ?? null}
        onClose={() => setDrawerOpen(false)}
        onCreated={(result, skippedNames) =>
          setCodes({ result, title: "Тестирование назначено", skippedNames })
        }
      />
      <CodesPanel
        open={!!codes}
        title={codes?.title}
        result={codes?.result ?? null}
        skippedNames={codes?.skippedNames}
        onClose={closeCodes}
      />
      <ExtendModal
        target={extendTarget}
        onClose={() => setExtendTarget(null)}
        onDone={() => {
          setExtendTarget(null);
          reload();
        }}
      />
      <CancelModal
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onDone={() => {
          setCancelTarget(null);
          reload();
        }}
      />
    </div>
  );
}

function ExtendModal({
  target,
  onClose,
  onDone,
}: {
  target: Assignment | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const open = target !== null;

  useEffect(() => {
    if (target) setValue(toLocalInput(target.due_at));
  }, [target]);

  const submit = async () => {
    if (!target || !value) return;
    setSaving(true);
    try {
      await updateAssignment(target.id, new Date(value).toISOString());
      toast.show("Срок продлён");
      onDone();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.problem.title : "Не удалось продлить срок");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Продлить срок"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Назад
          </Button>
          <Button loading={saving} disabled={!value} onClick={() => void submit()}>
            Сохранить
          </Button>
        </>
      }
    >
      <Input
        label="Новый срок"
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </Modal>
  );
}

function CancelModal({
  target,
  onClose,
  onDone,
}: {
  target: Assignment | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await cancelAssignment(target.id);
      toast.show("Назначение отменено");
      onDone();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.problem.title : "Не удалось отменить назначение");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title="Отменить назначение?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Назад
          </Button>
          <Button variant="danger" loading={saving} onClick={() => void submit()}>
            Отменить назначение
          </Button>
        </>
      }
    >
      <p className="text-sm text-dusk">
        Код будет аннулирован и больше не подойдёт для входа. Если сессия уже идёт, она доиграет до
        конца, но новую начать будет нельзя.
      </p>
    </Modal>
  );
}
