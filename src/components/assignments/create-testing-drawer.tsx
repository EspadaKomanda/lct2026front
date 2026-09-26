"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Drawer,
  EmptyState,
  Input,
  Notice,
  PageSpinner,
  SegmentControl,
  Select,
  useToast,
} from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import { createAssignments } from "@/lib/api/modules/assignments";
import { listPeople } from "@/lib/api/modules/people";
import { listVersions } from "@/lib/api/modules/scenarios";
import type {
  AssignmentCreateResult,
  Difficulty,
  Group,
  Mode,
  Person,
  ScenarioListItem,
} from "@/lib/api/types";
import { DIFFICULTY_LABEL, MODE_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export interface CreateTestingDrawerProps {
  open: boolean;
  groups: Group[] | null;
  scenarios: ScenarioListItem[] | null;
  onClose: () => void;
  onCreated: (result: AssignmentCreateResult, skippedNames: Record<string, string>) => void;
}

export function CreateTestingDrawer({ open, groups, scenarios, onClose, onCreated }: CreateTestingDrawerProps) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("training");
  const [groupId, setGroupId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scenarioId, setScenarioId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [dueValue, setDueValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("training");
      setGroupId("");
      setSelected(new Set());
      setScenarioId("");
      setVersionId("");
      setDifficulty("normal");
      setDueValue("");
    }
  }, [open]);

  const people = useApi(
    () => (groupId ? listPeople({ group_id: groupId, limit: 200 }) : Promise.resolve(null)),
    [groupId],
  );

  const scenarioOptions = useMemo(
    () => (scenarios ?? []).filter((s) => s.mode === mode),
    [scenarios, mode],
  );

  useEffect(() => {
    if (scenarioId && !scenarioOptions.some((s) => s.id === scenarioId)) setScenarioId("");
  }, [scenarioOptions, scenarioId]);

  const versions = useApi(
    () => (scenarioId ? listVersions(scenarioId) : Promise.resolve(null)),
    [scenarioId],
  );

  const versionList = versions.data;
  useEffect(() => {
    if (!versionList || versionList.length === 0) return;
    setVersionId((v) => (v && versionList.some((x) => x.id === v) ? v : versionList[0].id));
  }, [versionList]);

  const items = people.data?.items ?? [];
  const selectable = (p: Person) => mode === "training" || !!p.full_name;
  const selectableItems = items.filter(selectable);
  const allChecked = selectableItems.length > 0 && selectableItems.every((p) => selected.has(p.subject_id));
  const hasNoFio = items.some((p) => !p.full_name);

  useEffect(() => {
    if (mode !== "assessment" || !people.data) return;
    const noFioIds = new Set(people.data.items.filter((p) => !p.full_name).map((p) => p.subject_id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => !noFioIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [mode, people.data]);

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of selectableItems) {
        if (checked) next.add(p.subject_id);
        else next.delete(p.subject_id);
      }
      return next;
    });
  };

  const selectedVersion = versions.data?.find((v) => v.id === versionId) ?? null;

  const missing = !groupId
    ? "Выберите группу"
    : selected.size === 0
      ? "Отметьте хотя бы одного сотрудника"
      : !scenarioId
        ? "Выберите сценарий"
        : !dueValue
          ? "Укажите срок"
          : null;

  const submit = async () => {
    if (missing || !versionId) return;
    setSubmitting(true);
    try {
      const result = await createAssignments({
        subject_ids: [...selected],
        scenario_version_id: versionId,
        difficulty,
        due_at: new Date(dueValue).toISOString(),
      });
      const skippedNames: Record<string, string> = {};
      for (const p of items) skippedNames[p.subject_id] = p.full_name ?? p.pseudonym ?? p.number;
      onCreated(result, skippedNames);
    } catch (e) {
      toast.show(e instanceof ApiError ? e.problem.title : "Не удалось назначить тестирование");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Новое тестирование" width={480}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-medium">Режим</span>
          <SegmentControl
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: "training", label: MODE_LABEL.training },
              { value: "assessment", label: MODE_LABEL.assessment },
            ]}
          />
        </div>
        {mode === "assessment" && (
          <Notice
            variant="banner"
            message="Оценочное тестирование требует письменного согласия сотрудника. Без ФИО оценку назначить нельзя."
          />
        )}

        <Select
          label="Группа"
          placeholder="Выберите группу"
          value={groupId}
          onChange={(v) => {
            setGroupId(v);
            setSelected(new Set());
          }}
          options={(groups ?? [])
            .filter((g) => g.has_access)
            .map((g) => ({ value: g.id, label: g.name }))}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-medium">Сотрудники</span>
          {!groupId ? (
            <p className="text-13 text-dusk">Выберите группу, чтобы отметить сотрудников.</p>
          ) : people.error ? (
            <Notice
              variant="error"
              title="Не удалось загрузить сотрудников"
              message={people.error.problem.title}
            >
              <Button variant="secondary" size="sm" onClick={people.reload}>
                Повторить
              </Button>
            </Notice>
          ) : people.loading ? (
            <PageSpinner label="Загрузка сотрудников…" />
          ) : items.length === 0 ? (
            <EmptyState icon="users" text="В группе нет сотрудников" />
          ) : (
            <div className="flex flex-col border border-line rounded-field">
              <div className="flex items-center gap-2 px-3 h-9 border-b border-line bg-frost">
                <Checkbox
                  checked={allChecked}
                  onChange={toggleAll}
                  label={`Все сотрудники${selected.size > 0 ? ` · выбрано ${selected.size}` : ""}`}
                />
              </div>
              <div className="max-h-64 overflow-auto p-1 flex flex-col">
                {items.map((p) => (
                  <div key={p.subject_id} className="flex items-center gap-2 px-2 py-1.5">
                    <Checkbox
                      checked={selected.has(p.subject_id)}
                      disabled={!selectable(p)}
                      onChange={(c) => toggleOne(p.subject_id, c)}
                      label={null}
                      aria-label={p.full_name ?? p.pseudonym ?? p.number}
                    />
                    <div className="min-w-0">
                      <div className="text-sm truncate">{p.full_name ?? p.pseudonym ?? p.number}</div>
                      <div className="text-xs text-dusk">{p.personnel_no ?? p.number}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {mode === "assessment" && hasNoFio && (
            <Notice variant="warning" message="Без ФИО можно назначать только тренировку" />
          )}
        </div>

        <Select
          label="Сценарий"
          placeholder="Выберите сценарий"
          value={scenarioId}
          onChange={(v) => {
            setScenarioId(v);
            setVersionId("");
          }}
          options={scenarioOptions.map((s) => ({ value: s.id, label: s.title }))}
        />

        {scenarioId && (
          <>
            <Select
              label="Версия"
              placeholder="Выберите версию"
              value={versionId}
              onChange={setVersionId}
              options={(versions.data ?? []).map((v) => ({
                value: v.id,
                label: `Версия ${v.number} · от ${formatDate(v.published_at)}`,
              }))}
              disabled={versions.loading || !!versions.error}
            />
            {versions.error && (
              <Notice variant="error" message={versions.error.problem.title}>
                <Button variant="secondary" size="sm" onClick={versions.reload}>
                  Повторить
                </Button>
              </Notice>
            )}
            {selectedVersion && (
              <p className="text-xs text-dusk">
                Репетиций этой версии: {selectedVersion.admission_rehearsals ?? 0} из{" "}
                {selectedVersion.admission_required ?? "—"}
              </p>
            )}
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-medium">Уровень</span>
          <SegmentControl
            value={difficulty}
            onChange={(v) => setDifficulty(v as Difficulty)}
            options={(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => ({
              value: d,
              label: DIFFICULTY_LABEL[d],
            }))}
          />
        </div>

        <Input
          label="Срок"
          type="datetime-local"
          value={dueValue}
          onChange={(e) => setDueValue(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-medium">Профиль тренажёра</span>
          <Select disabled placeholder="Профиль группы" options={[]} value="" />
          <span className="text-xs text-dusk">По умолчанию используется профиль группы</span>
        </div>

        <div className="flex flex-col gap-1.5 pt-2 border-t border-line">
          {missing && <span className="text-xs text-dusk">{missing}</span>}
          <Button loading={submitting} disabled={!!missing} onClick={() => void submit()}>
            Назначить {selected.size > 0 ? `${selected.size} ` : ""}сотрудникам
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
