"use client";

import { useEffect, useState } from "react";
import {
  archiveTrainerProfile,
  checkTrainerProfile,
  getTrainerProfile,
  updateTrainerProfile,
  updateTrainerProfileKeys,
} from "@/lib/api/modules/profiles";
import { getMe } from "@/lib/api/modules/auth";
import { useApi } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import type {
  ProfileCheckResult,
  TrainerProfileAdmin,
  TrainerProfileSettings,
} from "@/lib/api/types";
import { formatDateTime, formatNumber } from "@/lib/utils";
import {
  Badge,
  Button,
  DataTable,
  Input,
  Menu,
  Modal,
  Notice,
  PageSpinner,
  SegmentControl,
  Select,
  Switch,
  Textarea,
  useToast,
  type Column,
} from "@/components/ui";
import { CHECK_TARGET_LABEL, ROUTE_LABEL } from "./labels";
import { SettingsCard } from "./settings-card";

type ModelKey = "opponent" | "participant_judge" | "opponent_judge";

const MODEL_BLOCKS: Array<{ key: ModelKey; title: string; hint?: string }> = [
  { key: "opponent", title: "Оппонент", hint: "ведёт разговор" },
  { key: "participant_judge", title: "Разбор реплик участника" },
  { key: "opponent_judge", title: "Проверка оппонента" },
];

function errText(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.problem.title : fallback;
}

const num = (raw: string): number => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

