"use client";

import { useEffect, useState } from "react";
import {
  confirmGenerationStep,
  getGenerationState,
  regenerateGenerationStep,
} from "@/lib/api/modules/scenarios";
import type { GenerationState } from "@/lib/api/types";
import {
  Button,
  Card,
  Notice,
  PageSpinner,
  Steps,
  Textarea,
  useToast,
} from "@/components/ui";

const STEP_TITLES = [
  "Легенда и персонаж",
  "Числа и зона сделки",
  "Механика и схема переходов",
];

export function GenerationWizard({
  scenarioId,
  onComplete,
}: {
  scenarioId: string;
  onComplete: () => void;
}) {
  const toast = useToast();
  const [state, setState] = useState<GenerationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const fetchState = async () => {
    try {
      const res = await getGenerationState(scenarioId);
      setState(res);
      if (res.status === "done") {
        onComplete();
      }
    } catch {
      // Ignored during poll
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchState();
    const interval = setInterval(() => {
      void fetchState();
    }, 2000);
    return () => clearInterval(interval);
  }, [scenarioId]);

  if (loading && !state) return <PageSpinner />;
  if (!state) return null;

  const currentStep = state.step;
  const isRunning = state.status === "running";
  const isFailed = state.status === "failed";
  const resultObj = (state.result ?? {}) as Record<string, unknown>;

  const handleConfirm = async () => {
    setActionBusy(true);
    try {
      await confirmGenerationStep(scenarioId, currentStep, {
        fields: resultObj,
      });
      toast.show(`Шаг ${currentStep} подтверждён`);
      await fetchState();
    } catch {
      toast.show("Не удалось подтвердить шаг");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRegenerate = async () => {
    setActionBusy(true);
    try {
      await regenerateGenerationStep(scenarioId, currentStep, {
        comment: comment.trim() || undefined,
      });
      toast.show(`Запущен повтор генерации шага ${currentStep}`);
      setComment("");
      await fetchState();
    } catch {
      toast.show("Не удалось перезапустить шаг");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <Card bordered className="p-8 max-w-[800px] mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-night">
          Генерация сценария из брифа
        </h2>
        <p className="text-sm text-dusk">
          ИИ создаёт сценарий в 3 шага с обязательным подтверждением каждого шага человеком
        </p>
      </div>

      <Steps
        steps={STEP_TITLES.map((t, idx) => {
          const stepNum = idx + 1;
          const isDone = state.confirmed_steps.includes(stepNum);
          const isCurrent = state.step === stepNum;
          const status = isDone
            ? "done"
            : isCurrent
              ? isFailed
                ? "fail"
                : "current"
              : "wait";
          return {
            key: String(stepNum),
            label: t,
            status,
            statusText: isDone
              ? "Утверждено"
              : isCurrent
                ? isRunning
                  ? "Идёт создание..."
                  : "Ожидает проверки"
                : "В очереди",
          };
        })}
      />

      {isFailed && (
        <Notice
          variant="error"
          message={state.error?.message ?? "Произошла ошибка при генерации шага"}
        />
      )}

      {isRunning ? (
        <div className="p-8 bg-frost rounded-card border border-line flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-sm font-medium text-night">
            {state.progress_text ?? `Идёт генерация шага ${currentStep}...`}
          </span>
          <span className="text-xs text-dusk">Обычно это занимает 10–20 секунд</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-surface rounded-card border border-line flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-dusk">
              Результат шага {currentStep}: {STEP_TITLES[currentStep - 1]}
            </span>

            <div className="text-13 text-night font-mono bg-bg p-3 rounded max-h-60 overflow-y-auto whitespace-pre-wrap">
              {JSON.stringify(resultObj, null, 2)}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-dusk">
              Замечания или пожелания для перегенерации (опционально)
            </label>
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: сделай оппонента более упрямым в вопросе цены..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button
              variant="secondary"
              onClick={handleRegenerate}
              disabled={actionBusy}
            >
              Сгенерировать шаг заново
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={actionBusy}
            >
              {actionBusy
                ? "Сохранение..."
                : currentStep === 3
                  ? "Утвердить и завершить"
                  : "Утвердить шаг и продолжить"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
