"use client";

import { useMemo, useState } from "react";
import type { CheckMessage, CheckResult, Difficulty, ScenarioDocument } from "@/lib/api/types";
import { cx } from "@/lib/utils";
import { Badge, Button, Icon, Notice, SegmentControl, Switch } from "@/components/ui";
import {
  SECTION_GROUPS,
  SECTION_LABEL,
  asArr,
  asRec,
  asStr,
  blockingBySection,
  getPath,
  sectionForPath,
  setDocPath,
  type SectionKey,
} from "./doc-utils";
import {
  JsonField,
  PInput,
  PNum,
  PSelect,
  PText,
  SectionCard,
  StringListEditor,
  type Ctx,
} from "./fields";
import { DealZoneScale } from "./deal-zone-scale";

export interface ScenarioEditorProps {
  document: ScenarioDocument;
  onChange: (next: ScenarioDocument) => void;
  check: CheckResult | null;
  readOnly?: boolean;
  onPublishClick?: () => void;
  onRehearseClick?: () => void;
  admissionRehearsals?: { done: number; required: number };
}

const SPHERE_OPTIONS = [
  { value: "procurement", label: "Закупки" },
  { value: "sales", label: "Продажи" },
  { value: "internal_promotion", label: "Внутреннее повышение" },
  { value: "internal_client", label: "Внутренний заказчик" },
  { value: "contractor_deadline", label: "Сроки подрядчика" },
  { value: "resource_split", label: "Делёж ресурсов" },
  { value: "other", label: "Другое" },
];

const ISSUE_TYPE_OPTIONS = [
  { value: "number", label: "Число" },
  { value: "date", label: "Дата" },
  { value: "choice", label: "Выбор" },
];

const DIRECTION_OPTIONS = [
  { value: "lower_better", label: "Участнику выгоднее меньше" },
  { value: "higher_better", label: "Участнику выгоднее больше" },
];

