import type { Criterion } from "@/lib/api/types";

export const CRITERIA: Criterion[] = [
  "diagnosis",
  "interests",
  "criteria",
  "alternative",
  "discipline",
  "conduct",
];

export const CRITERION_HINT: Record<Criterion, string> = {
  diagnosis: "Выяснил ли участник ситуацию, интересы и ограничения оппонента до торга.",
  interests: "Искал ли взаимовыгодный размен вместо односторонних уступок.",
  criteria: "Опирался ли на объективные стандарты и рыночные данные.",
  alternative: "Показал ли реалистичную альтернативу сделке (BATNA).",
  discipline: "Уступал ли шагами и с условиями, а не сразу и бесплатно.",
  conduct: "Держал ли деловой тон, без давления и переходов на личности.",
};

export const OPPONENT_VIOLATION_KIND_LABEL: Record<string, string> = {
  out_of_role: "вышел из роли",
  beyond_limit: "за пределами полномочий",
  early_fact: "раскрыл факт раньше времени",
  wrong_number: "ошибся в цифрах",
};
