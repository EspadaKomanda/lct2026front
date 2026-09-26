import type { ModelRoute } from "@/lib/api/types";
import { AUDIT_ACTION_LABEL } from "@/lib/labels";

export const INPUT_MODE_LABEL: Record<"push_to_talk" | "open_mic" | "text", string> = {
  push_to_talk: "кнопка „говорить“",
  open_mic: "открытый микрофон",
  text: "текст",
};

export const ROUTE_LABEL: Record<ModelRoute, string> = {
  openrouter: "OpenRouter",
  own_server: "свой сервер",
  stub: "заглушка",
};

export const CHECK_TARGET_LABEL: Record<
  "opponent" | "participant_judge" | "opponent_judge" | "tts",
  string
> = {
  opponent: "Оппонент",
  participant_judge: "Судья участника",
  opponent_judge: "Судья оппонента",
  tts: "Синтез речи",
};

export const AUDIT_ACTION_OPTIONS = Object.entries(AUDIT_ACTION_LABEL).map(([value, label]) => ({
  value: value as keyof typeof AUDIT_ACTION_LABEL,
  label,
}));
