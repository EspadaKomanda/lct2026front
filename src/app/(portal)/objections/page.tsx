"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApi, useMutation } from "@/lib/api/hooks";
import {
  listObjections,
  respondToObjection,
  type ObjectionStatus,
} from "@/lib/api/modules/objections";
import type { Objection } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Drawer,
  EmptyState,
  Notice,
  PageSpinner,
  Pagination,
  SegmentControl,
  Textarea,
  useToast,
  type Column,
} from "@/components/ui";

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "all", label: "Все" },
  { value: "open", label: "Ждут ответа" },
  { value: "answered", label: "С ответом" },
];

function targetDescription(target: Objection["target"]): string {
  if (!target) return "Результат сессии";
  if (target.kind === "result_grade") return "Оценка «Результат»";
  if (target.kind === "process_grade") return "Оценка «Процесс»";
  if (target.kind === "criterion") return `Критерий: ${target.criterion_id ?? ""}`;
  if (target.kind === "turn") return `Реплика №${target.turn_seq ?? ""}`;
  if (target.kind === "summary_point") return `Пункт резюме №${target.point_index ?? ""}`;
  return "Сессия";
}

export default function ObjectionsPage() {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<ObjectionStatus>("all");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Objection | null>(null);
  const [replyText, setReplyText] = useState("");

  const pageApi = useApi(
    () =>
      listObjections({
        status: status === "all" ? undefined : status,
        limit: LIMIT,
        offset,
      }),
    [status, offset],
  );

  const respondMutation = useMutation(async ({ id, text }: { id: string; text: string }) => {
    return respondToObjection(id, text);
  });

  const objections = pageApi.data?.items ?? [];
  const total = pageApi.data?.page.total ?? 0;

  const handleOpenDrawer = (item: Objection) => {
    setSelected(item);
    setReplyText(item.response?.text ?? "");
  };

  const handleCloseDrawer = () => {
    setSelected(null);
    setReplyText("");
  };

  const handleSubmitResponse = async () => {
    if (!selected || !replyText.trim()) return;
    try {
      const updated = await respondMutation.run({
        id: selected.id,
        text: replyText.trim(),
      });
      if (updated) {
        toast.show("Ответ на возражение отправлен");
        setSelected(updated);
        pageApi.reload();
      } else {
        toast.show("Не удалось отправить ответ");
      }
    } catch {
      toast.show("Не удалось отправить ответ");
    }
  };

  const columns: Column<Objection>[] = [
    {
      key: "person",
      title: "Сотрудник",
      render: (o) => (
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-night truncate">
            {o.person.full_name ?? o.person.pseudonym ?? "Сотрудник"}
          </span>
          <span className="text-xs text-dusk font-mono">{o.person.number}</span>
        </div>
      ),
    },
    {
      key: "scenario",
      title: "Сценарий",
      render: (o) => (
        <span className="text-13 text-night truncate max-w-[200px]" title={o.scenario_title ?? ""}>
          {o.scenario_title ?? "—"}
        </span>
      ),
    },
    {
      key: "target",
      title: "Предмет спора",
      render: (o) => (
        <span className="text-13 text-dusk">{targetDescription(o.target)}</span>
      ),
    },
    {
      key: "text",
      title: "Возражение",
      render: (o) => (
        <span className="text-13 text-night line-clamp-1 max-w-[320px]" title={o.text ?? ""}>
          {o.text ?? <span className="text-dusk italic">Текст удалён по отзыву согласия</span>}
        </span>
      ),
    },
    {
      key: "submitted_at",
      title: "Подано",
      render: (o) => (
        <span className="text-13 text-dusk whitespace-nowrap">
          {formatDateTime(o.submitted_at)}
        </span>
      ),
    },
    {
      key: "status",
      title: "Статус",
      align: "right",
      render: (o) =>
        o.response ? (
          <Badge variant="reviewed">Отвечено</Badge>
        ) : (
          <Badge variant="objection">Ждёт ответа</Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">Возражения</h1>
          <p className="text-sm text-dusk mt-1">
            Возражения сотрудников к результатам переговоров и ответы HR
          </p>
        </div>

        <div className="w-[300px]">
          <SegmentControl
            value={status}
            onChange={(v) => {
              setStatus(v as ObjectionStatus);
              setOffset(0);
            }}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      {pageApi.loading ? (
        <PageSpinner />
      ) : pageApi.error ? (
        <Notice variant="error" message={pageApi.error.problem.title}>
          <Button variant="text" size="xs" onClick={pageApi.reload} className="mt-1">
            Повторить
          </Button>
        </Notice>
      ) : objections.length === 0 ? (
        <Card bordered className="p-8">
          <EmptyState
            icon="msg"
            text={
              status === "open"
                ? "Нет нерассмотренных возражений"
                : status === "answered"
                  ? "Нет отвеченных возражений"
                  : "Возражений от сотрудников пока нет"
            }
          />
        </Card>
      ) : (
        <>
          <Card bordered className="overflow-hidden">
            <DataTable
              columns={columns}
              rows={objections}
              rowKey={(o) => o.id}
              onRowClick={handleOpenDrawer}
              emptyText="Возражений не найдено"
            />
          </Card>
          <Pagination
            offset={offset}
            limit={LIMIT}
            total={total}
            onOffsetChange={setOffset}
          />
        </>
      )}

      {selected && (
        <Drawer
          open
          onClose={handleCloseDrawer}
          title="Возражение сотрудника"
          width={560}
        >
          <div className="flex flex-col gap-5 p-6 overflow-y-auto max-h-[calc(100vh-140px)]">
            <div className="flex flex-col gap-2 p-4 rounded-card bg-frost border border-line">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-night">
                  {selected.person.full_name ?? selected.person.pseudonym ?? "Сотрудник"}
                </span>
                <span className="text-xs font-mono text-dusk">{selected.person.number}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-dusk">
                <span>{selected.scenario_title ?? "Сценарий"}</span>
                <span>Подано: {formatDateTime(selected.submitted_at)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-13 text-night">
                  Предмет: <strong className="font-medium">{targetDescription(selected.target)}</strong>
                </span>
                <Link
                  href={`/results/${selected.session_id}`}
                  className="text-13 text-accent hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Перейти к сессии →
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-dusk">
                Текст возражения
              </span>
              <div className="p-4 rounded-card bg-surface border border-line text-sm text-night leading-relaxed whitespace-pre-wrap">
                {selected.text || (
                  <span className="text-dusk italic">
                    Текст возражения удалён согласно процедуре отзыва согласия на обработку персональных данных.
                  </span>
                )}
              </div>
            </div>

            {selected.response ? (
              <div className="flex flex-col gap-2 p-4 rounded-card bg-surface border border-success/30">
                <div className="flex items-center justify-between text-xs text-dusk">
                  <span className="font-medium text-success flex items-center gap-1">
                    ✓ Ответ HR ({selected.response.responded_by_name})
                  </span>
                  <span>{formatDateTime(selected.response.responded_at)}</span>
                </div>
                <div className="mt-2 text-sm text-night whitespace-pre-wrap leading-relaxed">
                  {selected.response.text}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-3 border-t border-line">
                <label className="flex flex-col gap-1.5">
                  <span className="text-13 font-medium text-night">Ответ HR</span>
                  <Textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Напишите официальный ответ сотруднику с пояснением оценки или решения..."
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={handleCloseDrawer}>
                    Отмена
                  </Button>
                  <Button
                    onClick={handleSubmitResponse}
                    disabled={!replyText.trim() || respondMutation.loading}
                  >
                    {respondMutation.loading ? "Отправка..." : "Отправить ответ"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Drawer>
      )}
    </div>
  );
}
