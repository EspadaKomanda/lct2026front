"use client";

import { Suspense, use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/api/hooks";
import {
  checkDraft,
  createScenario,
  exportScenario,
  getDraft,
  getScenario,
  getVersion,
  listVersions,
  publishScenario,
  saveDraft,
  setScenarioArchived,
} from "@/lib/api/modules/scenarios";
import { listRehearsals } from "@/lib/api/modules/rehearsals";
import type {
  CheckResult,
  DryRunCheck,
  ScenarioCard,
  ScenarioDocument,
  VersionSummary,
} from "@/lib/api/types";
import { MODE_LABEL, SCENARIO_STATUS_LABEL } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  Icon,
  Menu,
  Modal,
  Notice,
  PageSpinner,
  Tabs,
  useToast,
} from "@/components/ui";
import { ScenarioEditor } from "@/components/scenario-editor/scenario-editor";
import { GenerationWizard } from "@/components/scenario-editor/generation-wizard";
import { SchemeTab } from "@/components/scenario-tabs/scheme-tab";
import {
  RehearsalModal,
  RehearsalsTab,
} from "@/components/scenario-tabs/rehearsals-tab";
import { HealthTab } from "@/components/scenario-tabs/health-tab";

type ActiveTab = "editor" | "scheme" | "rehearsals" | "health";

export default function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<PageSpinner />}>
      <ScenarioDetailInner id={id} />
    </Suspense>
  );
}

function ScenarioDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const isGeneratingParam = searchParams.get("generating") === "1";
  const initialTab = (searchParams.get("tab") as ActiveTab) || "editor";

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [activeVersionNumber, setActiveVersionNumber] = useState<number | null>(null); // null = draft
  const [doc, setDoc] = useState<ScenarioDocument | null>(null);
  const [draftEtag, setDraftEtag] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Modals
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [rehearsalModalOpen, setRehearsalModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // APIs
  const scenarioApi = useApi(() => getScenario(id), [id]);
  const draftApi = useApi(() => getDraft(id), [id]);
  const versionsApi = useApi(() => listVersions(id), [id]);
  const rehearsalsApi = useApi(() => listRehearsals(id), [id]);

  const scenario = scenarioApi.data;
  const versions = versionsApi.data ?? [];
  const rehearsalsData = rehearsalsApi.data;

  // Initialize draft doc
  useEffect(() => {
    if (draftApi.data && activeVersionNumber === null && !doc) {
      setDoc(draftApi.data.draft.document);
      setDraftEtag(draftApi.data.etag);
      setCheckResult(draftApi.data.draft.check);
      setLastSavedTime(formatDateTime(draftApi.data.draft.updated_at));
    }
  }, [draftApi.data, activeVersionNumber, doc]);

  // Load published version when switched
  useEffect(() => {
    if (activeVersionNumber !== null) {
      void getVersion(id, activeVersionNumber)
        .then((ver) => {
          setDoc(ver.document);
          setCheckResult(null); // published versions are immutable
          setIsDirty(false);
        })
        .catch(() => {
          toast.show("Не удалось загрузить версию");
        });
    } else if (draftApi.data) {
      setDoc(draftApi.data.draft.document);
      setDraftEtag(draftApi.data.etag);
      setCheckResult(draftApi.data.draft.check);
      setIsDirty(false);
    }
  }, [activeVersionNumber, id, draftApi.data]);

  const isReadOnly = activeVersionNumber !== null;

  // Auto-check on draft edit (debounced)
  useEffect(() => {
    if (isReadOnly || !doc) return;
    const timer = setTimeout(async () => {
      try {
        const res = await checkDraft(id, doc);
        setCheckResult(res);
      } catch {
        // Ignored
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [doc, id, isReadOnly]);

  const handleDocChange = (next: ScenarioDocument) => {
    if (isReadOnly) return;
    setDoc(next);
    setIsDirty(true);
  };

  const handleSaveDraft = async () => {
    if (!doc || !draftEtag || saving) return;
    setSaving(true);
    try {
      const res = await saveDraft(id, draftEtag, doc);
      setDraftEtag(res.etag);
      setCheckResult(res.draft.check);
      setIsDirty(false);
      setLastSavedTime(formatDateTime(res.draft.updated_at));
      toast.show("Черновик сохранён");
    } catch {
      toast.show("Не удалось сохранить черновик");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draftApi.data?.draft.fingerprint || publishing) return;
    setPublishing(true);
    try {
      const res = await publishScenario(id, draftApi.data.draft.fingerprint);
      toast.show(`Версия ${res.number} успешно опубликована`);
      setPublishModalOpen(false);
      await Promise.all([
        scenarioApi.reload(),
        versionsApi.reload(),
        draftApi.reload(),
      ]);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "problem" in err
          ? (err as { problem: { title: string } }).problem.title
          : "Не удалось опубликовать версию";
      toast.show(msg);
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!scenario) return;
    try {
      const nextArchived = !scenario.archived_at;
      await setScenarioArchived(id, nextArchived);
      toast.show(nextArchived ? "Сценарий перемещён в архив" : "Сценарий восстановлен из архива");
      scenarioApi.reload();
    } catch {
      toast.show("Не удалось изменить статус архива");
    }
  };

  const handleExportJson = async () => {
    try {
      const data = await exportScenario(
        id,
        activeVersionNumber !== null ? activeVersionNumber : undefined,
      );
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${scenario?.slug ?? "scenario"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.show("Не удалось скачать файл сценария");
    }
  };

  const handleCopyScenario = async () => {
    if (!scenario) return;
    try {
      const copy = await createScenario({
        origin: "copy",
        mode: scenario.mode,
        source_scenario_id: id,
        title: `${title} (копия)`,
        source_version: activeVersionNumber !== null ? activeVersionNumber : undefined,
      });
      toast.show("Копия сценария создана");
      router.push(`/scenarios/${copy.id}`);
    } catch {
      toast.show("Не удалось создать копию сценария");
    }
  };

  if (scenarioApi.loading || (!scenario && draftApi.loading)) return <PageSpinner />;
  if (scenarioApi.error) {
    return (
      <div className="p-6">
        <Notice variant="error" message={scenarioApi.error.problem.title} />
      </div>
    );
  }
  if (!scenario || !doc) return null;

  // If in wizard generation mode
  if (isGeneratingParam || scenario.status === "generating") {
    return (
      <GenerationWizard
        scenarioId={id}
        onComplete={() => {
          router.replace(`/scenarios/${id}`);
          scenarioApi.reload();
          draftApi.reload();
        }}
      />
    );
  }

  const title = (doc.passport?.title || scenario.title) ?? "Сценарий";
  const mode = doc.passport?.mode || scenario.mode;
  const isAssessment = mode === "assessment";
  const blockingErrors = checkResult?.blocking_count ?? 0;
  const nextVersionNum = (versions[0]?.number ?? 0) + 1;
  const latestPublishedNum = versions[0]?.number ?? 1;

  const tabOptions = [
    { key: "editor", label: "Редактор" },
    { key: "scheme", label: "Схема этапов" },
    { key: "rehearsals", label: "Репетиции" },
    ...(versions.length > 0 ? [{ key: "health", label: "Здоровье" }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Шапка сценария */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold leading-tight text-night">
              {title}
            </h1>
            <Badge variant={mode}>{MODE_LABEL[mode]}</Badge>
            <Badge variant={scenario.status}>{SCENARIO_STATUS_LABEL[scenario.status]}</Badge>
            {lastSavedTime && !isReadOnly && (
              <span className="text-xs text-dusk">Сохранено: {lastSavedTime}</span>
            )}
          </div>

          {/* Правый блок кнопок действий */}
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <Button
                variant={isDirty ? "primary" : "secondary"}
                onClick={handleSaveDraft}
                disabled={saving || !isDirty}
              >
                {saving ? "Сохранение..." : isDirty ? "Сохранить черновик" : "Сохранено"}
              </Button>
            )}

            {!isReadOnly && (
              <Button
                onClick={() => setPublishModalOpen(true)}
                disabled={blockingErrors > 0}
              >
                Опубликовать
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() => setRehearsalModalOpen(true)}
            >
              Репетировать
            </Button>

            <Menu
              triggerTitle="Ещё"
              triggerSize={36}
              items={[
                {
                  key: "export",
                  label: "Скачать файл сценария (JSON)",
                  icon: "dl",
                  onClick: handleExportJson,
                },
                {
                  key: "copy",
                  label: "Создать копию сценария",
                  icon: "copy",
                  onClick: handleCopyScenario,
                },
                {
                  key: "archive",
                  label: scenario.archived_at ? "Вернуть из архива" : "Архивировать сценарий",
                  icon: "archive",
                  danger: !scenario.archived_at,
                  onClick: handleToggleArchive,
                },
              ]}
            />
          </div>
        </div>

        {/* Переключатель версий: Черновик / Опубликованные версии */}
        <div className="flex items-center gap-3 pt-1 border-b border-line pb-3 flex-wrap">
          <span className="text-13 text-dusk font-medium">Версия:</span>
          <div className="inline-flex bg-frost rounded-field p-0.5 gap-1">
            <button
              type="button"
              onClick={() => setActiveVersionNumber(null)}
              className={`h-7 px-3 rounded text-13 transition-colors ${
                activeVersionNumber === null
                  ? "bg-surface text-night font-medium shadow-sm"
                  : "text-dusk hover:text-night"
              }`}
            >
              Черновик {versions.length > 0 ? `(к версии ${nextVersionNum})` : ""}
            </button>
            {versions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveVersionNumber(v.number)}
                className={`h-7 px-3 rounded text-13 transition-colors ${
                  activeVersionNumber === v.number
                    ? "bg-surface text-night font-medium shadow-sm"
                    : "text-dusk hover:text-night"
                }`}
              >
                Версия {v.number} ({formatDate(v.published_at)})
              </button>
            ))}
          </div>

          {isReadOnly && (
            <button
              type="button"
              onClick={() => setActiveVersionNumber(null)}
              className="text-13 text-accent hover:underline font-medium ml-2"
            >
              ← Вернуться к редактированию черновика
            </button>
          )}
        </div>

        {/* Вкладки сценария */}
        <div className="pt-1">
          <Tabs
            tabs={tabOptions}
            active={activeTab}
            onChange={(key) => {
              setActiveTab(key as ActiveTab);
              router.replace(`/scenarios/${id}?tab=${key}`);
            }}
          />
        </div>
      </div>

      {/* Контент вкладок */}
      {activeTab === "editor" && (
        <ScenarioEditor
          document={doc}
          onChange={handleDocChange}
          check={checkResult}
          readOnly={isReadOnly}
          onPublishClick={() => setPublishModalOpen(true)}
          onRehearseClick={() => setRehearsalModalOpen(true)}
          admissionRehearsals={rehearsalsData?.admission}
        />
      )}

      {activeTab === "scheme" && (
        <SchemeTab
          scenarioId={id}
          document={doc}
          check={checkResult}
        />
      )}

      {activeTab === "rehearsals" && (
        <RehearsalsTab
          scenarioId={id}
          document={doc}
          check={checkResult}
        />
      )}

      {activeTab === "health" && (
        <HealthTab
          scenarioId={id}
          document={doc}
          check={checkResult}
          versionNumber={activeVersionNumber ?? latestPublishedNum}
        />
      )}

      {/* Модалка запуска репетиции */}
      {rehearsalModalOpen && (
        <RehearsalModal
          scenarioId={id}
          onClose={() => setRehearsalModalOpen(false)}
        />
      )}

      {/* Модалка публикации версии */}
      <Modal
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title={`Опубликовать версию ${nextVersionNum}?`}
        width={520}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-13 text-dusk">
            <span>Режим сценария:</span>
            <Badge variant={mode}>{MODE_LABEL[mode]}</Badge>
          </div>

          <ul className="text-13 text-night flex flex-col gap-2 pl-4 list-disc leading-relaxed">
            <li>
              Опубликованная версия фиксируется отпечатком и <strong>не может быть изменена</strong>.
            </li>
            <li>
              Последующее редактирование будет вестись в новом черновике версии {nextVersionNum + 1}.
            </li>
            <li>
              Существующие назначения сотрудников останутся привязаны к своим версиям.
            </li>
          </ul>

          {isAssessment && (
            <Notice
              variant="warning"
              message={`В режиме «Оценка» версия будет строго учитываться при принятии кадровых решений.`}
            />
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button
              variant="secondary"
              onClick={() => setPublishModalOpen(false)}
              disabled={publishing}
            >
              Отмена
            </Button>
            <Button
              onClick={handlePublish}
              loading={publishing}
            >
              {publishing ? "Публикация..." : `Опубликовать версию ${nextVersionNum}`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
