"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createScenario, listScenarioTemplates } from "@/lib/api/modules/scenarios";
import { useApi } from "@/lib/api/hooks";
import type { Mode, ScenarioTemplate } from "@/lib/api/types";
import { SPHERE_LABEL } from "@/lib/labels";
import { formatPercent } from "@/lib/utils";
import {
  Badge,
  Button,
  CardSkeleton,
  Drawer,
  Notice,
  StatBar,
  useToast,
} from "@/components/ui";
import { useRun } from "./use-run";

export function TemplateGallery({ mode }: { mode: Mode }) {
  const router = useRouter();
  const toast = useToast();
  const templates = useApi(listScenarioTemplates, []);
  const createRun = useRun(createScenario);
  const [selected, setSelected] = useState<ScenarioTemplate | null>(null);

  const take = async (t: ScenarioTemplate) => {
    const card = await createRun.run({ origin: "template", mode, template_id: t.id });
    if (card) {
      router.push(`/scenarios/${card.id}`);
    } else {
      toast.show(createRun.lastError.current?.problem.title ?? "Не удалось создать сценарий");
    }
  };

  if (templates.loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    );
  }

  if (templates.error) {
    return (
      <Notice variant="error" message={templates.error.problem.title} className="max-w-[720px]">
        <Button variant="text" size="xs" className="mt-1" onClick={templates.reload}>
          Повторить
        </Button>
      </Notice>
    );
  }

  const list = templates.data ?? [];

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {list.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t)}
            className="text-left bg-surface rounded-card border border-line p-5 flex flex-col gap-2 transition-colors hover:border-contour"
          >
            <div className="text-base font-semibold leading-snug">{t.title}</div>
            <Badge variant="statusGray">{SPHERE_LABEL[t.sphere]}</Badge>
            <p className="text-13 text-dusk leading-relaxed">{t.description}</p>
            <div className="mt-1 flex flex-col gap-1">
              {t.main_weights.slice(0, 3).map((w) => (
                <div key={w.evidence} className="flex items-baseline justify-between gap-3 text-13">
                  <span className="text-dusk truncate">{w.label}</span>
                  <span className="font-medium shrink-0">{formatPercent(w.weight)}%</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        width={480}
        title={selected?.title}
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Badge variant="statusGray">{SPHERE_LABEL[selected.sphere]}</Badge>
            </div>
            <p className="text-sm leading-relaxed">{selected.description}</p>
            <div className="flex flex-col gap-1">
              <span className="text-13 font-medium">Веса доводов</span>
              {selected.main_weights.map((w) => (
                <StatBar key={w.evidence} label={w.label} share={w.weight} />
              ))}
            </div>
            <Button
              className="w-full"
              loading={createRun.loading}
              onClick={() => void take(selected)}
            >
              Взять этот сценарий
            </Button>
          </div>
        )}
      </Drawer>
    </>
  );
}
