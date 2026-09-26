"use client";

import { useState } from "react";
import { useApi } from "@/lib/api/hooks";
import { getGroupsAnalytics } from "@/lib/api/modules/analytics";
import { listGroups } from "@/lib/api/modules/people";
import { listScenarios, listVersions } from "@/lib/api/modules/scenarios";
import type { Criterion, Difficulty, Mode } from "@/lib/api/types";
import { DIFFICULTY_LABEL, MODE_LABEL } from "@/lib/labels";
import { Button, EmptyState, Icon, Input, Notice, PageSpinner, Select } from "@/components/ui";
import { CriterionDrawer, type CriterionDrawerState } from "@/components/analytics/criterion-drawer";
import { GroupAnalyticsSection } from "@/components/analytics/group-analytics-section";

const MAX_GROUPS = 5;

export default function AnalyticsPage() {
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [scenarioId, setScenarioId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [mode, setMode] = useState<Mode | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [drawer, setDrawer] = useState<CriterionDrawerState | null>(null);

  const groupsApi = useApi(() => listGroups(), []);
  const scenariosApi = useApi(() => listScenarios({ limit: 100 }), []);
  const versionsApi = useApi(
    () => (scenarioId ? listVersions(scenarioId) : Promise.resolve([])),
    [scenarioId]
  );

  const groups = groupsApi.data ?? [];
  const scenarios = scenariosApi.data?.items ?? [];

  const [prevGroups, setPrevGroups] = useState(groups);
  if (prevGroups !== groups) {
    setPrevGroups(groups);
    if (groups.length > 0 && groupIds.length === 0) setGroupIds([groups[0].id]);
  }

  const groupKey = groupIds.join(",");
  const blocked = groupIds.length >= 2 && (!versionId || !difficulty);

  const analyticsApi = useApi(
    () =>
      groupIds.length === 0 || blocked
        ? Promise.resolve([])
        : getGroupsAnalytics({
            group_id: groupIds,
            from: from || undefined,
            to: to || undefined,
            scenario_id: scenarioId || undefined,
            scenario_version_id: versionId || undefined,
            difficulty: difficulty || undefined,
            mode: mode || undefined,
          }),
    [groupKey, blocked, from, to, scenarioId, versionId, difficulty, mode]
  );

  const data = analyticsApi.data;
  const isEmpty = data !== null && data.every((g) => g.sample.n === 0);

  const setGroupAt = (index: number, value: string) => {
    setGroupIds((prev) => prev.map((g, i) => (i === index ? value : g)));
  };

  const removeGroupAt = (index: number) => {
    setGroupIds((prev) => prev.filter((_, i) => i !== index));
  };

  const groupOptions = groups.map((g) => ({ value: g.id, label: g.name }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold leading-tight">Статистика</h1>

      <div className="flex items-center gap-2 flex-wrap">
        {groupIds.map((gid, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <Select
              value={gid}
              onChange={(v) => setGroupAt(i, v)}
              options={groupOptions.filter((o) => !groupIds.includes(o.value) || o.value === gid)}
              placeholder="Группа"
              className="w-52"
            />
            {groupIds.length > 1 && (
              <Button variant="text" size="xs" onClick={() => removeGroupAt(i)} title="Убрать группу">
                <Icon name="x" size={14} />
              </Button>
            )}
          </span>
        ))}
        {groupIds.length < MAX_GROUPS && (
          <Button variant="secondary" size="sm" onClick={() => setGroupIds((prev) => [...prev, ""])}>
            <Icon name="plus" size={14} />
            Добавить группу
          </Button>
        )}
        <Select
          value={scenarioId}
          onChange={(v) => {
            setScenarioId(v);
            setVersionId("");
          }}
          options={scenarios.map((s) => ({ value: s.id, label: s.title }))}
          placeholder="Сценарий"
          className="w-60"
        />
        <Select
          value={versionId}
          onChange={setVersionId}
          options={(versionsApi.data ?? []).map((v) => ({
            value: v.id,
            label: `Версия ${v.number}`,
          }))}
          placeholder="Версия"
          className="w-36"
          disabled={!scenarioId}
        />
        <Select
          value={difficulty}
          onChange={(v) => setDifficulty(v as Difficulty | "")}
          options={Object.entries(DIFFICULTY_LABEL).map(([value, label]) => ({ value, label }))}
          placeholder="Уровень"
          className="w-36"
        />
        <Select
          value={mode}
          onChange={(v) => setMode(v as Mode | "")}
          options={Object.entries(MODE_LABEL).map(([value, label]) => ({ value, label }))}
          placeholder="Режим"
          className="w-36"
        />
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-40"
          aria-label="Период с"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-40"
          aria-label="Период по"
        />
      </div>

      {groupIds.includes("") && (
        <Notice variant="warning" title="Выберите группу в каждом фильтре" />
      )}

      {blocked && (
        <Notice
          variant="warning"
          title="Для сравнения групп выберите сценарий, версию и уровень"
        />
      )}

      {analyticsApi.error && <Notice variant="error" title={analyticsApi.error.problem.title} />}

      {analyticsApi.loading && data === null ? (
        <PageSpinner />
      ) : isEmpty ? (
        <EmptyState icon="trend" text="По этим фильтрам сессий нет" />
      ) : (
        <div className="flex flex-col gap-8">
          {(data ?? []).map((g) => (
            <GroupAnalyticsSection
              key={g.group_id}
              analytics={g}
              onCriterionClick={(criterion: Criterion, groupId: string) =>
                setDrawer({ criterion, groupId })
              }
            />
          ))}
        </div>
      )}

      <CriterionDrawer
        state={drawer}
        onClose={() => setDrawer(null)}
        filters={{
          scenario_version_id: versionId || undefined,
          difficulty: difficulty || undefined,
          from: from || undefined,
          to: to || undefined,
        }}
      />
    </div>
  );
}
