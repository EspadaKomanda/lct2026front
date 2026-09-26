"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { getMe } from "@/lib/api/modules/auth";
import { createScenario, importScenario, listScenarios } from "@/lib/api/modules/scenarios";
import { useApi } from "@/lib/api/hooks";
import type { Mode, ScenarioListItem, ScenarioStatus, ScenarioDocument, Sphere } from "@/lib/api/types";
import { MODE_LABEL, ORIGIN_LABEL, SCENARIO_STATUS_LABEL, SPHERE_LABEL } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  Column,
  DataTable,
  EmptyState,
  Menu,
  Notice,
  Pagination,
  SearchInput,
  Select,
  SelectOption,
  useToast,
} from "@/components/ui";
import { useRun } from "./use-run";

const LIMIT = 20;

const SPHERE_OPTIONS: SelectOption[] = (Object.keys(SPHERE_LABEL) as Sphere[]).map((v) => ({
  value: v,
  label: SPHERE_LABEL[v],
}));

const STATUS_OPTIONS: SelectOption[] = (Object.keys(SCENARIO_STATUS_LABEL) as ScenarioStatus[]).map(
  (v) => ({ value: v, label: SCENARIO_STATUS_LABEL[v] }),
);

const MODE_OPTIONS: SelectOption[] = (Object.keys(MODE_LABEL) as Mode[]).map((v) => ({
  value: v,
  label: MODE_LABEL[v],
}));

const IMPORT_NOTICE =
  "Файл не похож на сценарий: в нём нет разделов «Оппонент» и «О чём договариваемся». Ничего не создано";

const columns: Column<ScenarioListItem>[] = [
  {
    key: "title",
    title: "Название",
    render: (s) => (
      <div className="min-w-0 py-1">
        <div className="text-sm font-medium leading-snug">{s.title}</div>
        <div className="text-xs text-dusk">{ORIGIN_LABEL[s.origin]}</div>
      </div>
    ),
  },
  { key: "sphere", title: "Сфера", render: (s) => SPHERE_LABEL[s.sphere] },
  {
    key: "status",
    title: "Статус",
    render: (s) => (
      <div className="flex items-center gap-2">
        <Badge variant={s.status}>{SCENARIO_STATUS_LABEL[s.status]}</Badge>
        {s.draft_differs === true && <span className="text-xs text-dusk">есть правки</span>}
      </div>
    ),
  },
  {
    key: "mode",
    title: "Режим",
    render: (s) => <Badge variant={s.mode}>{MODE_LABEL[s.mode]}</Badge>,
  },
  {
    key: "version",
    title: "Версия",
    render: (s) =>
      s.latest_version
        ? `версия ${s.latest_version.number} от ${formatDate(s.latest_version.published_at)}`
        : "—",
  },
  {
    key: "sessions",
    title: "Сессий",
    align: "right",
    render: (s) => s.latest_version?.sessions_count ?? "—",
  },
  {
    key: "changed",
    title: "Изменён",
    render: (s) => formatDateTime(s.latest_version?.published_at),
  },
];

export function ScenariosLibrary() {
  const router = useRouter();
  const toast = useToast();

  const me = useApi(getMe, []);
  const isAdmin = me.data?.user.role === "admin";

  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [sphere, setSphere] = useState("");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [offset, setOffset] = useState(0);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const importRun = useRun(importScenario);
  const manualRun = useRun(createScenario);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(input.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const page = useApi(
    () =>
      listScenarios({
        q: q || undefined,
        sphere: (sphere || undefined) as Sphere | undefined,
        status: (status || undefined) as ScenarioStatus | undefined,
        mode: (mode || undefined) as Mode | undefined,
        limit: LIMIT,
        offset,
      }),
    [q, sphere, status, mode, offset],
  );

  const hasFilters = Boolean(q || sphere || status || mode);
  const items = page.data?.items ?? [];
  const total = page.data?.page.total ?? 0;

  const handleManualCreate = async () => {
    const card = await manualRun.run({ origin: "manual", mode: "training" });
    if (card) {
      router.push(`/scenarios/${card.id}`);
    } else {
      toast.show(manualRun.lastError.current?.problem.title ?? "Не удалось создать сценарий");
    }
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportNotice(null);
    let document: ScenarioDocument;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad");
      document = parsed as ScenarioDocument;
    } catch {
      setImportNotice("Файл не похож на сценарий: не удалось разобрать JSON. Ничего не создано");
      return;
    }
    const card = await importRun.run(document);
    if (card) {
      toast.show("Сценарий загружен");
      router.push(`/scenarios/${card.id}`);
      return;
    }
    const err = importRun.lastError.current;
    toast.show(err?.problem.title ?? "Не удалось загрузить сценарий");
    if (err instanceof ApiError && err.status === 422) setImportNotice(IMPORT_NOTICE);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Сценарии</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => router.push("/scenarios/new")}>Новый сценарий</Button>
          {isAdmin && (
            <Menu
              triggerTitle="Ещё"
              triggerSize={40}
              items={[
                {
                  key: "import",
                  label: "Загрузить файл сценария",
                  icon: "dl",
                  onClick: () => fileRef.current?.click(),
                },
                {
                  key: "manual",
                  label: "Создать вручную",
                  icon: "pencil",
                  onClick: () => void handleManualCreate(),
                },
              ]}
            />
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => void handleFile(e)}
      />

      {importNotice && <Notice variant="error" message={importNotice} className="max-w-[720px]" />}

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Поиск по названию"
          className="w-[280px]"
          aria-label="Поиск по названию"
        />
        <Select
          value={sphere}
          onChange={(v) => {
            setSphere(v);
            setOffset(0);
          }}
          options={SPHERE_OPTIONS}
          placeholder="Все сферы"
          className="w-48"
          aria-label="Сфера"
        />
        <Select
          value={status}
          onChange={(v) => {
            setStatus(v);
            setOffset(0);
          }}
          options={STATUS_OPTIONS}
          placeholder="Все статусы"
          className="w-44"
          aria-label="Статус"
        />
        <Select
          value={mode}
          onChange={(v) => {
            setMode(v);
            setOffset(0);
          }}
          options={MODE_OPTIONS}
          placeholder="Все режимы"
          className="w-40"
          aria-label="Режим"
        />
      </div>

      {page.loading ? (
        <div className="flex flex-col gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : page.error ? (
        <Notice
          variant="error"
          message={page.error.problem.title}
          className="max-w-[720px]"
        >
          <Button variant="text" size="xs" className="mt-1" onClick={page.reload}>
            Повторить
          </Button>
        </Notice>
      ) : items.length === 0 && !hasFilters ? (
        <Card bordered>
          <EmptyState
            icon="book"
            text="Сценариев пока нет. Опишите ситуацию — система соберёт сценарий сама"
            actionLabel="Новый сценарий"
            onAction={() => router.push("/scenarios/new")}
          />
        </Card>
      ) : (
        <>
          <Card bordered className="overflow-hidden">
            <DataTable
              columns={columns}
              rows={items}
              rowKey={(s) => s.id}
              onRowClick={(s) => router.push(`/scenarios/${s.id}`)}
              emptyText="По этим фильтрам сценариев нет"
            />
          </Card>
          <Pagination offset={offset} limit={LIMIT} total={total} onOffsetChange={setOffset} />
        </>
      )}
    </div>
  );
}
