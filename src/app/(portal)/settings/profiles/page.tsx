"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api/modules/auth";
import { createTrainerProfile, listTrainerProfiles } from "@/lib/api/modules/profiles";
import { useApi } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import type { TrainerProfile } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";
import {
  Badge,
  Button,
  DataTable,
  Input,
  Modal,
  Notice,
  PageSpinner,
  Select,
  useToast,
  type Column,
} from "@/components/ui";
import { INPUT_MODE_LABEL } from "@/components/settings/labels";

const MODEL_ROWS: Array<{ key: "opponent" | "participant_judge" | "opponent_judge"; label: string }> = [
  { key: "opponent", label: "Оппонент" },
  { key: "participant_judge", label: "Судья участника" },
  { key: "opponent_judge", label: "Судья оппонента" },
];

export default function TrainerProfilesPage() {
  const router = useRouter();
  const toast = useToast();
  const meQ = useApi(() => getMe(), []);
  const isAdmin = meQ.data?.user.role === "admin";

  const profilesQ = useApi(() => listTrainerProfiles({ include_archived: true }), []);
  const profiles = profilesQ.data;

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (profilesQ.loading) return <PageSpinner />;
  if (profilesQ.error) {
    return <Notice variant="error" title={profilesQ.error.problem.title} />;
  }
  if (!profiles) return null;

  const onCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createTrainerProfile({
        name: newName.trim(),
        copy_from: copyFrom || undefined,
      });
      setCreateOpen(false);
      setNewName("");
      setCopyFrom("");
      toast.show("Профиль создан");
      router.push(`/settings/profiles/${created.id}`);
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.problem.title : "Не удалось создать профиль");
    } finally {
      setCreating(false);
    }
  };

  const columns: Column<TrainerProfile>[] = [
    {
      key: "name",
      title: "Название",
      render: (p) => (
        <span className="inline-flex items-center gap-2 flex-wrap">
          <span className="font-medium text-night">{p.name}</span>
          {p.is_default && <Badge variant="default">по умолчанию</Badge>}
          {p.archived_at && <Badge variant="archived">в архиве</Badge>}
        </span>
      ),
    },
    {
      key: "models",
      title: "Модели",
      render: (p) => (
        <div className="flex flex-col gap-0.5 text-xs text-dusk">
          {MODEL_ROWS.map((row) => {
            const m = p.settings.models?.[row.key];
            return (
              <span key={row.key}>
                <span className="text-gray">{row.label}:</span>{" "}
                {m ? `${m.model} · окно ${formatNumber(m.context_window)}` : "—"}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      key: "input_mode",
      title: "Ввод",
      width: 170,
      render: (p) => INPUT_MODE_LABEL[p.settings.input_mode ?? "push_to_talk"],
    },
    {
      key: "camera",
      title: "Камера",
      width: 110,
      render: (p) => (p.settings.camera?.enabled ? "включена" : "выключена"),
    },
    {
      key: "limits",
      title: "Лимиты",
      width: 150,
      render: (p) => {
        const l = p.settings.limits;
        if (l?.max_turns == null && l?.session_minutes == null) return "—";
        return `${l.max_turns ?? "—"} ходов · ${l.session_minutes ?? "—"} мин`;
      },
    },
    {
      key: "revision",
      title: "Ревизия",
      align: "right",
      width: 90,
      render: (p) => p.revision,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-medium leading-tight">Профили тренажёра</h1>
        {isAdmin && (
          <Button className="ml-auto" onClick={() => setCreateOpen(true)}>
            Новый профиль
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={profiles}
        rowKey={(p) => p.id}
        onRowClick={(p) => router.push(`/settings/profiles/${p.id}`)}
        emptyText="Профилей пока нет"
      />

      <Modal
        open={createOpen}
        onClose={() => {
          if (!creating) {
            setCreateOpen(false);
            setCreateError(null);
          }
        }}
        title="Новый профиль"
        footer={
          <>
            <Button variant="secondary" disabled={creating} onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button loading={creating} disabled={!newName.trim()} onClick={onCreate}>
              Создать
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {createError && <Notice variant="error" title={createError} />}
          <Input
            label="Название"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Например, Основной"
          />
          <Select
            label="Скопировать из"
            value={copyFrom}
            onChange={setCopyFrom}
            placeholder="Без копирования"
            options={profiles.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
      </Modal>
    </div>
  );
}
