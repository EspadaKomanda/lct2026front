import type {
  AssignmentStatus,
  AuditAction,
  ConsentAnswerValue,
  ConsentKind,
  Criterion,
  Difficulty,
  Mode,
  NegotiationType,
  Origin,
  ProcessStatus,
  RehearsalStatus,
  Role,
  ScoringProfile,
  SessionStatus,
  Sphere,
} from "./api/types";

export const ROLE_LABEL: Record<Role, string> = {
  methodologist: "Методолог",
  observer: "Наблюдатель",
  admin: "Администратор",
};

export const MODE_LABEL: Record<Mode, string> = {
  training: "Тренировка",
  assessment: "Оценка",
};

export const ORIGIN_LABEL: Record<Origin, string> = {
  brief: "Из брифа",
  template: "Из шаблона",
  copy: "Копия",
  manual: "Вручную",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Лёгкий",
  normal: "Обычный",
  hard: "Сложный",
};

export const SPHERE_LABEL: Record<Sphere, string> = {
  procurement: "Закупки",
  internal_promotion: "Внутреннее повышение",
  internal_client: "Внутренний клиент",
  sales: "Продажи",
  contractor_deadline: "Сроки подрядчика",
  resource_split: "Делёж ресурса",
  other: "Другое",
};

export const NEGOTIATION_TYPE_LABEL: Record<NegotiationType, string> = {
  distributive: "Распределительные",
  integrative: "Интегративные",
  mixed: "Смешанные",
};

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  in_progress: "Идёт",
  completed: "Завершена",
  ended_by_participant: "Прервана участником",
  turn_limit: "Закончились ходы",
  time_limit: "Закончилось время",
  connection_lost: "Потеря связи",
  abandoned: "Закрыта сервером",
};

export const PROCESS_STATUS_LABEL: Record<ProcessStatus, string> = {
  pending: "Ждём оценку",
  ok: "Оценен",
  not_received: "Судья не ответил",
  too_short: "Слишком короткий разговор",
  not_scored: "Не считается",
};

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  not_started: "Не начал",
  in_progress: "Идёт",
  passed: "Прошёл",
  abandoned: "Прервал",
  expired: "Срок истёк",
  cancelled: "Отменено",
  code_blocked: "Код заблокирован",
};

export const REHEARSAL_STATUS_LABEL: Record<RehearsalStatus, string> = {
  link_issued: "Ссылка выдана",
  running: "Идёт",
  uploaded: "Загружена",
  expired: "Истекла",
};

export const CRITERION_LABEL: Record<Criterion, string> = {
  diagnosis: "Выяснение ситуации",
  interests: "Интересы и размен",
  criteria: "Объективные критерии",
  alternative: "Запасной вариант",
  discipline: "Дисциплина уступок",
  conduct: "Поведение",
};

export const SCORING_PROFILE_LABEL: Record<ScoringProfile, string> = {
  normal: "Обычная",
  short: "Короткая",
};

export const CONSENT_KIND_LABEL: Record<ConsentKind, string> = {
  notice_training: "Уведомление перед тренировкой",
  consent_assessment: "Согласие перед оценкой",
  consent_external_ai: "Отправка во внешнюю нейросеть",
  notice_demo: "Уведомление в демо",
  written_assessment: "Письменное согласие (отметка HR)",
};

export const CONSENT_ANSWER_LABEL: Record<ConsentAnswerValue, string> = {
  acknowledged: "Прочитано",
  granted: "Даю",
  refused: "Не даю",
};

export const SCENARIO_STATUS_LABEL: Record<"draft" | "published" | "archived", string> = {
  draft: "Черновик",
  published: "Опубликован",
  archived: "В архиве",
};

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  login: "Вход в портал",
  login_failed: "Неудачный вход",
  session_opened: "Открыта сессия",
  session_reduced_opened: "Открыт урезанный вид сессии",
  session_reviewed: "Сессия просмотрена",
  export_created: "Создана выгрузка",
  audit_exported: "Журнал выгружен",
  assignment_created: "Создано назначение",
  assignment_cancelled: "Назначение отменено",
  assignment_extended: "Назначение продлено",
  code_issued: "Выдан код",
  code_reissued: "Код перевыпущен",
  code_blocked: "Код заблокирован",
  code_unblocked: "Блокировка кода снята",
  decision_recorded: "Записано кадровое решение",
  objection_submitted: "Подано возражение",
  objection_answered: "Ответ на возражение",
  profile_saved: "Профиль сохранён",
  profile_key_changed: "Изменён ключ профиля",
  user_saved: "Пользователь сохранён",
  access_granted: "Выдан доступ к группе",
  access_revoked: "Отозван доступ к группе",
  person_saved: "Карточка сотрудника сохранена",
  consent_withdrawn: "Согласие отозвано",
  external_ai_withdrawn: "Отозвано согласие на внешнюю нейросеть",
  written_consent_recorded: "Отмечено письменное согласие",
  group_saved: "Группа сохранена",
  scenario_published: "Сценарий опубликован",
  scenario_mode_changed: "Изменён режим сценария",
  scenario_archived: "Сценарий архивирован",
  settings_changed: "Настройки изменены",
  session_closed_by_server: "Сессия закрыта сервером",
  session_reopened: "Сессия открыта заново",
};