export function ProfileEditor({ profileId }: { profileId: string }) {
  const toast = useToast();
  const meQ = useApi(() => getMe(), []);
  const isAdmin = meQ.data?.user.role === "admin";

  const profileQ = useApi(() => getTrainerProfile(profileId), [profileId]);
  const profile = profileQ.data;

  const [name, setName] = useState("");
  const [form, setForm] = useState<TrainerProfileSettings | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<ProfileCheckResult | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySaving, setKeySaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && form === null) {
      setForm(structuredClone(profile.settings));
      setName(profile.name);
    }
  }, [profile, form]);

  if (profileQ.loading || (meQ.loading && !meQ.data)) return <PageSpinner />;
  if (profileQ.error) {
    return <Notice variant="error" title={profileQ.error.problem.title} />;
  }
  if (!profile || !form) return null;

  const ro = !isAdmin;
  const adminProfile: TrainerProfileAdmin | null =
    isAdmin && "openrouter_key_last4" in profile ? (profile as TrainerProfileAdmin) : null;

  const setModelField = (
    key: ModelKey,
    field: "model" | "context_window" | "max_tokens",
    value: string | number,
  ) => {
    setForm((f) => {
      if (!f) return f;
      const prev = f.models?.[key];
      const next = { ...(prev ?? { model: "", context_window: 0, max_tokens: 0 }), [field]: value };
      return { ...f, models: { ...f.models, [key]: next } };
    });
  };

  const setSpeechField = (kind: "asr" | "tts", field: "base_url" | "model" | "voice", value: string) => {
    setForm((f) => {
      if (!f) return f;
      const prev = f.speech?.[kind];
      const next = { ...(prev ?? { base_url: "", voice: null }), [field]: value };
      return { ...f, speech: { ...f.speech, [kind]: next } };
    });
  };

  const patchCamera = (enabled: boolean) => {
    setForm((f) => {
      if (!f) return f;
      const prev = f.camera;
      return {
        ...f,
        camera: {
          enabled,
          emotion_labels_to_opponent: enabled ? (prev?.emotion_labels_to_opponent ?? false) : false,
        },
      };
    });
  };

  const setLimit = (field: "max_turns" | "session_minutes", value: number) => {
    setForm((f) => (f ? { ...f, limits: { ...f.limits, [field]: value } } : f));
  };

  const onSave = async () => {
    if (!form || !name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateTrainerProfile(profileId, { name: name.trim(), settings: form });
      profileQ.setData(updated);
      setSaveError(null);
      toast.show("Профиль сохранён");
    } catch (e) {
      setSaveError(errText(e, "Не удалось сохранить профиль"));
    } finally {
      setSaving(false);
    }
  };

  const onCheck = async () => {
    setChecking(true);
    setCheckError(null);
    try {
      setCheckResult(await checkTrainerProfile(profileId));
    } catch (e) {
      setCheckResult(null);
      setCheckError(errText(e, "Проверка не выполнена"));
    } finally {
      setChecking(false);
    }
  };

  const onReplaceKey = async () => {
    if (!keyValue.trim()) {
      setKeyError("Введите новый ключ");
      return;
    }
    setKeySaving(true);
    setKeyError(null);
    try {
      const updated = await updateTrainerProfileKeys(profileId, { openrouter_key: keyValue.trim() });
      profileQ.setData(updated);
      setKeyModalOpen(false);
      setKeyValue("");
      toast.show("Ключ обновлён");
    } catch (e) {
      setKeyError(errText(e, "Не удалось обновить ключ"));
    } finally {
      setKeySaving(false);
    }
  };

  const onArchive = async () => {
    setArchiving(true);
    setArchiveError(null);
    try {
      const updated = await archiveTrainerProfile(profileId);
      profileQ.setData(updated);
      toast.show("Профиль архивирован");
    } catch (e) {
      setArchiveError(errText(e, "Не удалось архивировать профиль"));
    } finally {
      setArchiving(false);
    }
  };

  const checkColumns: Column<ProfileCheckResult["rows"][number]>[] = [
    {
      key: "target",
      title: "Цель",
      render: (r) => CHECK_TARGET_LABEL[r.target],
    },
    {
      key: "route",
      title: "Маршрут",
      render: (r) => (r.route ? ROUTE_LABEL[r.route] : "—"),
    },
    {
      key: "ok",
      title: "Результат",
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          {r.ok ? (
            <Badge variant="reviewed" icon="check">ок</Badge>
          ) : (
            <Badge variant="violation" icon="x">не отвечает</Badge>
          )}
          {r.message && <span className="text-xs text-dusk">{r.message}</span>}
        </span>
      ),
    },
    {
      key: "latency",
      title: "Задержка",
      align: "right",
      render: (r) => (r.latency_ms != null ? `${formatNumber(r.latency_ms)} мс` : "—"),
    },
    {
      key: "slow",
      title: "",
      width: 110,
      render: (r) => (r.slow ? <Badge variant="lucky" icon="hour">медленно</Badge> : null),
    },
  ];

  const cameraOn = form.camera?.enabled ?? false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-medium leading-tight">{profile.name}</h1>
            {profile.is_default && <Badge variant="default">по умолчанию</Badge>}
            {profile.archived_at && <Badge variant="archived">в архиве</Badge>}
          </div>
          <p className="text-13 text-dusk mt-1">
            Ревизия {profile.revision}
            {profile.updated_at ? ` · обновлён ${formatDateTime(profile.updated_at)}` : ""}
          </p>
        </div>
        {isAdmin && (
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button variant="secondary" loading={checking} onClick={onCheck}>
              Проверить профиль
            </Button>
            <Button loading={saving} disabled={!name.trim()} onClick={onSave}>
              Сохранить
            </Button>
            <Menu
              items={[
                {
                  key: "archive",
                  label: archiving ? "Архивация…" : "Архивировать",
                  icon: "archive",
                  danger: true,
                  disabled: profile.is_default || archiving,
                  onClick: onArchive,
                },
              ]}
            />
          </div>
        )}
      </div>

      {saveError && <Notice variant="error" title={saveError} />}
      {archiveError && <Notice variant="error" title={archiveError} />}
      {checkError && <Notice variant="error" title={checkError} />}

      {checkResult && (
        <SettingsCard title="Итог проверки" hint={`Проверено ${formatDateTime(checkResult.checked_at)}`}>
          <DataTable columns={checkColumns} rows={checkResult.rows} rowKey={(r) => r.target} />
        </SettingsCard>
      )}

      <SettingsCard title="Основное">
        <Input
          label="Название профиля"
          value={name}
          disabled={ro}
          onChange={(e) => setName(e.target.value)}
          className="max-w-[480px]"
        />
      </SettingsCard>

      <SettingsCard title="Модели">
        <div className="grid grid-cols-2 gap-4 max-w-[980px]">
          <Select
            label="Основной маршрут"
            value={form.primary_route ?? "stub"}
            disabled={ro}
            onChange={(v) => setForm((f) => (f ? { ...f, primary_route: v as typeof f.primary_route } : f))}
            options={[
              { value: "openrouter", label: "OpenRouter" },
              { value: "own_server", label: "Свой сервер" },
            ]}
          />
          <div />
          <Input
            label="Адрес OpenRouter"
            value={form.openrouter?.base_url ?? ""}
            disabled={ro}
            onChange={(e) => setForm((f) => (f ? { ...f, openrouter: { base_url: e.target.value } } : f))}
          />
          <Input
            label="Адрес сервера моделей"
            value={form.model_server?.base_url ?? ""}
            disabled={ro}
            onChange={(e) => setForm((f) => (f ? { ...f, model_server: { base_url: e.target.value } } : f))}
          />
        </div>

        {adminProfile ? (
          <div className="flex items-end gap-2 max-w-[980px]">
            <Input
              label="Ключ OpenRouter"
              readOnly
              value={adminProfile.openrouter_key_last4 ? `•••• ${adminProfile.openrouter_key_last4}` : "не задан"}
              className="flex-1"
            />
            <Button variant="secondary" onClick={() => setKeyModalOpen(true)}>
              Заменить ключ
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Switch checked={profile.has_openrouter_key} disabled aria-label="Ключ OpenRouter задан" />
              <span className="text-dusk">Ключ OpenRouter {profile.has_openrouter_key ? "задан" : "не задан"}</span>
            </div>
            <Notice variant="banner" title="Ключи получает только тренажёр — в браузер они не приходят" />
          </div>
        )}
        {adminProfile?.keys_changed_at && (
          <p className="text-xs text-dusk">
            Ключи изменены {formatDateTime(adminProfile.keys_changed_at)}
            {adminProfile.keys_changed_by_name ? ` · ${adminProfile.keys_changed_by_name}` : ""}
          </p>
        )}

        <div className="grid grid-cols-3 gap-4">
          {MODEL_BLOCKS.map((block) => {
            const m = form.models?.[block.key];
            return (
              <div key={block.key} className="rounded-card border border-line p-4 flex flex-col gap-3">
                <div>
                  <div className="text-sm font-medium">{block.title}</div>
                  {block.hint && <div className="text-xs text-dusk">{block.hint}</div>}
                </div>
                <Input
                  label="Модель"
                  value={m?.model ?? ""}
                  disabled={ro}
                  onChange={(e) => setModelField(block.key, "model", e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Окно контекста"
                    type="number"
                    min={0}
                    value={m?.context_window ?? 0}
                    disabled={ro}
                    onChange={(e) => setModelField(block.key, "context_window", num(e.target.value))}
                  />
                  <Input
                    label="Макс. токенов"
                    type="number"
                    min={0}
                    value={m?.max_tokens ?? 0}
                    disabled={ro}
                    onChange={(e) => setModelField(block.key, "max_tokens", num(e.target.value))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Речь">
        <div className="grid grid-cols-2 gap-4">
          {(["asr", "tts"] as const).map((kind) => (
            <div key={kind} className="rounded-card border border-line p-4 flex flex-col gap-3">
              <div className="text-sm font-medium">{kind === "asr" ? "Распознавание (ASR)" : "Синтез (TTS)"}</div>
              <Input
                label="Адрес сервиса"
                value={form.speech?.[kind]?.base_url ?? ""}
                disabled={ro}
                onChange={(e) => setSpeechField(kind, "base_url", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Модель"
                  value={form.speech?.[kind]?.model ?? ""}
                  disabled={ro}
                  onChange={(e) => setSpeechField(kind, "model", e.target.value)}
                />
                {kind === "tts" && (
                  <Input
                    label="Голос"
                    value={form.speech?.tts?.voice ?? ""}
                    disabled={ro}
                    onChange={(e) => setSpeechField("tts", "voice", e.target.value)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Разговор">
        <div>
          <div className="text-13 font-medium mb-1.5">Режим ввода реплик</div>
          <div className={ro ? "pointer-events-none opacity-60" : undefined}>
            <SegmentControl
              value={form.input_mode ?? "push_to_talk"}
              onChange={(v) =>
                setForm((f) => (f ? { ...f, input_mode: v as NonNullable<typeof f.input_mode> } : f))
              }
              options={[
                { value: "push_to_talk", label: "Кнопка „говорить“" },
                { value: "open_mic", label: "Открытый микрофон" },
                { value: "text", label: "Текст" },
              ]}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Switch checked={cameraOn} disabled={ro} onChange={patchCamera} aria-label="Камера включена" />
          <span>Камера включена</span>
        </div>
        {cameraOn && (
          <Notice variant="banner" title="Кадры с камеры не покидают компьютер сотрудника" />
        )}
        <div className="flex items-center gap-2 text-sm">
          <Switch
            checked={form.camera?.emotion_labels_to_opponent ?? false}
            disabled={ro || !cameraOn}
            onChange={(v) =>
              setForm((f) =>
                f
                  ? {
                      ...f,
                      camera: {
                        enabled: f.camera?.enabled ?? false,
                        emotion_labels_to_opponent: v,
                      },
                    }
                  : f,
              )
            }
            aria-label="Передавать эмоции оппоненту"
          />
          <span className={cameraOn ? undefined : "text-dusk"}>Передавать эмоции оппоненту</span>
        </div>
        <p className="text-xs text-dusk">
          Оппоненту уходят только текстовые метки эмоций — видео и кадры никуда не отправляются.
        </p>
      </SettingsCard>

      <SettingsCard title="Лимиты">
        <div className="grid grid-cols-2 gap-4 max-w-[640px]">
          <Input
            label="Максимум ходов"
            type="number"
            min={1}
            value={form.limits?.max_turns ?? 0}
            disabled={ro}
            onChange={(e) => setLimit("max_turns", num(e.target.value))}
          />
          <Input
            label="Длительность сессии, минут"
            type="number"
            min={1}
            value={form.limits?.session_minutes ?? 0}
            disabled={ro}
            onChange={(e) => setLimit("session_minutes", num(e.target.value))}
          />
        </div>
        <Textarea
          label="Примечание о моделях и провайдерах"
          value={form.model_providers_note ?? ""}
          disabled={ro}
          onChange={(e) => setForm((f) => (f ? { ...f, model_providers_note: e.target.value } : f))}
          className="max-w-[640px]"
        />
      </SettingsCard>

      <Modal
        open={keyModalOpen}
        onClose={() => {
          if (!keySaving) {
            setKeyModalOpen(false);
            setKeyError(null);
          }
        }}
        title="Замена ключа OpenRouter"
        footer={
          <>
            <Button variant="secondary" disabled={keySaving} onClick={() => setKeyModalOpen(false)}>
              Отмена
            </Button>
            <Button loading={keySaving} onClick={onReplaceKey}>
              Сохранить ключ
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {keyError && <Notice variant="error" title={keyError} />}
          <Input
            label="Новый ключ"
            type="password"
            autoComplete="new-password"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            hint="В браузере хранятся только последние 4 символа для отображения"
          />
        </div>
      </Modal>
    </div>
  );
}
