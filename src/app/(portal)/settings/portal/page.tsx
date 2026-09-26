"use client";

import { useEffect, useState } from "react";
import { getMe } from "@/lib/api/modules/auth";
import { getSettings, updateSettings } from "@/lib/api/modules/settings";
import { useApi } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  Input,
  Notice,
  PageSpinner,
  useToast,
} from "@/components/ui";
import { AdminGate } from "@/components/settings/admin-gate";

const FIELDS = [
  {
    key: "admission_rehearsals",
    label: "Репетиций для допуска к оценке",
    min: 1,
    max: 20,
  },
  {
    key: "abandon_timeout_minutes",
    label: "Минут до закрытия брошенной сессии",
    min: 2,
    max: 120,
  },
  {
    key: "code_max_failed_attempts",
    label: "Неудачных попыток кода до блокировки",
    min: 3,
    max: 50,
  },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export default function PortalSettingsPage() {
  const meQ = useApi(() => getMe(), []);
  return (
    <AdminGate me={meQ.data}>
      <PortalSettingsContent />
    </AdminGate>
  );
}

function PortalSettingsContent() {
  const toast = useToast();
  const settingsQ = useApi(() => getSettings(), []);
  const settings = settingsQ.data;

  const [values, setValues] = useState<Record<FieldKey, string>>({
    admission_rehearsals: "",
    abandon_timeout_minutes: "",
    code_max_failed_attempts: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setValues({
        admission_rehearsals: String(settings.admission_rehearsals),
        abandon_timeout_minutes: String(settings.abandon_timeout_minutes),
        code_max_failed_attempts: String(settings.code_max_failed_attempts),
      });
    }
  }, [settings]);

  if (settingsQ.loading) return <PageSpinner />;
  if (settingsQ.error) {
    return <Notice variant="error" title={settingsQ.error.problem.title} />;
  }
  if (!settings) return null;

  const onSave = async () => {
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    const payload: Partial<Record<FieldKey, number>> = {};
    for (const f of FIELDS) {
      const n = Number(values[f.key]);
      if (!Number.isInteger(n) || n < f.min || n > f.max) {
        nextErrors[f.key] = `Целое число от ${f.min} до ${f.max}`;
      } else {
        payload[f.key] = n;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateSettings(payload);
      settingsQ.setData(updated);
      toast.show("Настройки сохранены");
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.problem.title : "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[720px]">
      <h1 className="text-2xl font-medium leading-tight">Настройки портала</h1>

      {saveError && <Notice variant="error" title={saveError} />}

      <Card bordered className="p-6">
        <h2 className="text-base font-medium mb-4">Настройки портала</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-13 font-medium">Демо-режим</span>
            <div className="flex items-center gap-2">
              <Badge variant="demo" icon="dot">демо</Badge>
              <span className="text-sm">
                Демо-режим: {settings.demo_mode ? "включён" : "выключен"}
              </span>
            </div>
            <span className="text-xs text-dusk">Переключается переменной окружения на сервере</span>
          </div>

          {FIELDS.map((f) => (
            <Input
              key={f.key}
              label={f.label}
              type="number"
              min={f.min}
              max={f.max}
              value={values[f.key]}
              error={errors[f.key]}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="max-w-[360px]"
            />
          ))}

          <div className="flex items-center gap-3 pt-1">
            <Button loading={saving} onClick={onSave}>
              Сохранить
            </Button>
            {settings.updated_at && (
              <span className="text-xs text-dusk">
                Обновлено {formatDateTime(settings.updated_at)}
                {settings.updated_by_name ? ` · ${settings.updated_by_name}` : ""}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
