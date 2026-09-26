"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Difficulty, RehearsalLink, RehearsalStatus } from "@/lib/api/types";
import { createRehearsal, listRehearsals } from "@/lib/api/modules/rehearsals";
import { useApi, useMutation } from "@/lib/api/hooks";
import { DIFFICULTY_LABEL, REHEARSAL_STATUS_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  CopyButton,
  DataTable,
  EmptyState,
  FinalRank,
  Icon,
  Modal,
  Notice,
  SegmentControl,
  Skeleton,
  type BadgeVariant,
  type Column,
} from "@/components/ui";
import { finalsRankMap } from "./document";
import type { ScenarioTabProps } from "./scheme-tab";

const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

const STATUS_VARIANT: Record<RehearsalStatus, BadgeVariant> = {
  link_issued: "rehearsal",
  running: "rehearsal",
  uploaded: "reviewed",
  expired: "statusGray",
};

export function RehearsalModal({
  scenarioId,
  onClose,
}: {
  scenarioId: string;
  onClose: () => void;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [link, setLink] = useState<RehearsalLink | null>(null);
  const create = useMutation((body: { difficulty: Difficulty }) =>
    createRehearsal(scenarioId, body),
  );

  return (
    <Modal open onClose={onClose} title="Новая репетиция" width={560}>
      {link === null ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-13 font-medium">Уровень сложности</span>
            <SegmentControl
              value={difficulty}
              onChange={(v) => setDifficulty(v as Difficulty)}
              options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
            />
          </div>
          <div className="flex items-center gap-2 text-13 text-dusk">
            <Icon name="hour" size={14} className="shrink-0" />
            Ссылка одноразовая, живёт 30 минут
          </div>
          {create.error && <Notice variant="error" message={create.error.problem.title} />}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            <Button
              loading={create.loading}
              onClick={async () => {
                const created = await create.run({ difficulty });
                if (created) setLink(created);
              }}
            >
              Создать ссылку
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Notice
            variant="banner"
            message="Ссылку показываем один раз — сохраните её сейчас"
          />
          <div className="bg-bg rounded-field p-4 flex flex-col gap-3">
            <span className="font-mono text-13 break-all">{link.link}</span>
            <div className="flex items-center gap-2">
              <CopyButton text={link.link} />
              <Button
                variant="secondary"
                size="xs"
                onClick={() => window.open(link.link, "_blank", "noopener")}
              >
                <Icon name="ext" size={14} />
                Открыть в тренажёре
              </Button>
            </div>
          </div>
          <div className="text-13 text-dusk">
            Один раз · только для вас · действует до {formatDateTime(link.expires_at)}
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Готово</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function RehearsalsTab({ scenarioId, document }: ScenarioTabProps) {
  const { data, loading, error, reload } = useApi(
    () => listRehearsals(scenarioId),
    [scenarioId],
  );
  const [modalOpen, setModalOpen] = useState(false);
  const finals = useMemo(() => finalsRankMap(document), [document]);

  const columns: Column<NonNullable<typeof data>["items"][number]>[] = [
    {
      key: "date",
      title: "Дата",
      width: 150,
      render: (r) => formatDateTime(r.uploaded_at ?? r.issued_at),
    },
    {
      key: "difficulty",
      title: "Уровень",
      render: (r) => DIFFICULTY_LABEL[r.difficulty],
    },
    {
      key: "rank",
      title: "Буква",
      render: (r) =>
        r.result_rank ? (
          <FinalRank rank={r.result_rank} size="sm" title={finals[r.result_rank] || undefined} />
        ) : (
          "—"
        ),
    },
    {
      key: "run_by",
      title: "Кто репетировал",
      render: (r) => r.run_by_name ?? "—",
    },
    {
      key: "status",
      title: "Статус",
      render: (r) => (
        <Badge variant={STATUS_VARIANT[r.status]}>{REHEARSAL_STATUS_LABEL[r.status]}</Badge>
      ),
    },
    {
      key: "open",
      title: "",
      width: 80,
      render: (r) => (
        <Link
          href={`/scenarios/${scenarioId}/rehearsals/${r.id}`}
          className="text-accent text-13 hover:text-accent-hover"
        >
          Открыть
        </Link>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton height={20} width={220} />
          <Skeleton height={40} width={130} className="ml-auto" />
        </div>
        <Skeleton height={240} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <Notice variant="error" message={error.problem.title} />
        <div>
          <Button variant="secondary" size="sm" onClick={reload}>
            Повторить
          </Button>
        </div>
      </div>
    );
  }

  const admission = data?.admission;
  const items = data?.items ?? [];
  const admitted = admission !== undefined && admission.done >= admission.required;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm">
          Репетиций: <span className="font-medium">{admission?.done ?? 0}</span> из{" "}
          <span className="font-medium">{admission?.required ?? 0}</span>
        </span>
        {admitted ? (
          <Badge variant="reviewed">Допуск получен</Badge>
        ) : (
          <Badge variant="smallData" icon="tri">
            Допуска нет
          </Badge>
        )}
        <Button className="ml-auto" onClick={() => setModalOpen(true)}>
          <Icon name="play" size={14} />
          Репетировать
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="repeat"
          text="Репетиций ещё не было. Создайте ссылку кнопкой «Репетировать» и пройдите разговор в тренажёре."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          emptyText="Репетиций нет"
        />
      )}

      {modalOpen && (
        <RehearsalModal
          scenarioId={scenarioId}
          onClose={() => {
            setModalOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