export function ScenarioEditor({
  document,
  onChange,
  check,
  readOnly = false,
  onPublishClick,
  onRehearseClick,
  admissionRehearsals,
}: ScenarioEditorProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("passport");
  const [expert, setExpert] = useState(false);
  const [checkPanelOpen, setCheckPanelOpen] = useState(true);
  const [highlightPath, setHighlightPath] = useState<string | null>(null);

  const ctx: Ctx = useMemo(
    () => ({
      doc: document,
      update: (next) => {
        if (!readOnly) onChange(next);
      },
      expert,
      highlightPath: highlightPath ?? undefined,
    }),
    [document, onChange, readOnly, expert, highlightPath],
  );

  const blockingCounts = useMemo(
    () => (check?.messages ? blockingBySection(check.messages) : {}),
    [check],
  );

  const handleJumpToField = (m: CheckMessage) => {
    const sec = sectionForPath(m.path);
    if (sec) {
      setActiveSection(sec);
      setHighlightPath(m.path);
      setTimeout(() => setHighlightPath(null), 3000);
    }
  };

  const isBlocking = (check?.blocking_count ?? 0) > 0;
  const isAssessment = document.passport?.mode === "assessment";
  const admissionBlocked =
    isAssessment &&
    admissionRehearsals &&
    admissionRehearsals.done < admissionRehearsals.required;

  return (
    <div className="flex gap-6 items-start min-h-[700px] relative">
      {/* Левая навигация по разделам */}
      <aside className="w-56 shrink-0 flex flex-col gap-4 sticky top-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-dusk">
            Разделы
          </span>
          <div className="flex items-center gap-1.5" title="Режим эксперта открывает сырой JSON">
            <span className="text-11 text-dusk">Эксперт</span>
            <Switch checked={expert} onChange={setExpert} />
          </div>
        </div>

        <nav className="flex flex-col gap-3">
          {SECTION_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-dusk px-2.5 py-1">
                {group.title}
              </span>
              {group.keys.map((k) => {
                const active = activeSection === k;
                const errors = blockingCounts[k] ?? 0;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActiveSection(k)}
                    className={cx(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-field text-13 text-left transition-colors",
                      active
                        ? "bg-frost text-accent font-medium"
                        : "text-night hover:bg-surface",
                    )}
                  >
                    <span className="truncate">{SECTION_LABEL[k]}</span>
                    {errors > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-danger text-white text-[11px] font-semibold shrink-0">
                        {errors}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Центральная часть: форма активного раздела */}
      <main className="flex-1 flex flex-col gap-6 min-w-0">
        {readOnly && (
          <Notice
            variant="warning"
            message="Вы просматриваете опубликованную версию. Она неизменяема. Первая правка создаст новый черновик"
          />
        )}

        {/* Раздел 1: Паспорт */}
        {activeSection === "passport" && (
          <SectionCard title="Паспорт сценария">
            <div className="grid grid-cols-2 gap-4">
              <PInput ctx={ctx} path={["passport", "title"]} label="Название сценария" />
              <PSelect
                ctx={ctx}
                path={["passport", "sphere"]}
                label="Сфера"
                options={SPHERE_OPTIONS}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PInput
                ctx={ctx}
                path={["passport", "negotiation_type"]}
                label="Тип переговоров"
                placeholder="Например: деловые переговоры, урегулирование претензий"
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-13 font-medium">Режим сценария</span>
                <div className="h-9 px-3 rounded-field bg-bg border border-line flex items-center">
                  <Badge variant={document.passport?.mode ?? "training"}>
                    {document.passport?.mode === "assessment" ? "Оценка" : "Тренировка"}
                  </Badge>
                </div>
                <span className="text-xs text-dusk">
                  Режим фиксируется с первой публикации и не может быть изменён
                </span>
              </div>
            </div>
            <StringListEditor
              label="Теги"
              items={asArr(document.passport?.tags).map(String)}
              addLabel="Добавить тег"
              onChange={(next) =>
                ctx.update(setDocPath(ctx.doc, ["passport", "tags"], next))
              }
            />
          </SectionCard>
        )}

        {/* Раздел 2: Бриф участника */}
        {activeSection === "brief" && (
          <SectionCard title="Бриф участника" hint="Всё, что видит сотрудник до начала разговора">
            <PText
              ctx={ctx}
              path={["brief", "situation"]}
              label="Ситуация"
              rows={4}
              placeholder="Опишите контекст сделки..."
            />
            <div className="grid grid-cols-2 gap-4">
              <PInput
                ctx={ctx}
                path={["brief", "participant_role"]}
                label="Роль участника"
                placeholder="Специалист по закупкам"
              />
              <PNum
                ctx={ctx}
                path={["brief", "time_limit_minutes"]}
                label="Лимит времени, минут"
                min={3}
                max={60}
                suffix="мин"
              />
            </div>
            <PText
              ctx={ctx}
              path={["brief", "goal"]}
              label="Цель участника"
              rows={2}
              placeholder="Договориться о поставке не дороже..."
            />
            <PText
              ctx={ctx}
              path={["brief", "constraints"]}
              label="Ограничения"
              rows={2}
              placeholder="Бюджет не более, поставка строго до..."
            />
            <PText
              ctx={ctx}
              path={["brief", "fallback_option"]}
              label="Запасной вариант (BATNA)"
              rows={2}
              placeholder="Если не договоримся, обратимся к конкуренту за..."
            />
          </SectionCard>
        )}

        {/* Раздел 3: Оппонент */}
        {activeSection === "opponent" && (
          <div className="flex flex-col gap-6">
            <SectionCard title="Карточка оппонента (публичная)">
              <div className="grid grid-cols-3 gap-4">
                <PInput ctx={ctx} path={["opponent", "card", "name"]} label="Имя персонажа" />
                <PInput ctx={ctx} path={["opponent", "card", "role"]} label="Должность" />
                <PInput
                  ctx={ctx}
                  path={["opponent", "card", "organization"]}
                  label="Организация"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <PInput ctx={ctx} path={["opponent", "card", "voice"]} label="Голос" />
                <PInput ctx={ctx} path={["opponent", "card", "appearance"]} label="Внешность" />
              </div>
            </SectionCard>

            <SectionCard title="Бриф оппонента (секретный)">
              <PText
                ctx={ctx}
                path={["opponent", "brief", "character"]}
                label="Характер и стиль общения"
                rows={3}
              />
              <div className="grid grid-cols-2 gap-4">
                <PText
                  ctx={ctx}
                  path={["opponent", "brief", "goals"]}
                  label="Цели оппонента"
                  rows={3}
                />
                <PText
                  ctx={ctx}
                  path={["opponent", "brief", "what_offends"]}
                  label="Что его задевает (триггер обиды)"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <PText
                  ctx={ctx}
                  path={["opponent", "brief", "never_concede"]}
                  label="В чём ни при каких условиях не уступит"
                  rows={2}
                />
                <PText
                  ctx={ctx}
                  path={["opponent", "brief", "concede_for"]}
                  label="В обмен на что готов пойти на уступки"
                  rows={2}
                />
              </div>
            </SectionCard>
          </div>
        )}

        {/* Раздел 4: Предметы торга и шкала зоны сделки */}
        {activeSection === "issues" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-night">Предметы торга</h3>
                <p className="text-xs text-dusk">
                  Шкалы, пределы уступок и расчёт зоны сделки для каждого уровня сложности
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const issues = asArr(document.issues);
                  const newIssue = {
                    id: `issue_${issues.length + 1}`,
                    label: "Новый предмет",
                    type: "number",
                    unit: "₽",
                    direction: "lower_better",
                    participant: { target: 1000, limit: 1500 },
                    opponent: { start: 2000, limit: 1200 },
                  };
                  ctx.update(setDocPath(ctx.doc, ["issues"], [...issues, newIssue]));
                }}
              >
                + Добавить предмет
              </Button>
            </div>

            {asArr(document.issues).map((issue, idx) => (
              <SectionCard
                key={idx}
                title={String(issue.label ?? `Предмет #${idx + 1}`)}
                actions={
                  <Button
                    variant="text"
                    size="xs"
                    className="text-danger"
                    onClick={() => {
                      const next = asArr(document.issues).filter((_, j) => j !== idx);
                      ctx.update(setDocPath(ctx.doc, ["issues"], next));
                    }}
                  >
                    Удалить
                  </Button>
                }
              >
                <div className="grid grid-cols-4 gap-4">
                  <PInput ctx={ctx} path={["issues", idx, "label"]} label="Название" />
                  <PSelect
                    ctx={ctx}
                    path={["issues", idx, "type"]}
                    label="Тип значения"
                    options={ISSUE_TYPE_OPTIONS}
                  />
                  <PInput ctx={ctx} path={["issues", idx, "unit"]} label="Единица измерения" />
                  <PSelect
                    ctx={ctx}
                    path={["issues", idx, "direction"]}
                    label="Направление"
                    options={DIRECTION_OPTIONS}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4 p-4 rounded-field bg-bg border border-line">
                  <PNum
                    ctx={ctx}
                    path={["issues", idx, "opponent", "start"]}
                    label="Старт оппонента"
                  />
                  <PNum
                    ctx={ctx}
                    path={["issues", idx, "opponent", "limit"]}
                    label="Предел оппонента"
                  />
                  <PNum
                    ctx={ctx}
                    path={["issues", idx, "participant", "target"]}
                    label="Цель участника"
                  />
                  <PNum
                    ctx={ctx}
                    path={["issues", idx, "participant", "limit"]}
                    label="Предел участника"
                  />
                </div>

                {/* Интерактивная шкала зоны сделки */}
                <DealZoneScale issue={issue} />
              </SectionCard>
            ))}
          </div>
        )}

        {/* Раздел 5: Шкалы и состояние */}
        {activeSection === "state" && (
          <SectionCard title="Состояние и начальные шкалы">
            <div className="grid grid-cols-5 gap-3">
              <PNum ctx={ctx} path={["state", "trust", "initial"]} label="Доверие" min={0} max={100} />
              <PNum ctx={ctx} path={["state", "pressure", "initial"]} label="Давление" min={0} max={100} />
              <PNum ctx={ctx} path={["state", "credibility", "initial"]} label="Достоверность" min={0} max={100} />
              <PNum ctx={ctx} path={["state", "patience", "initial"]} label="Терпение" min={0} max={100} />
              <PNum ctx={ctx} path={["state", "credit", "initial"]} label="Очки доводов" min={0} />
            </div>
            <JsonField
              label="Флаги и расширенное состояние"
              value={document.state}
              expert={expert}
              onChange={(next) => ctx.update(setDocPath(ctx.doc, ["state"], next))}
            />
          </SectionCard>
        )}

        {/* Раздел 6: Скрытые факты */}
        {activeSection === "facts" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-night">Скрытые факты</h3>
                <p className="text-xs text-dusk">
                  Факты, которые оппонент знает, но раскроет только при правильных вопросах
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const facts = asArr(document.facts);
                  const newFact = {
                    id: `fact_${facts.length + 1}`,
                    label: "Новый факт",
                    text: "Текст факта...",
                    style: "as_argument",
                  };
                  ctx.update(setDocPath(ctx.doc, ["facts"], [...facts, newFact]));
                }}
              >
                + Добавить факт
              </Button>
            </div>

            {asArr(document.facts).map((fact, idx) => (
              <SectionCard
                key={idx}
                title={String(fact.label ?? `Факт #${idx + 1}`)}
                actions={
                  <Button
                    variant="text"
                    size="xs"
                    className="text-danger"
                    onClick={() => {
                      const next = asArr(document.facts).filter((_, j) => j !== idx);
                      ctx.update(setDocPath(ctx.doc, ["facts"], next));
                    }}
                  >
                    Удалить
                  </Button>
                }
              >
                <div className="grid grid-cols-2 gap-4">
                  <PInput ctx={ctx} path={["facts", idx, "label"]} label="Название факта" />
                  <PInput ctx={ctx} path={["facts", idx, "id"]} label="Идентификатор" />
                </div>
                <PText
                  ctx={ctx}
                  path={["facts", idx, "text"]}
                  label="Текст признания оппонента"
                  rows={2}
                />
                <JsonField
                  label="Условие раскрытия факта"
                  value={fact.reveal_when}
                  expert={expert}
                  rows={3}
                  onChange={(next) =>
                    ctx.update(setDocPath(ctx.doc, ["facts", idx, "reveal_when"], next))
                  }
                />
              </SectionCard>
            ))}
          </div>
        )}

        {/* Раздел 7: Веса доводов */}
        {activeSection === "evidence-weights" && (
          <SectionCard title="Веса доводов" hint="Насколько высоко оппонент ценит различные типы аргументов (0.0 — 1.0)">
            <div className="grid grid-cols-3 gap-4">
              <PNum ctx={ctx} path={["evidence_weights", "competitor_quote"]} label="Предложение конкурента" step={0.1} min={0} max={1} />
              <PNum ctx={ctx} path={["evidence_weights", "market_price"]} label="Рыночная цена" step={0.1} min={0} max={1} />
              <PNum ctx={ctx} path={["evidence_weights", "past_contract"]} label="Прошлый договор" step={0.1} min={0} max={1} />
              <PNum ctx={ctx} path={["evidence_weights", "spec_document"]} label="Спецификация / ГОСТ" step={0.1} min={0} max={1} />
              <PNum ctx={ctx} path={["evidence_weights", "third_party"]} label="Мнение третьей стороны" step={0.1} min={0} max={1} />
              <PNum ctx={ctx} path={["evidence_weights", "policy_rule"]} label="Внутреннее правило" step={0.1} min={0} max={1} />
              <PNum ctx={ctx} path={["evidence_weights", "own_constraint"]} label="Собственное ограничение" step={0.1} min={0} max={1} />
              <PNum ctx={ctx} path={["evidence_weights", "opinion"]} label="Личное мнение" step={0.1} min={0} max={1} />
              <div className="flex flex-col gap-1.5 opacity-60">
                <span className="text-13 font-medium">Без опоры (none)</span>
                <span className="text-sm font-mono h-9 flex items-center">0.0 (строго ноль)</span>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Раздел 8: Этапы разговора */}
        {activeSection === "stages" && (
          <SectionCard title="Этапы разговора" hint="Структура состояний диалога и правил переходов">
            <JsonField
              label="Конфигурация этапов и переходов (JSON)"
              value={document.stages}
              expert={expert}
              rows={16}
              onChange={(next) => ctx.update(setDocPath(ctx.doc, ["stages"], next))}
            />
          </SectionCard>
        )}

        {/* Раздел 9: Финалы */}
        {activeSection === "finals" && (
          <SectionCard title="Финалы сценария" hint="Возможные исходы переговоров с рангом от S до F">
            <JsonField
              label="Массив финалов (JSON)"
              value={document.finals}
              expert={expert}
              rows={14}
              onChange={(next) => ctx.update(setDocPath(ctx.doc, ["finals"], next))}
            />
          </SectionCard>
        )}

        {/* Раздел 10: Уровни сложности */}
        {activeSection === "difficulty" && (
          <SectionCard title="Уровни сложности (Easy / Hard)" hint="Модификаторы поверх базового обычного уровня">
            <JsonField
              label="Параметры уровней сложности (JSON)"
              value={document.difficulty}
              expert={expert}
              rows={12}
              onChange={(next) => ctx.update(setDocPath(ctx.doc, ["difficulty"], next))}
            />
          </SectionCard>
        )}

        {/* Раздел 11: Заметки и прочее */}
        {(activeSection === "notes" ||
          activeSection === "custom-moves" ||
          activeSection === "move-effects" ||
          activeSection === "jailbreak") && (
          <SectionCard title={SECTION_LABEL[activeSection]}>
            <JsonField
              label={`${SECTION_LABEL[activeSection]} (JSON)`}
              value={getPath(document, [activeSection.replace("-", "_")])}
              expert={expert}
              rows={12}
              onChange={(next) =>
                ctx.update(
                  setDocPath(ctx.doc, [activeSection.replace("-", "_")], next),
                )
              }
            />
          </SectionCard>
        )}
      </main>

      {/* Правая панель: Панель «Проверка» */}
      <aside
        className={cx(
          "w-80 shrink-0 bg-surface rounded-card border border-line p-5 flex flex-col gap-4 sticky top-4 transition-all",
          !checkPanelOpen && "w-12 p-2 overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="checkCircle" size={18} className={isBlocking ? "text-danger" : "text-success"} />
            {checkPanelOpen && <h3 className="font-semibold text-night text-base">Проверка</h3>}
          </div>
          <button
            type="button"
            onClick={() => setCheckPanelOpen((v) => !v)}
            className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-frost text-dusk"
            title={checkPanelOpen ? "Свернуть панель" : "Развернуть панель"}
          >
            <Icon name={checkPanelOpen ? "chevR" : "chevL"} size={14} />
          </button>
        </div>

        {checkPanelOpen && (
          <>
            {/* Статус проверки */}
            <div
              className={cx(
                "p-3 rounded-card text-13 font-medium flex items-center gap-2",
                isBlocking
                  ? "bg-danger-bg text-danger"
                  : (check?.warning_count ?? 0) > 0
                    ? "bg-warning-bg text-warning"
                    : "bg-success-bg text-success",
              )}
            >
              <span>
                {isBlocking
                  ? `Ошибок: ${check?.blocking_count} · Предупреждений: ${check?.warning_count ?? 0}`
                  : (check?.warning_count ?? 0) > 0
                    ? `Предупреждений: ${check?.warning_count}`
                    : "Ошибок нет — можно публиковать"}
              </span>
            </div>

            {/* Допуск к оценке */}
            {isAssessment && admissionRehearsals && (
              <div className="p-3 bg-frost rounded-card border border-line flex flex-col gap-1 text-xs">
                <span className="font-semibold text-night">Допуск к оценке:</span>
                <span className={admissionBlocked ? "text-danger font-medium" : "text-success font-medium"}>
                  Репетиций на этой версии: {admissionRehearsals.done} из {admissionRehearsals.required}
                </span>
                {admissionBlocked && (
                  <span className="text-dusk">
                    Для публикации в режиме оценки требуется провести ещё{" "}
                    {admissionRehearsals.required - admissionRehearsals.done} репетиций
                  </span>
                )}
              </div>
            )}

            {/* Список диагностик */}
            <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
              {(check?.messages ?? []).length === 0 ? (
                <span className="text-xs text-dusk py-2 text-center">Диагностических замечаний нет</span>
              ) : (
                check?.messages.map((m, i) => (
                  <div
                    key={i}
                    className={cx(
                      "p-2.5 rounded text-xs flex flex-col gap-1 border",
                      m.severity === "blocking"
                        ? "bg-danger-bg border-danger/20 text-danger"
                        : "bg-warning-bg border-warning/20 text-warning",
                    )}
                  >
                    <p className="leading-snug">{m.message}</p>
                    <button
                      type="button"
                      onClick={() => handleJumpToField(m)}
                      className="text-[11px] underline font-medium text-accent self-start hover:opacity-80"
                    >
                      Перейти к полю
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Кнопки действий */}
            <div className="flex flex-col gap-2 pt-3 border-t border-line">
              <Button
                onClick={onPublishClick}
                disabled={readOnly || isBlocking || admissionBlocked}
                className="w-full"
              >
                Опубликовать версию
              </Button>
              <Button
                variant="secondary"
                onClick={onRehearseClick}
                className="w-full"
              >
                Репетировать в тренажёре
              </Button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
