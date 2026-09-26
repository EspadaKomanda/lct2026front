"use client";

import { useState } from "react";
import type { Mode } from "@/lib/api/types";
import { Icon, type IconName } from "@/components/icons";
import { SegmentControl } from "@/components/ui";
import { cx } from "@/lib/utils";
import { QuestionnaireForm } from "./questionnaire-form";
import { TemplateGallery } from "./template-gallery";

const MODE_OPTIONS = [
  { value: "training", label: "Тренировка" },
  { value: "assessment", label: "Оценка" },
] as const;

function ModeCard({
  active,
  icon,
  title,
  onClick,
}: {
  active: boolean;
  icon: IconName;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "h-14 flex-1 flex items-center gap-3 px-4 rounded-card bg-surface text-sm font-medium transition-all",
        active ? "ring-2 ring-accent" : "border border-line hover:border-contour"
      )}
    >
      <Icon name={icon} size={20} className={active ? "text-accent" : "text-dusk"} />
      {title}
    </button>
  );
}

export function NewScenario() {
  const [mode, setMode] = useState<Mode>("training");
  const [tab, setTab] = useState<"brief" | "template">("brief");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Новый сценарий</h1>
        <SegmentControl
          className="ml-auto"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[...MODE_OPTIONS]}
          aria-label="Режим сценария"
        />
      </div>

      <div className="flex gap-4" role="tablist" aria-label="Способ создания">
        <ModeCard
          active={tab === "brief"}
          icon="sliders"
          title="Сгенерировать по описанию"
          onClick={() => setTab("brief")}
        />
        <ModeCard
          active={tab === "template"}
          icon="book"
          title="Взять готовый"
          onClick={() => setTab("template")}
        />
      </div>

      {tab === "brief" ? <QuestionnaireForm mode={mode} /> : <TemplateGallery mode={mode} />}
    </div>
  );
}
