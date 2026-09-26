/**
 * Фикстуры мока портала — правдоподобные русские данные по контракту types.ts.
 * Основаны на мок-моделях дизайн-черновика (раздел «Мок-модели данных»).
 * Все даты в прошлом относительно 2026-09-26, формат ISO 8601.
 */
import type {
  Assignment,
  ConsentRecord,
  Decision,
  Difficulty,
  EngineObject,
  FinalRank,
  Group,
  IncidentEvent,
  JudgeAnswerSummaryItem,
  Mark,
  Mode,
  NegotiationType,
  Origin,
  ParticipantObjection,
  Person,
  PortalUser,
  Rehearsal,
  RehearsalRecordUpload,
  ScenarioDocument,
  ScenarioStatus,
  Sphere,
  TrainerProfilePublic,
  TrainerProfileSettings,
  OpponentViolation,
  Review,
  SessionHeader,
  ScoreColumns,
  SessionFlags,
} from "../api/types";

// ---------------------------------------------------------------------------
// Идентификаторы (детерминированные литеральные uuid)
// ---------------------------------------------------------------------------

const id = (tail: string) => `00000000-0000-4000-8000-${tail}`;

export const IDS = {
  users: { gromova: id("000000000001"), lanskoy: id("000000000002") },
  groups: { zakup: id("100000000001"), managers: id("100000000002"), reserve: id("100000000003") },
  profiles: { main: id("700000000001"), ownServer: id("700000000002") },
  scenarios: { sc1: id("300000000001"), sc2: id("300000000002"), sc3: id("300000000003"), sc4: id("300000000004") },
  versions: { sc1v1: id("310000000001"), sc2v1: id("310000000002"), sc3v1: id("310000000003") },
};

// ---------------------------------------------------------------------------
// Пользователи портала
// ---------------------------------------------------------------------------

export const USERS: PortalUser[] = [
  {
    id: IDS.users.gromova,
    login: "gromova",
    full_name: "Громова Наталья Сергеевна",
    role: "methodologist",
    is_active: true,
    group_ids: [IDS.groups.zakup, IDS.groups.managers, IDS.groups.reserve],
    last_login_at: "2026-09-25T16:40:00Z",
  },
  {
    id: IDS.users.lanskoy,
    login: "lanskoy",
    full_name: "Ланской Виктор Павлович",
    role: "admin",
    is_active: true,
    group_ids: [IDS.groups.zakup, IDS.groups.managers, IDS.groups.reserve],
    last_login_at: "2026-09-24T11:05:00Z",
  },
];

/** Пароль мок-входа для обоих пользователей. */
export const MOCK_PASSWORD = "arena2026";

// ---------------------------------------------------------------------------
// Группы
// ---------------------------------------------------------------------------

export const GROUPS: Group[] = [
  {
    id: IDS.groups.zakup,
    name: "Закупщики",
    has_access: true,
    department: "Дирекция по снабжению",
    trainer_profile_id: IDS.profiles.main,
    trainer_profile_name: "Основной",
    people_count: 5,
    archived_at: null,
  },
  {
    id: IDS.groups.managers,
    name: "Менеджеры",
    has_access: true,
    department: "Отдел по работе с клиентами",
    trainer_profile_id: IDS.profiles.main,
    trainer_profile_name: "Основной",
    people_count: 3,
    archived_at: null,
  },
  {
    id: IDS.groups.reserve,
    name: "Кадровый резерв 2026",
    has_access: true,
    department: "Управление персоналом",
    trainer_profile_id: IDS.profiles.ownServer,
    trainer_profile_name: "Только наш сервер",
    people_count: 3,
    archived_at: null,
  },
];

// ---------------------------------------------------------------------------
// Сотрудники (участники)
// ---------------------------------------------------------------------------

export interface PersonFixture extends Person {
  consents: ConsentRecord[];
  /** Полный отзыв согласия: обезличивание (display_name → null, тексты → null). */
  anonymized?: boolean;
}

let consentCounter = 0;

function consent(partial: Omit<ConsentRecord, "id" | "answered_at"> & { answered_at?: string }): ConsentRecord {
  consentCounter += 1;
  return { id: id(`2100000000${String(consentCounter).padStart(2, "0")}`), answered_at: "2026-09-02T09:00:00Z", ...partial };
}

export const PEOPLE: PersonFixture[] = [
  {
    subject_id: id("200000000001"),
    number: "N-3Q7KD1",
    group_id: IDS.groups.zakup,
    group_name: "Закупщики",
    full_name: "Корнилова Анна Сергеевна",
    pseudonym: null,
    personnel_no: "P-0412",
    job_title: "Специалист по закупкам",
    written_consent_valid_until: "2027-09-02",
    code_blocked: false,
    consents: [
      consent({ kind: "notice_training", answer: "acknowledged", text_version: "2" }),
      consent({ kind: "consent_assessment", answer: "granted", text_version: "3" }),
      consent({ kind: "consent_external_ai", answer: "granted", text_version: "3" }),
      consent({
        kind: "written_assessment",
        answer: "granted",
        document_ref: "СОГ-188/2026",
        document_channel: "paper",
        signed_on: "2026-09-02",
        valid_until: "2027-09-02",
        recorded_by_name: "Громова Наталья Сергеевна",
      }),
    ],
  },
  {
    subject_id: id("200000000002"),
    number: "N-8M4VX2",
    group_id: IDS.groups.zakup,
    group_name: "Закупщики",
    full_name: "Шайхутдинов Руслан Альбертович",
    pseudonym: null,
    personnel_no: "P-0413",
    job_title: "Специалист по закупкам",
    code_blocked: false,
    consents: [
      consent({ kind: "notice_training", answer: "acknowledged", text_version: "2" }),
      consent({ kind: "consent_assessment", answer: "granted", text_version: "3" }),
    ],
  },
  {
    subject_id: id("200000000003"),
    number: "N-5T9NW3",
    group_id: IDS.groups.zakup,
    group_name: "Закупщики",
    full_name: "Ефимова Мария Дмитриевна",
    pseudonym: null,
    personnel_no: "P-0414",
    job_title: "Ведущий специалист по закупкам",
    code_blocked: false,
    consents: [
      consent({ kind: "notice_training", answer: "acknowledged", text_version: "2" }),
      consent({ kind: "consent_assessment", answer: "granted", text_version: "3" }),
    ],
  },
  {
    subject_id: id("200000000004"),
    number: "N-2P6HC4",
    group_id: IDS.groups.zakup,
    group_name: "Закупщики",
    full_name: "Гарипов Тимур Рашитович",
    pseudonym: null,
    personnel_no: "P-0415",
    job_title: "Специалист по закупкам",
    code_blocked: false,
    consents: [
      consent({ kind: "notice_training", answer: "acknowledged", text_version: "2" }),
      consent({ kind: "consent_assessment", answer: "granted", text_version: "3" }),
    ],
  },
  {
    subject_id: id("200000000005"),
    number: "N-7R2MZ5",
    group_id: IDS.groups.zakup,
    group_name: "Закупщики",
    full_name: null,
    pseudonym: "Закупщик-07",
    personnel_no: null,
    job_title: null,
    code_blocked: false,
    consents: [consent({ kind: "notice_training", answer: "acknowledged", text_version: "2" })],
  },
  {
    subject_id: id("200000000006"),
    number: "N-9D4KF6",
    group_id: IDS.groups.managers,
    group_name: "Менеджеры",
    full_name: "Орлова Елена Викторовна",
    pseudonym: null,
    personnel_no: "P-0421",
    job_title: "Менеджер по работе с клиентами",
    code_blocked: false,
    consents: [consent({ kind: "notice_training", answer: "acknowledged", text_version: "2" })],
  },
  {
    subject_id: id("200000000007"),
    number: "N-6H8QV7",
    group_id: IDS.groups.managers,
    group_name: "Менеджеры",
    full_name: "Валиев Артур Игоревич",
    pseudonym: null,
    personnel_no: "P-0418",
    job_title: "Менеджер по работе с клиентами",
    code_blocked: false,
    consents: [consent({ kind: "notice_training", answer: "acknowledged", text_version: "2" })],
  },
  {
    subject_id: id("200000000008"),
    number: "N-4K2WX8",
    group_id: IDS.groups.managers,
    group_name: "Менеджеры",
    full_name: "Хабибуллина Гузель Айратовна",
    pseudonym: null,
    personnel_no: "P-0423",
    job_title: "Старший менеджер по работе с клиентами",
    code_blocked: false,
    consents: [consent({ kind: "notice_training", answer: "acknowledged", text_version: "2" })],
  },
  {
    subject_id: id("200000000009"),
    number: "N-1Z5NM9",
    group_id: IDS.groups.reserve,
    group_name: "Кадровый резерв 2026",
    full_name: "Лужин Павел Станиславович",
    pseudonym: null,
    personnel_no: "P-0416",
    job_title: "Руководитель проектов",
    code_blocked: true,
    consents: [consent({ kind: "notice_training", answer: "acknowledged", text_version: "2" })],
  },
  {
    subject_id: id("200000000010"),
    number: "N-8V3CS0",
    group_id: IDS.groups.reserve,
    group_name: "Кадровый резерв 2026",
    full_name: "Зуева Ольга Константиновна",
    pseudonym: null,
    personnel_no: "P-0419",
    job_title: "Руководитель проектов",
    code_blocked: false,
    consents: [consent({ kind: "notice_training", answer: "acknowledged", text_version: "2" })],
  },
  {
    subject_id: id("200000000011"),
    number: "N-5Q6PT1",
    group_id: IDS.groups.reserve,
    group_name: "Кадровый резерв 2026",
    full_name: "Семёнов Денис Андреевич",
    pseudonym: null,
    personnel_no: "P-0422",
    job_title: "Аналитик проектного офиса",
    code_blocked: false,
    consents: [consent({ kind: "notice_training", answer: "acknowledged", text_version: "2" })],
  },
];

// ---------------------------------------------------------------------------
// Документы сценариев (упрощённый, но валидный вид: passport/brief/opponent/
// issues/state/facts/stages/finals/difficulty)
// ---------------------------------------------------------------------------

export interface MockScenarioDoc {
  passport: {
    id: string;
    version: number;
    title: string;
    mode: Mode;
    sphere: Sphere;
    negotiation_type: NegotiationType;
  };
  brief: Record<string, unknown>;
  opponent: { card: Record<string, unknown>; brief: Record<string, unknown> };
  issues: Array<Record<string, unknown>>;
  state: Record<string, unknown>;
  facts: Array<Record<string, unknown>>;
  stages: Array<Record<string, unknown>>;
  finals: Array<Record<string, unknown>>;
  difficulty: Record<Difficulty, Record<string, unknown>>;
  evidence_weights: Array<{ evidence: string; label: string; weight: number }>;
  custom_moves: Array<Record<string, unknown>>;
  move_effects: Array<Record<string, unknown>>;
}

export const DEFAULT_WEIGHTS: Array<{ evidence: string; label: string; weight: number }> = [
  { evidence: "competitor_offer", label: "Предложение конкурента", weight: 1.0 },
  { evidence: "market_price", label: "Рыночная цена", weight: 0.8 },
  { evidence: "past_contract", label: "Прошлый договор", weight: 0.7 },
  { evidence: "document", label: "Документ", weight: 0.6 },
  { evidence: "third_party", label: "Мнение третьей стороны", weight: 0.5 },
  { evidence: "company_rule", label: "Правило компании", weight: 0.4 },
  { evidence: "own_limit", label: "Своё ограничение", weight: 0.3 },
  { evidence: "personal_opinion", label: "Личное мнение", weight: 0.1 },
];

const SC1_FINALS = [
  { id: "fin_s", title: "Эталонная закупка", rank: "S", stage: "st_deal", condition: "Цена ≤ 19 500 ₽, предоплата ≤ 70 %, отгрузка ≤ 6 марта, раскрыт факт о ревизии", epilogue: "Поставщик уважает подготовку и предлагает долгосрочный контракт." },
  { id: "fin_a", title: "Хорошая сделка", rank: "A", stage: "st_deal", condition: "Цена ≤ 20 500 ₽, предоплата ≤ 80 %, отгрузка ≤ 8 марта", epilogue: "Условия в пределах полномочий, запасной вариант не понадобился." },
  { id: "fin_b", title: "Хорошая цена, но фланец не тот", rank: "B", stage: "st_deal", condition: "Цена ≤ 19 800 ₽, но факт о ревизии не раскрыт", epilogue: "Экономия омрачена переделкой переходников под фланец." },
  { id: "fin_c", title: "В рамках полномочий", rank: "C", stage: "st_deal", condition: "Сделка в пределах лимитов без выяснения интересов", epilogue: "Сделка состоялась, потенциал размена не использован." },
  { id: "fin_d", title: "Сделки нет", rank: "D", stage: "st_leave", condition: "Участник ушёл без договорённости", epilogue: "Поставщик ушёл к другому заказчику." },
  { id: "fin_f", title: "Выход за полномочия", rank: "F", stage: "st_leave", condition: "Согласованы условия за пределами лимитов участника", epilogue: "Сделка требует согласования с руководством и срывается." },
];

const SC1_STAGES = [
  { id: "st_intro", title: "Знакомство", transitions: [{ type: "after", turns: 2, to: "st_bargain" }] },
  { id: "st_bargain", title: "Торг за цену", transitions: [{ type: "below", issue: "iss_price", value: 20000, to: "st_trade" }, { type: "patience", to: "st_stuck" }] },
  { id: "st_trade", title: "Размен: предоплата за цену", transitions: [{ type: "agree", to: "st_deal" }, { type: "fact", fact: "fact_rev", to: "st_admit" }] },
  { id: "st_last", title: "Последнее слово", transitions: [{ type: "after", turns: 3, to: "st_deal" }] },
  { id: "st_admit", title: "Признание про ревизию", transitions: [{ type: "agree", to: "st_deal" }] },
  { id: "st_offended", title: "Задет", transitions: [{ type: "after", turns: 2, to: "st_bargain" }] },
  { id: "st_stuck", title: "Упёрся", transitions: [{ type: "above", issue: "iss_price", value: 21000, to: "st_bargain" }] },
  { id: "st_deal", title: "Сделка" },
  { id: "st_leave", title: "Уход" },
];

export const SC1_DOC: MockScenarioDoc = {
  passport: {
    id: "sc-reduktory-2026",
    version: 1,
    title: "Редукторы к сроку",
    mode: "assessment",
    sphere: "procurement",
    negotiation_type: "distributive",
  },
  brief: {
    situation: "Срочная закупка 120 мотор-редукторов: к сроку успевает только один поставщик.",
    participant_role: "Специалист по закупкам",
    participant_goals: ["Уложиться в 19 500 ₽ за штуку", "Отгрузка не позже 8 марта", "Оплата — не раньше 30 % аванса"],
    deadline: "2026-03-28",
    intro: "Директор поручил закрыть закупку до конца недели, альтернативных поставщиков по срокам нет.",
  },
  opponent: {
    card: {
      name: "Коммерческий директор поставщика",
      character: "Жёсткий, но честный",
      gender: "male",
      goals: ["Закрыть кассовый разрыв до 28 марта", "Не уступать ниже 18 900 ₽"],
      never: ["Не раскрывать кассовый разрыв без вопроса про предоплату"],
      hurts: "Давление на сроки и ссылки на конкурентов",
      line: "Деньги нужны до конца марта, сроки жмут из-за заказа из Тольятти.",
    },
    brief: { pressure_points: ["предоплата", "сроки отгрузки"], give_away: "Готов уступить в цене за предоплату" },
  },
  issues: [
    {
      id: "iss_price", label: "Цена за штуку", kind: "scale", unit: "₽",
      min: 16000, max: 25000, start: 23400,
      opponent: { start: 25000, limit: 18900, target: 17200 },
      participant: { target: 18500, limit: 21000 },
      hidden: false,
      prepay: { opponent: 17200, participant: 19320 },
    },
    {
      id: "iss_payment", label: "Порядок оплаты", kind: "choice",
      start: "Оплата по факту поставки",
      options: [
        { name: "Отсрочка 45 дней", note: "цель участника" },
        { name: "Полная предоплата", note: "старт оппонента" },
        { name: "Аванс 30 %", note: "компромисс" },
      ],
      opponent: { limit: "Полная предоплата" },
      participant: { target: "Отсрочка 45 дней" },
      hidden: false,
    },
    {
      id: "iss_ship", label: "Дата отгрузки", kind: "scale", unit: "марта",
      min: 1, max: 15, start: 10,
      opponent: { start: 10, limit: 5, target: 7 },
      participant: { target: 5, limit: 12 },
      hidden: false,
    },
    {
      id: "iss_adapter", label: "Переходники под фланец", kind: "scale", unit: "компл.",
      min: 0, max: 120, start: 0,
      opponent: { start: 0, limit: 0, target: 0 },
      participant: { target: 120, limit: 60 },
      hidden: true, reveal_fact: "fact_rev",
    },
  ],
  state: { trust: 55, patience: 60, pressure: 30, credit: 0 },
  facts: [
    { id: "fact_rev", label: "Старая ревизия с другим фланцем", text: "На складе старая ревизия с другим фланцем — без переходников не встанет на конвейер.", hidden: true, ask: ["ревизия", "чертёж", "фланец", "крепление", "совместимость"] },
    { id: "fact_cash", label: "Кассовый разрыв до 28 марта", text: "Поставщику не хватает оборотных средств до конца марта.", hidden: true, self: true, ask: ["зачем предоплата", "оборотные средства"] },
    { id: "fact_tolyatti", label: "Заказ из Тольятти", text: "На поставщика давит параллельный заказ из Тольятти.", hidden: true, self: true, ask: ["заказ", "Тольятти"] },
  ],
  stages: SC1_STAGES.map((s) => ({ ...s })),
  finals: SC1_FINALS.map((f) => ({ ...f })),
  difficulty: {
    easy: { start_values: { iss_price: 22800 }, opponent_limits: { iss_price: [18500, 16800] }, note: null },
    normal: { start_values: { iss_price: 23400 }, opponent_limits: { iss_price: [18900, 17200] }, note: null },
    hard: { start_values: { iss_price: 24000 }, opponent_limits: { iss_price: [19500, 17800] }, note: "Оппонент резче реагирует на давление и перебивает чаще." },
  },
  evidence_weights: DEFAULT_WEIGHTS.map((w) => ({ ...w })),
  custom_moves: [
    { id: "mv_competitor", label: "Предложение конкурента", effect: "pressure" },
    { id: "mv_market", label: "Рыночная цена", effect: "trust" },
  ],
  move_effects: [{ move: "mv_competitor", trust: -4, pressure: 6 }],
};

const SC2_FINALS = [
  { id: "fin_s", title: "Повышение согласовано", rank: "S", stage: "st_close", condition: "Зарплата ≥ 125 000 ₽ и менторство", epilogue: "Руководитель готовит приказ." },
  { id: "fin_a", title: "Повышение по итогам квартала", rank: "A", stage: "st_close", condition: "Зарплата ≥ 115 000 ₽", epilogue: "Договорились вернуться к разговору в конце квартала." },
  { id: "fin_c", title: "Только индексация", rank: "C", stage: "st_close", condition: "Согласие на индексацию 7 %", epilogue: "Рост отложен." },
  { id: "fin_d", title: "Без изменений", rank: "D", stage: "st_leave", condition: "Договорённости нет", epilogue: "Руководитель ожидает аргументов." },
];

export const SC2_DOC: MockScenarioDoc = {
  passport: {
    id: "sc-povyshenie-2026",
    version: 1,
    title: "Разговор о повышении",
    mode: "training",
    sphere: "internal_promotion",
    negotiation_type: "mixed",
  },
  brief: {
    situation: "Сотрудник просит повышение после года работы над ключевым проектом.",
    participant_role: "Сотрудник, кандидат на повышение",
    participant_goals: ["Зарплата от 120 000 ₽", "Переход на грейд старшего"],
    intro: "Встреча с непосредственным руководителем по итогам проекта.",
  },
  opponent: {
    card: {
      name: "Непосредственный руководитель",
      character: "Сдержанный, ориентирован на цифры",
      gender: "female",
      goals: ["Удержать фонд оплаты труда", "Не обещать лишнего до решения дирекции"],
      never: ["Не называть потолок бюджета первым"],
      line: "Готова обсуждать, но решение зависит от результатов квартала.",
    },
    brief: { pressure_points: ["загрузка команды", "риск ухода сотрудника"] },
  },
  issues: [
    { id: "iss_salary", label: "Зарплата", kind: "scale", unit: "тыс ₽", dir: "up", min: 80, max: 150, start: 95, opponent: { start: 95, limit: 130, target: 118 }, participant: { target: 125, limit: 100 }, hidden: false },
    { id: "iss_grade", label: "Грейд и менторство", kind: "choice", start: "Текущий грейд", options: [{ name: "Старший специалист + менторство", note: "цель участника" }, { name: "Текущий грейд", note: "старт оппонента" }], opponent: { limit: "Старший специалист + менторство" }, participant: { target: "Старший специалист + менторство" }, hidden: false },
  ],
  state: { trust: 60, patience: 70, pressure: 20, credit: 0 },
  facts: [
    { id: "fact_budget", label: "Бюджет на грейд утверждён", text: "В фонде уже есть строка на повышение грейда.", hidden: true, ask: ["бюджет", "фонд", "грейд"] },
  ],
  stages: [
    { id: "st_intro", title: "Вступление", transitions: [{ type: "after", turns: 2, to: "st_args" }] },
    { id: "st_args", title: "Аргументация", transitions: [{ type: "above", issue: "iss_salary", value: 115, to: "st_close" }] },
    { id: "st_close", title: "Договорённость" },
    { id: "st_leave", title: "Без решения" },
  ],
  finals: SC2_FINALS.map((f) => ({ ...f })),
  difficulty: {
    easy: { start_values: { iss_salary: 92 }, opponent_limits: { iss_salary: [120, 108] }, note: null },
    normal: { start_values: { iss_salary: 95 }, opponent_limits: { iss_salary: [130, 118] }, note: null },
    hard: { start_values: { iss_salary: 98 }, opponent_limits: { iss_salary: [122, 112] }, note: "Руководитель жёстче проверяет аргументы." },
  },
  evidence_weights: DEFAULT_WEIGHTS.map((w) => ({ ...w })),
  custom_moves: [],
  move_effects: [],
};

export const SC3_DOC: MockScenarioDoc = {
  passport: {
    id: "sc-prodlenie-2026",
    version: 1,
    title: "Продление контракта с клиентом",
    mode: "training",
    sphere: "sales",
    negotiation_type: "integrative",
  },
  brief: {
    situation: "Клиент сомневается в продлении сервисного контракта из-за роста цены.",
    participant_role: "Аккаунт-менеджер",
    participant_goals: ["Сохранить контракт", "Скидка не более 4 %", "Продление на 2 года"],
    intro: "Встреча с директором по закупкам клиента.",
  },
  opponent: {
    card: {
      name: "Директор по закупкам клиента",
      character: "Прагматик, сравнивает предложения",
      gender: "male",
      goals: ["Снизить цену на 10 %", "Получить SLA повыше"],
      never: ["Не раскрывать предложение конкурента"],
      line: "Конкурент предлагает дешевле, у вас последний шанс.",
    },
    brief: { pressure_points: ["конкурент", "бюджет клиента"] },
  },
  issues: [
    { id: "iss_discount", label: "Скидка", kind: "scale", unit: "%", dir: "down", min: 0, max: 15, start: 0, opponent: { start: 10, limit: 4, target: 6 }, participant: { target: 2, limit: 8 }, hidden: false },
    { id: "iss_term", label: "Срок контракта", kind: "choice", start: "1 год", options: [{ name: "2 года", note: "цель участника" }, { name: "1 год", note: "старт оппонента" }, { name: "1 год с опцией", note: "компромисс" }], opponent: { limit: "2 года" }, participant: { target: "2 года" }, hidden: false },
  ],
  state: { trust: 50, patience: 65, pressure: 35, credit: 0 },
  facts: [
    { id: "fact_sla", label: "Провал SLA у конкурента", text: "У конкурента в прошлом квартале просроченные инциденты.", hidden: true, ask: ["SLA", "инциденты", "конкурент"] },
  ],
  stages: [
    { id: "st_intro", title: "Позиция клиента", transitions: [{ type: "after", turns: 2, to: "st_value" }] },
    { id: "st_value", title: "Ценность сервиса", transitions: [{ type: "below", issue: "iss_discount", value: 6, to: "st_close" }] },
    { id: "st_close", title: "Согласование условий" },
  ],
  finals: [
    { id: "fin_s", title: "Контракт на 2 года", rank: "S", stage: "st_close", condition: "Скидка ≤ 4 %, срок 2 года", epilogue: "Клиент продлевает и рекомендует нас дочке." },
    { id: "fin_b", title: "Контракт на 1 год с опцией", rank: "B", stage: "st_close", condition: "Скидка ≤ 6 %, срок 1 год с опцией", epilogue: "Год продления с правом пересмотра." },
    { id: "fin_d", title: "Контракт не продлён", rank: "D", stage: "st_close", condition: "Договорённости нет", epilogue: "Клиент уходит к конкуренту." },
  ],
  difficulty: {
    easy: { start_values: { iss_discount: 6 }, opponent_limits: { iss_discount: [3, 5] }, note: null },
    normal: { start_values: { iss_discount: 8 }, opponent_limits: { iss_discount: [4, 6] }, note: null },
    hard: { start_values: { iss_discount: 10 }, opponent_limits: { iss_discount: [5, 7] }, note: "Клиент агрессивнее торгуется." },
  },
  evidence_weights: DEFAULT_WEIGHTS.map((w) => ({ ...w })),
  custom_moves: [],
  move_effects: [],
};

/** Черновик с намеренной блокирующей ошибкой (финал ведёт в удалённый этап). */
export const SC4_DOC: MockScenarioDoc = {
  passport: {
    id: "sc-sroki-proekta",
    version: 1,
    title: "Сроки проекта с заказчиком",
    mode: "training",
    sphere: "contractor_deadline",
    negotiation_type: "distributive",
  },
  brief: {
    situation: "Заказчик требует сдать этап на две недели раньше без изменения бюджета.",
    participant_role: "Руководитель проектов",
    participant_goals: ["Сдвиг срока не более недели", "Доплата за ускорение"],
    intro: "Совещание с заказчиком по сдвигу календарного плана.",
  },
  opponent: {
    card: { name: "Директор проектов заказчика", character: "Нетерпеливый, давит на штрафы", gender: "male", goals: ["Сдать этап к отчётной дате"], never: [], line: "Штрафы по договору начнутся с 1-го числа." },
    brief: { pressure_points: ["штрафы", "отчётность"] },
  },
  issues: [
    { id: "iss_shift", label: "Сдвиг срока", kind: "scale", unit: "дней", dir: "down", min: 0, max: 14, start: 14, opponent: { start: 14, limit: 5, target: 7 }, participant: { target: 3, limit: 10 }, hidden: false },
  ],
  state: { trust: 40, patience: 50, pressure: 45, credit: 0 },
  facts: [
    { id: "fact_team", label: "Команда на другом проекте", text: "Ключевые разработчики заняты до конца месяца.", hidden: true, ask: ["команда", "ресурсы", "загрузка"] },
  ],
  stages: [
    { id: "st_claim", title: "Претензия заказчика", transitions: [{ type: "after", turns: 2, to: "st_options" }] },
    { id: "st_options", title: "Варианты ускорения", transitions: [{ type: "below", issue: "iss_shift", value: 7, to: "st_penalty" }] },
  ],
  finals: [
    { id: "fin_c", title: "Компромисс по срокам", rank: "C", stage: "st_penalty", condition: "Сдвиг ≤ 7 дней с доплатой", epilogue: "Этап сдаётся с опозданием на неделю." },
    { id: "fin_d", title: "Срыв срока и штраф", rank: "D", stage: "st_penalty", condition: "Соглашение не достигнуто", epilogue: "Начисляются неустойки." },
  ],
  difficulty: {
    easy: { start_values: { iss_shift: 10 }, opponent_limits: { iss_shift: [4, 6] }, note: null },
    normal: { start_values: { iss_shift: 14 }, opponent_limits: { iss_shift: [5, 7] }, note: null },
    hard: { start_values: { iss_shift: 14 }, opponent_limits: { iss_shift: [6, 8] }, note: "Заказчик угрожает расторжением." },
  },
  evidence_weights: DEFAULT_WEIGHTS.map((w) => ({ ...w })),
  custom_moves: [],
  move_effects: [],
};

// ---------------------------------------------------------------------------
// Сценарии
// ---------------------------------------------------------------------------

export interface RehearsalSeed extends Omit<Rehearsal, "record"> {
  record: RehearsalRecordUpload | null;
}

export interface ScenarioSeed {
  id: string;
  slug: string;
  title: string;
  mode: Mode;
  origin: Origin;
  sphere: Sphere;
  negotiation_type: NegotiationType;
  tags: string[];
  status: ScenarioStatus;
  created_at: string;
  created_by_name: string | null;
  doc: MockScenarioDoc;
  versions: Array<{ id: string; number: number; published_at: string; published_by_name: string | null }>;
  archived_at: string | null;
  copied_from: { scenario_id: string; version: number } | null;
  rehearsals: RehearsalSeed[];
  updated_at: string;
}

export const SCENARIOS: ScenarioSeed[] = [
  {
    id: IDS.scenarios.sc1,
    slug: SC1_DOC.passport.id,
    title: "Редукторы к сроку",
    mode: "assessment",
    origin: "brief",
    sphere: "procurement",
    negotiation_type: "distributive",
    tags: ["срочная", "предоплата"],
    status: "published",
    created_at: "2026-09-01T08:15:00Z",
    created_by_name: "Громова Наталья Сергеевна",
    doc: SC1_DOC,
    versions: [{ id: IDS.versions.sc1v1, number: 1, published_at: "2026-09-01T09:30:00Z", published_by_name: "Громова Наталья Сергеевна" }],
    archived_at: null,
    copied_from: null,
    rehearsals: [
      {
        id: id("600000000001"),
        scenario_id: IDS.scenarios.sc1,
        fingerprint: "",
        difficulty: "normal",
        trainer_profile_id: IDS.profiles.main,
        trainer_profile_name: "Основной",
        status: "uploaded",
        run_by_name: "Громова Наталья Сергеевна",
        issued_at: "2026-09-22T13:00:00Z",
        uploaded_at: "2026-09-22T13:40:00Z",
        result_rank: "B",
        counts_for_admission: true,
        profile_revision: 3,
        link_expires_at: "2026-09-22T13:30:00Z",
        redeemed_at: "2026-09-22T13:02:00Z",
        engine_version: "1.4.0",
        final_id: "fin_b",
        result: {
          result: { rank: "B", final_id: "fin_b", number: 74, max: 100 },
          process: { status: "ok", number: 71, criteria_bands: { diagnosis: 3, interests: 3, criteria: 2, alternative: 2, discipline: 3, conduct: 4 } },
        },
        record: {
          fingerprint: "",
          engine_version: "1.4.0",
          status: "completed",
          turns: [],
          steps: [
            { reply_no: 1, breakdown: { stage: "st_intro", intent: "приветствие", route: "openrouter" }, model_errors: [] },
            { reply_no: 5, breakdown: { stage: "st_bargain", intent: "отказ от уступки", route: "openrouter" }, model_errors: [] },
          ],
          judge_attempts: 1,
          final_id: "fin_b",
          judge_answer: {
            criteria_set: "harvard_spin_v1",
            episodes: [{ indicator: "criteria", reply: 4, speaker: "participant", quote: "Предложение конкурента — 21 800 при тех же сроках.", context: null, interest: null, why: "Ссылка на предложение конкурента как на объективный критерий." }],
            summary: [
              { kind: "strength", observation: "Давление обосновано рыночными данными", reply: 4, speaker: "participant", quote: "Предложение конкурента — 21 800 при тех же сроках.", instead: "" },
              { kind: "miss", observation: "Не раскрыт факт о ревизии", reply: 8, speaker: "participant", quote: "Согласны на 19 200.", instead: "Стоило спросить про чертёж и фланец." },
            ],
          },
        },
      },
      {
        id: id("600000000002"),
        scenario_id: IDS.scenarios.sc1,
        fingerprint: "",
        difficulty: "normal",
        trainer_profile_id: IDS.profiles.main,
        trainer_profile_name: "Основной",
        status: "link_issued",
        run_by_name: "Громова Наталья Сергеевна",
        issued_at: "2026-09-25T10:00:00Z",
        uploaded_at: null,
        result_rank: null,
        counts_for_admission: false,
        profile_revision: 3,
        link_expires_at: "2026-09-25T10:30:00Z",
        redeemed_at: null,
        engine_version: null,
        final_id: null,
        result: null,
        record: null,
      },
    ],
    updated_at: "2026-09-01T09:30:00Z",
  },
  {
    id: IDS.scenarios.sc2,
    slug: SC2_DOC.passport.id,
    title: "Разговор о повышении",
    mode: "training",
    origin: "template",
    sphere: "internal_promotion",
    negotiation_type: "mixed",
    tags: ["повышение"],
    status: "published",
    created_at: "2026-09-12T10:00:00Z",
    created_by_name: "Громова Наталья Сергеевна",
    doc: SC2_DOC,
    versions: [{ id: IDS.versions.sc2v1, number: 1, published_at: "2026-09-12T11:20:00Z", published_by_name: "Громова Наталья Сергеевна" }],
    archived_at: null,
    copied_from: null,
    rehearsals: [],
    updated_at: "2026-09-12T11:20:00Z",
  },
  {
    id: IDS.scenarios.sc3,
    slug: SC3_DOC.passport.id,
    title: "Продление контракта с клиентом",
    mode: "training",
    origin: "manual",
    sphere: "sales",
    negotiation_type: "integrative",
    tags: ["продление"],
    status: "published",
    created_at: "2026-09-18T14:30:00Z",
    created_by_name: "Громова Наталья Сергеевна",
    doc: SC3_DOC,
    versions: [{ id: IDS.versions.sc3v1, number: 1, published_at: "2026-09-20T09:10:00Z", published_by_name: "Громова Наталья Сергеевна" }],
    archived_at: null,
    copied_from: null,
    rehearsals: [],
    updated_at: "2026-09-20T09:10:00Z",
  },
  {
    id: IDS.scenarios.sc4,
    slug: SC4_DOC.passport.id,
    title: "Сроки проекта с заказчиком",
    mode: "training",
    origin: "manual",
    sphere: "contractor_deadline",
    negotiation_type: "distributive",
    tags: ["черновик"],
    status: "draft",
    created_at: "2026-09-24T16:45:00Z",
    created_by_name: "Громова Наталья Сергеевна",
    doc: SC4_DOC,
    versions: [],
    archived_at: null,
    copied_from: null,
    rehearsals: [],
    updated_at: "2026-09-24T16:45:00Z",
  },
];

// ---------------------------------------------------------------------------
// Шаблоны сценариев
// ---------------------------------------------------------------------------

export interface ScenarioTemplateFixture {
  id: string;
  title: string;
  description: string;
  sphere: Sphere;
  main_weights: Array<{ evidence: string; label: string; weight: number }>;
  doc: MockScenarioDoc;
}

export const TEMPLATES: ScenarioTemplateFixture[] = [
  {
    id: "tpl_procurement",
    title: "Закупка оборудования",
    description: "Распределительные переговоры с поставщиком: цена, сроки, предоплата.",
    sphere: "procurement",
    main_weights: DEFAULT_WEIGHTS.slice(0, 5).map((w) => ({ ...w })),
    doc: SC1_DOC,
  },
  {
    id: "tpl_promotion",
    title: "Разговор о повышении",
    description: "Внутренние переговоры с руководителем о грейде и зарплате.",
    sphere: "internal_promotion",
    main_weights: DEFAULT_WEIGHTS.slice(2, 7).map((w) => ({ ...w })),
    doc: SC2_DOC,
  },
  {
    id: "tpl_sales",
    title: "Продление контракта",
    description: "Удержание клиента: скидка против ценности сервиса.",
    sphere: "sales",
    main_weights: DEFAULT_WEIGHTS.slice(0, 4).map((w) => ({ ...w })),
    doc: SC3_DOC,
  },
];

// ---------------------------------------------------------------------------
// Профили тренажёра
// ---------------------------------------------------------------------------

export interface ProfileFixture {
  public: TrainerProfilePublic;
  admin: {
    openrouter_key_last4: string | null;
    model_server_token_last4: string | null;
    keys_changed_at?: string | null;
    keys_changed_by_name?: string | null;
    running_sessions?: number;
    same_key_profiles: string[];
  };
  openrouter_key: string | null;
  model_server_token: string | null;
}

const P1_SETTINGS: TrainerProfileSettings = {
  openrouter: { base_url: "https://api.provider.example/v1" },
  model_server: { base_url: "https://models.arena.local/v1" },
  primary_route: "openrouter",
  models: {
    opponent: { model: "qwen/qwen3-32b", own_server_model: "qwen3-32b-awq", context_window: 32768, max_tokens: 800 },
    participant_judge: { model: "qwen/qwen3-32b", context_window: 32768, max_tokens: 1200 },
    opponent_judge: { model: "qwen/qwen3-14b", context_window: 16384, max_tokens: 600 },
  },
  speech: {
    asr: { base_url: "https://asr.arena.local", model: "whisper-large-v3", voice: null },
    tts: { base_url: "https://tts.arena.local", model: "vits", voice: "dmitry" },
  },
  input_mode: "push_to_talk",
  camera: { enabled: true, emotion_labels_to_opponent: false },
  limits: { max_turns: 20, session_minutes: 15 },
  model_providers_note: "Основной маршрут — OpenRouter, резерв — собственный сервер.",
};

const P2_SETTINGS: TrainerProfileSettings = {
  openrouter: null,
  model_server: { base_url: "https://models.arena.local/v1" },
  primary_route: "own_server",
  models: {
    opponent: { model: "qwen/qwen3-32b", context_window: 32768, max_tokens: 800 },
    participant_judge: { model: "qwen/qwen3-32b", context_window: 32768, max_tokens: 1200 },
    opponent_judge: { model: "qwen/qwen3-14b", context_window: 16384, max_tokens: 600 },
  },
  speech: {
    asr: { base_url: "https://asr.arena.local", model: "whisper-large-v3", voice: null },
    tts: { base_url: "https://tts.arena.local", model: "vits", voice: "alena" },
  },
  input_mode: "open_mic",
  camera: { enabled: false, emotion_labels_to_opponent: false },
  limits: { max_turns: 16, session_minutes: 12 },
  model_providers_note: "Только собственный сервер, внешние сети не используются.",
};

export const PROFILES: ProfileFixture[] = [
  {
    public: {
      id: IDS.profiles.main,
      name: "Основной",
      is_default: true,
      revision: 3,
      settings: P1_SETTINGS,
      has_openrouter_key: true,
      has_model_server_token: true,
      archived_at: null,
      updated_at: "2026-09-18T08:00:00Z",
    },
    admin: {
      openrouter_key_last4: "7f3a",
      model_server_token_last4: "b2c9",
      keys_changed_at: "2026-09-18T08:00:00Z",
      keys_changed_by_name: "Ланской Виктор Павлович",
      running_sessions: 1,
      same_key_profiles: [],
    },
    openrouter_key: "sk-or-v1-mock-key-0123456789abcdef7f3a",
    model_server_token: "mst-mock-token-0123456789abcdefb2c9",
  },
  {
    public: {
      id: IDS.profiles.ownServer,
      name: "Только наш сервер",
      is_default: false,
      revision: 1,
      settings: P2_SETTINGS,
      has_openrouter_key: false,
      has_model_server_token: true,
      archived_at: null,
      updated_at: "2026-09-10T12:00:00Z",
    },
    admin: {
      openrouter_key_last4: null,
      model_server_token_last4: "e4d1",
      keys_changed_at: "2026-09-10T12:00:00Z",
      keys_changed_by_name: "Ланской Виктор Павлович",
      running_sessions: 0,
      same_key_profiles: [IDS.profiles.main],
    },
    openrouter_key: null,
    model_server_token: "mst-mock-token-0123456789abcdeee4d1",
  },
];

// ---------------------------------------------------------------------------
// Назначения (код доступа храним только в моке, наружу — один раз при создании)
// ---------------------------------------------------------------------------

export interface AssignmentFixture extends Omit<Assignment, "code"> {
  access_code: string;
  code_issued_at: string;
  code_failed_attempts: number;
  code_blocked_at: string | null;
}

const A = (partial: AssignmentFixture): AssignmentFixture => partial;

export const ASSIGNMENTS: AssignmentFixture[] = [
  // Тренировка, sc1, группа «Закупщики», до 10.10.2026
  A({
    id: id("400000000101"), access_code: "ARENA-2NKW-6TPC-8D4", code_issued_at: "2026-09-10T09:01:00Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000001"), number: "N-3Q7KD1", display_name: "Корнилова Анна Сергеевна", is_pseudonym: false },
    group_id: IDS.groups.zakup, scenario_id: IDS.scenarios.sc1, scenario_version_id: IDS.versions.sc1v1, version_number: 1,
    mode: "training", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-10T18:00:00Z", status: "not_started", scenario_title: "Редукторы к сроку",
    trainer_profile_name: "Основной", batch_id: id("410000000001"),
    created_at: "2026-09-10T09:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  A({
    id: id("400000000102"), access_code: "ARENA-M4VD-8KXR-3Q7", code_issued_at: "2026-09-10T09:01:00Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000002"), number: "N-8M4VX2", display_name: "Шайхутдинов Руслан Альбертович", is_pseudonym: false },
    group_id: IDS.groups.zakup, scenario_id: IDS.scenarios.sc1, scenario_version_id: IDS.versions.sc1v1, version_number: 1,
    mode: "training", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-10T18:00:00Z", status: "in_progress", scenario_title: "Редукторы к сроку",
    trainer_profile_name: "Основной", batch_id: id("410000000001"), last_attempt_at: "2026-09-26T08:10:00Z", attempts: 1,
    created_at: "2026-09-10T09:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  A({
    id: id("400000000103"), access_code: "ARENA-Q8MT-4VXS-6H2", code_issued_at: "2026-09-10T09:01:00Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000003"), number: "N-5T9NW3", display_name: "Ефимова Мария Дмитриевна", is_pseudonym: false },
    group_id: IDS.groups.zakup, scenario_id: IDS.scenarios.sc1, scenario_version_id: IDS.versions.sc1v1, version_number: 1,
    mode: "training", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-10T18:00:00Z", status: "passed", scenario_title: "Редукторы к сроку",
    trainer_profile_name: "Основной", batch_id: id("410000000001"), last_attempt_at: "2026-09-16T11:05:00Z", attempts: 1,
    created_at: "2026-09-10T09:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  A({
    id: id("400000000104"), access_code: "ARENA-6PXD-2WKN-9F5", code_issued_at: "2026-09-10T09:01:00Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000004"), number: "N-2P6HC4", display_name: "Гарипов Тимур Рашитович", is_pseudonym: false },
    group_id: IDS.groups.zakup, scenario_id: IDS.scenarios.sc1, scenario_version_id: IDS.versions.sc1v1, version_number: 1,
    mode: "training", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-10T18:00:00Z", status: "not_started", scenario_title: "Редукторы к сроку",
    trainer_profile_name: "Основной", batch_id: id("410000000001"),
    created_at: "2026-09-10T09:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  A({
    id: id("400000000105"), access_code: "ARENA-9FHW-5QDB-2V8", code_issued_at: "2026-09-10T09:01:00Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000005"), number: "N-7R2MZ5", display_name: "Закупщик-07", is_pseudonym: true },
    group_id: IDS.groups.zakup, scenario_id: IDS.scenarios.sc1, scenario_version_id: IDS.versions.sc1v1, version_number: 1,
    mode: "training", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-10T18:00:00Z", status: "not_started", scenario_title: "Редукторы к сроку",
    trainer_profile_name: "Основной", batch_id: id("410000000001"),
    created_at: "2026-09-10T09:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  // Оценка, sc1, группа «Закупщики», до 15.10.2026
  A({
    id: id("400000000001"), access_code: "ARENA-7K3Q-9DXM-2PA", code_issued_at: "2026-09-10T09:00:30Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000001"), number: "N-3Q7KD1", display_name: "Корнилова Анна Сергеевна", is_pseudonym: false },
    group_id: IDS.groups.zakup, scenario_id: IDS.scenarios.sc1, scenario_version_id: IDS.versions.sc1v1, version_number: 1,
    mode: "assessment", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-15T18:00:00Z", status: "passed", scenario_title: "Редукторы к сроку",
    trainer_profile_name: "Основной", batch_id: id("410000000002"), last_attempt_at: "2026-09-17T14:05:00Z", attempts: 2,
    created_at: "2026-09-10T09:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  A({
    id: id("400000000002"), access_code: "ARENA-3FVC-9KLD-2M8", code_issued_at: "2026-09-10T09:00:30Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000002"), number: "N-8M4VX2", display_name: "Шайхутдинов Руслан Альбертович", is_pseudonym: false },
    group_id: IDS.groups.zakup, scenario_id: IDS.scenarios.sc1, scenario_version_id: IDS.versions.sc1v1, version_number: 1,
    mode: "assessment", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-15T18:00:00Z", status: "passed", scenario_title: "Редукторы к сроку",
    trainer_profile_name: "Основной", batch_id: id("410000000002"), last_attempt_at: "2026-09-18T15:41:00Z", attempts: 1,
    created_at: "2026-09-10T09:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  A({
    id: id("400000000003"), access_code: "ARENA-8TXK-5MQP-4V6", code_issued_at: "2026-09-10T09:00:30Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000003"), number: "N-5T9NW3", display_name: "Ефимова Мария Дмитриевна", is_pseudonym: false },
    group_id: IDS.groups.zakup, scenario_id: IDS.scenarios.sc1, scenario_version_id: IDS.versions.sc1v1, version_number: 1,
    mode: "assessment", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-15T18:00:00Z", status: "not_started", scenario_title: "Редукторы к сроку",
    trainer_profile_name: "Основной", batch_id: id("410000000002"),
    created_at: "2026-09-10T09:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  A({
    id: id("400000000004"), access_code: "ARENA-5WNS-7DXR-1C3", code_issued_at: "2026-09-10T09:00:30Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000004"), number: "N-2P6HC4", display_name: "Гарипов Тимур Рашитович", is_pseudonym: false },
    group_id: IDS.groups.zakup, scenario_id: IDS.scenarios.sc1, scenario_version_id: IDS.versions.sc1v1, version_number: 1,
    mode: "assessment", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-15T18:00:00Z", status: "passed", scenario_title: "Редукторы к сроку",
    trainer_profile_name: "Основной", batch_id: id("410000000002"), last_attempt_at: "2026-09-19T09:52:00Z", attempts: 1,
    created_at: "2026-09-10T09:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  // Тренировка, sc3, группа «Менеджеры», до 05.10.2026
  A({
    id: id("400000000006"), access_code: "ARENA-4QXD-8FNT-6W5", code_issued_at: "2026-09-14T10:00:00Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000006"), number: "N-9D4KF6", display_name: "Орлова Елена Викторовна", is_pseudonym: false },
    group_id: IDS.groups.managers, scenario_id: IDS.scenarios.sc3, scenario_version_id: IDS.versions.sc3v1, version_number: 1,
    mode: "training", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-05T18:00:00Z", status: "passed", scenario_title: "Продление контракта с клиентом",
    trainer_profile_name: "Основной", batch_id: id("410000000003"), last_attempt_at: "2026-09-21T10:40:00Z", attempts: 1,
    created_at: "2026-09-14T10:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  A({
    id: id("400000000007"), access_code: "ARENA-7HMP-2KSV-9N4", code_issued_at: "2026-09-14T10:00:00Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000007"), number: "N-6H8QV7", display_name: "Валиев Артур Игоревич", is_pseudonym: false },
    group_id: IDS.groups.managers, scenario_id: IDS.scenarios.sc3, scenario_version_id: IDS.versions.sc3v1, version_number: 1,
    mode: "training", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-05T18:00:00Z", status: "passed", scenario_title: "Продление контракта с клиентом",
    trainer_profile_name: "Основной", batch_id: id("410000000003"), last_attempt_at: "2026-09-22T09:15:00Z", attempts: 1,
    created_at: "2026-09-14T10:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  A({
    id: id("400000000010"), access_code: "ARENA-2TWB-6QXL-3D9", code_issued_at: "2026-09-14T10:00:00Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000008"), number: "N-4K2WX8", display_name: "Хабибуллина Гузель Айратовна", is_pseudonym: false },
    group_id: IDS.groups.managers, scenario_id: IDS.scenarios.sc3, scenario_version_id: IDS.versions.sc3v1, version_number: 1,
    mode: "training", difficulty: "normal", trainer_profile_id: IDS.profiles.main,
    due_at: "2026-10-05T18:00:00Z", status: "not_started", scenario_title: "Продление контракта с клиентом",
    trainer_profile_name: "Основной", batch_id: id("410000000003"),
    created_at: "2026-09-14T10:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  // Тренировка, sc2, группа «Кадровый резерв 2026», до 20.09.2026
  A({
    id: id("400000000008"), access_code: "ARENA-6VKS-4GDM-7P1", code_issued_at: "2026-09-15T09:00:00Z", code_failed_attempts: 0, code_blocked_at: null,
    person: { subject_id: id("200000000010"), number: "N-8V3CS0", display_name: "Зуева Ольга Константиновна", is_pseudonym: false },
    group_id: IDS.groups.reserve, scenario_id: IDS.scenarios.sc2, scenario_version_id: IDS.versions.sc2v1, version_number: 1,
    mode: "training", difficulty: "normal", trainer_profile_id: IDS.profiles.ownServer,
    due_at: "2026-09-20T18:00:00Z", status: "abandoned", scenario_title: "Разговор о повышении",
    trainer_profile_name: "Только наш сервер", batch_id: id("410000000004"), last_attempt_at: "2026-09-21T14:00:00Z", attempts: 1,
    created_at: "2026-09-15T09:00:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
  // Тренировка, sc1, группа «Кадровый резерв 2026», код заблокирован
  A({
    id: id("400000000009"), access_code: "ARENA-8NXC-3THW-5R6", code_issued_at: "2026-09-15T09:05:00Z", code_failed_attempts: 10, code_blocked_at: "2026-09-22T10:00:00Z",
    person: { subject_id: id("200000000009"), number: "N-1Z5NM9", display_name: "Лужин Павел Станиславович", is_pseudonym: false },
    group_id: IDS.groups.reserve, scenario_id: IDS.scenarios.sc1, scenario_version_id: IDS.versions.sc1v1, version_number: 1,
    mode: "training", difficulty: "normal", trainer_profile_id: IDS.profiles.ownServer,
    due_at: "2026-10-01T18:00:00Z", status: "code_blocked", scenario_title: "Редукторы к сроку",
    trainer_profile_name: "Только наш сервер", batch_id: id("410000000005"),
    created_at: "2026-09-15T09:05:00Z", created_by_name: "Громова Наталья Сергеевна",
  }),
];

// ---------------------------------------------------------------------------
// Диалоги для транскриптов
// ---------------------------------------------------------------------------

export interface LineSpec {
  sp: "participant" | "opponent";
  text: string;
  stage: string;
  move_type?: string;
  markers?: Array<{ kind: string; label: string }>;
  facts?: string[];
  violation_kinds?: string[];
}

export const SC1_DIALOG: LineSpec[] = [
  { sp: "opponent", stage: "st_intro", move_type: "greeting", text: "Добрый день. Слушаю вас по редукторам." },
  { sp: "participant", stage: "st_intro", move_type: "statement", text: "Добрый день. Нам нужно 120 мотор-редукторов к 28 марта. Готовы обсудить цену и условия." },
  { sp: "opponent", stage: "st_bargain", move_type: "anchor", text: "При таких сроках — только полная предоплата и цена 25 400." },
  { sp: "participant", stage: "st_bargain", move_type: "criteria", markers: [{ kind: "episode", label: "Объективные критерии: предложение конкурента" }], text: "25 400 — это выше рынка. Предложение конкурента — 21 800 при тех же сроках." },
  { sp: "opponent", stage: "st_bargain", move_type: "refusal", text: "У конкурента нет склада в вашем регионе. 24 000 и не копейкой меньше." },
  { sp: "participant", stage: "st_trade", move_type: "proposal", markers: [{ kind: "concession", label: "Уступка: цена в обмен на аванс" }], text: "Давайте так: 19 800 при авансе 30 %, отгрузка 5 марта." },
  { sp: "opponent", stage: "st_trade", move_type: "objection", markers: [{ kind: "fact", label: "Раскрыт факт «Кассовый разрыв»" }], facts: ["fact_cash"], text: "Аванс 30 % не закроет мой кассовый разрыв. Нужна предоплата." },
  { sp: "participant", stage: "st_trade", move_type: "proposal", text: "Понимаю. Тогда предоплата 70 %, цена 19 200, отгрузка 6 марта." },
  { sp: "opponent", stage: "st_deal", move_type: "agreement", text: "Согласен. 19 200, предоплата 70 %, отгрузка 6 марта." },
];

export const SC3_DIALOG: LineSpec[] = [
  { sp: "opponent", stage: "st_intro", move_type: "statement", text: "Здравствуйте. По контракту № 118 через месяц окончание, хотим обсудить продление." },
  { sp: "participant", stage: "st_intro", move_type: "statement", text: "Здравствуйте. Готовы обсуждать, но при новом объёме текущая скидка 12 % нас не устраивает." },
  { sp: "opponent", stage: "st_intro", move_type: "threat", text: "Конкурент предлагает минус 10 %. У вас последний шанс удержать контракт." },
  { sp: "participant", stage: "st_value", move_type: "criteria", markers: [{ kind: "episode", label: "Объективные критерии: SLA" }], text: "Посмотрите на SLA: у нас 99,9 % за год. Стоимость простоя в разы выше скидки." },
  { sp: "opponent", stage: "st_value", move_type: "proposal", text: "Готовы остаться при скидке 8 % и двухлетнем контракте." },
  { sp: "participant", stage: "st_close", move_type: "proposal", markers: [{ kind: "concession", label: "Уступка: скидка 4 % за срок 2 года" }], text: "Скидка 4 % в обмен на два года и аванс за полугодие." },
  { sp: "opponent", stage: "st_close", move_type: "agreement", text: "Договорились. Готовим допсоглашение." },
];

export const SC2_DIALOG: LineSpec[] = [
  { sp: "opponent", stage: "st_intro", move_type: "statement", text: "Спасибо, что пришли. Расскажите, как видите ваше развитие." },
  { sp: "participant", stage: "st_args", move_type: "argument", text: "Год веду ключевой проект, закрыл план на 140 %. Прошу рассмотреть грейд и зарплату от 125 000 ₽." },
  { sp: "opponent", stage: "st_args", move_type: "refusal", text: "По фонду пока только индексация 7 %." },
  { sp: "participant", stage: "st_args", move_type: "criteria", text: "По рынку за такой профиль платят от 130 000 ₽ — есть данные исследований." },
];

// ---------------------------------------------------------------------------
// Сессии
// ---------------------------------------------------------------------------

export interface SessionFixture {
  session_id: string;
  person_id: string;
  group_id: string;
  assignment_id: string | null;
  header: SessionHeader;
  score_columns: ScoreColumns;
  flags: SessionFlags;
  marks: Mark[];
  final_condition_text: string | null;
  epilogue: string | null;
  summary: JudgeAnswerSummaryItem[];
  objections: ParticipantObjection[];
  decisions: Array<{ id: string; decision: string; decided_at: string; decided_by_name: string }>;
  simplified_replies: number[];
  review: Review | null;
  review_needed: boolean;
  opponent_violations: OpponentViolation[];
  scores: EngineObject | null;
  stages_reached: string[];
  facts_revealed: string[];
  dialog: LineSpec[];
  incidents: IncidentEvent[];
  profile_id: string;
  external_ai_allowed: boolean;
  break_stage: string | null;
}

const bands = (diagnosis: number, interests: number, criteria: number, alternative: number, discipline: number, conduct: number) =>
  ({ diagnosis, interests, criteria, alternative, discipline, conduct });

const S = (partial: SessionFixture) => partial;

export const SESSIONS: SessionFixture[] = [
  S({
    session_id: id("800000000001"),
    person_id: id("200000000001"),
    group_id: IDS.groups.zakup,
    assignment_id: id("400000000001"),
    header: {
      session_id: id("800000000001"), scenario_id: IDS.scenarios.sc1, scenario_title: "Редукторы к сроку", version_number: 1,
      fingerprint: "", difficulty: "normal", mode: "assessment", started_at: "2026-09-15T10:02:00Z", ended_at: "2026-09-15T10:19:00Z",
      duration_ms: 1020000, participant_turns: 5, status: "completed", scoring_profile: "normal", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: "S", final_id: "fin_s", final_title: "Эталонная закупка", result_number: 95, result_max: 100,
      process_status: "ok", process_number: 92, criteria_bands: bands(4, 4, 3, 4, 4, 4), lucky: false,
    },
    flags: { training: false, reviewed: true, lucky: false, has_objection: false, judge_attempts: 1 },
    marks: [],
    final_condition_text: "Цена 19 200 ₽, предоплата 70 %, отгрузка 6 марта",
    epilogue: "Поставщик уважает подготовку и предлагает долгосрочный контракт.",
    summary: [
      { kind: "strength", observation: "Сильная подготовка: раскрыты все скрытые факты", reply: 7, speaker: "participant", quote: "Судя по чертежу, ревизия другая — нужны переходники.", instead: "" },
      { kind: "strength", observation: "Уступка привязана к встречной", reply: 8, speaker: "participant", quote: "Предоплата 70 %, цена 19 200.", instead: "" },
      { kind: "miss", observation: "Можно было запросить отгрузку 5 марта", reply: 8, speaker: "participant", quote: "Отгрузка 6 марта.", instead: "Отгрузка 5 марта укладывалась бы в план производства." },
    ],
    objections: [],
    decisions: [{ id: id("500000000001"), decision: "Перевести на позицию ведущего специалиста по закупкам", decided_at: "2026-09-24T15:20:00Z", decided_by_name: "Громова Наталья Сергеевна" }],
    simplified_replies: [],
    review: { reviewed_at: "2026-09-16T09:10:00Z", reviewed_by_name: "Громова Наталья Сергеевна", reviewed_violation_count: 0 },
    review_needed: false,
    opponent_violations: [],
    scores: { result: { number: 95, max: 100 }, process: { number: 92 } },
    stages_reached: ["st_intro", "st_bargain", "st_trade", "st_deal"],
    facts_revealed: ["fact_rev", "fact_cash"],
    dialog: SC1_DIALOG,
    incidents: [],
    profile_id: IDS.profiles.main,
    external_ai_allowed: true,
    break_stage: null,
  }),
  S({
    session_id: id("800000000002"),
    person_id: id("200000000001"),
    group_id: IDS.groups.zakup,
    assignment_id: id("400000000001"),
    header: {
      session_id: id("800000000002"), scenario_id: IDS.scenarios.sc1, scenario_title: "Редукторы к сроку", version_number: 1,
      fingerprint: "", difficulty: "normal", mode: "assessment", started_at: "2026-09-17T13:48:00Z", ended_at: "2026-09-17T14:05:00Z",
      duration_ms: 1000000, participant_turns: 5, status: "completed", scoring_profile: "normal", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: "A", final_id: "fin_a", final_title: "Хорошая сделка", result_number: 88, result_max: 100,
      process_status: "ok", process_number: 84, criteria_bands: bands(3, 4, 3, 3, 4, 4), lucky: true,
    },
    flags: { training: false, reviewed: false, lucky: true, has_objection: false, judge_attempts: 1 },
    marks: [{ kind: "lucky", text: "Повезло: оппонент сам предложил условия лучше предела" }],
    final_condition_text: "Цена 20 300 ₽, предоплата 75 %, отгрузка 7 марта",
    epilogue: "Условия в пределах полномочий, запасной вариант не понадобился.",
    summary: [
      { kind: "strength", observation: "Уверенный торг по цене", reply: 6, speaker: "participant", quote: "19 800 при авансе 30 %.", instead: "" },
      { kind: "miss", observation: "Факт о ревизии не раскрыт", reply: 8, speaker: "participant", quote: "Отгрузка 7 марта устраивает.", instead: "Стоило спросить про чертёж и фланец." },
    ],
    objections: [],
    decisions: [],
    simplified_replies: [],
    review: null,
    review_needed: false,
    opponent_violations: [],
    scores: { result: { number: 88, max: 100 }, process: { number: 84 } },
    stages_reached: ["st_intro", "st_bargain", "st_trade", "st_deal"],
    facts_revealed: ["fact_cash"],
    dialog: SC1_DIALOG,
    incidents: [],
    profile_id: IDS.profiles.main,
    external_ai_allowed: true,
    break_stage: null,
  }),
  S({
    session_id: id("800000000003"),
    person_id: id("200000000002"),
    group_id: IDS.groups.zakup,
    assignment_id: id("400000000002"),
    header: {
      session_id: id("800000000003"), scenario_id: IDS.scenarios.sc1, scenario_title: "Редукторы к сроку", version_number: 1,
      fingerprint: "", difficulty: "normal", mode: "assessment", started_at: "2026-09-18T15:22:00Z", ended_at: "2026-09-18T15:41:00Z",
      duration_ms: 1140000, participant_turns: 5, status: "completed", scoring_profile: "normal", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: "B", final_id: "fin_b", final_title: "Хорошая цена, но фланец не тот", result_number: 74, result_max: 100,
      process_status: "ok", process_number: 68, criteria_bands: bands(3, 3, 2, 2, 3, 3), lucky: false,
    },
    flags: { training: false, reviewed: false, lucky: false, has_objection: true, judge_attempts: 1 },
    marks: [],
    final_condition_text: "Цена 19 600 ₽, предоплата 70 %, отгрузка 6 марта",
    epilogue: "Экономия омрачена переделкой переходников под фланец.",
    summary: [
      { kind: "strength", observation: "Запросил встречную уступку за предоплату", reply: 8, speaker: "participant", quote: "Предоплата 70 % — тогда 19 200.", instead: "" },
      { kind: "miss", observation: "Не проверил ревизию перед сделкой", reply: 9, speaker: "participant", quote: "Согласен на 19 600.", instead: "Вопрос про чертёж и фланец снял бы риск переделки." },
    ],
    objections: [
      {
        id: id("900000000001"),
        text: "Не согласен с оценкой по критерию «Дисциплина уступок»: я дважды запрашивал встречные уступки за каждое снижение цены.",
        target: { kind: "criterion", criterion: "discipline" },
        submitted_at: "2026-09-19T12:00:00Z",
        response: null,
      },
    ],
    decisions: [],
    simplified_replies: [],
    review: null,
    review_needed: false,
    opponent_violations: [],
    scores: { result: { number: 74, max: 100 }, process: { number: 68 } },
    stages_reached: ["st_intro", "st_bargain", "st_trade", "st_deal"],
    facts_revealed: ["fact_cash"],
    dialog: SC1_DIALOG,
    incidents: [],
    profile_id: IDS.profiles.main,
    external_ai_allowed: true,
    break_stage: null,
  }),
  S({
    session_id: id("800000000004"),
    person_id: id("200000000003"),
    group_id: IDS.groups.zakup,
    assignment_id: id("400000000103"),
    header: {
      session_id: id("800000000004"), scenario_id: IDS.scenarios.sc1, scenario_title: "Редукторы к сроку", version_number: 1,
      fingerprint: "", difficulty: "easy", mode: "training", started_at: "2026-09-16T11:05:00Z", ended_at: "2026-09-16T11:21:00Z",
      duration_ms: 960000, participant_turns: 5, status: "completed", scoring_profile: "normal", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: "A", final_id: "fin_a", final_title: "Хорошая сделка", result_number: 86, result_max: 100,
      process_status: "ok", process_number: 81, criteria_bands: bands(4, 3, 3, 3, 4, 4), lucky: false,
    },
    flags: { training: true, reviewed: false, lucky: false, has_objection: false, judge_attempts: 1 },
    marks: [],
    final_condition_text: "Цена 20 100 ₽, аванс 30 %, отгрузка 7 марта",
    epilogue: "Условия в пределах полномочий.",
    summary: [
      { kind: "strength", observation: "Хорошее выяснение интересов", reply: 7, speaker: "participant", quote: "Что для вас важнее — сроки или предоплата?", instead: "" },
      { kind: "miss", observation: "Не использован запасной вариант", reply: 6, speaker: "participant", quote: "Тогда 19 800 при авансе 30 %.", instead: "Можно было удержать цену, сославшись на предложение конкурента." },
    ],
    objections: [],
    decisions: [],
    simplified_replies: [],
    review: null,
    review_needed: false,
    opponent_violations: [],
    scores: { result: { number: 86, max: 100 }, process: { number: 81 } },
    stages_reached: ["st_intro", "st_bargain", "st_trade", "st_deal"],
    facts_revealed: ["fact_cash"],
    dialog: SC1_DIALOG,
    incidents: [],
    profile_id: IDS.profiles.main,
    external_ai_allowed: true,
    break_stage: null,
  }),
  S({
    session_id: id("800000000005"),
    person_id: id("200000000004"),
    group_id: IDS.groups.zakup,
    assignment_id: id("400000000004"),
    header: {
      session_id: id("800000000005"), scenario_id: IDS.scenarios.sc1, scenario_title: "Редукторы к сроку", version_number: 1,
      fingerprint: "", difficulty: "normal", mode: "assessment", started_at: "2026-09-19T09:35:00Z", ended_at: "2026-09-19T09:52:00Z",
      duration_ms: 1010000, participant_turns: 5, status: "completed", scoring_profile: "normal", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: "C", final_id: "fin_c", final_title: "В рамках полномочий", result_number: 61, result_max: 100,
      process_status: "ok", process_number: 55, criteria_bands: bands(2, 2, 2, 2, 3, 3), lucky: false,
    },
    flags: { training: false, reviewed: false, lucky: false, has_objection: false, opponent_violation_count: 2, judge_attempts: 1 },
    marks: [{ kind: "opponent_violations", text: "2 нарушения оппонента", replies: [4, 7] }],
    final_condition_text: "Цена 20 700 ₽, предоплата 80 %, отгрузка 8 марта",
    epilogue: "Сделка состоялась, потенциал размена не использован.",
    summary: [
      { kind: "miss", observation: "Не выяснил интересы оппонента", reply: 6, speaker: "participant", quote: "Отгрузка 8 марта подойдёт.", instead: "Вопрос про причину спешки открыл бы размен предоплатой." },
      { kind: "miss", observation: "Уступка без встречного условия", reply: 8, speaker: "participant", quote: "Хорошо, 20 700.", instead: "Каждая уступка должна оплачиваться встречной." },
    ],
    objections: [],
    decisions: [],
    simplified_replies: [],
    review: null,
    review_needed: true,
    opponent_violations: [
      { reply_no: 4, kinds: ["beyond_limit"], comment: "Озвучил цену 24 000 ниже заявленного старта 25 400 без объяснений", correction_reply_no: 5 },
      { reply_no: 7, kinds: ["early_fact"], comment: "Раскрыл кассовый разрыв без вопроса участника", correction_reply_no: null },
    ],
    scores: { result: { number: 61, max: 100 }, process: { number: 55 } },
    stages_reached: ["st_intro", "st_bargain", "st_trade", "st_deal"],
    facts_revealed: ["fact_cash"],
    dialog: SC1_DIALOG,
    incidents: [],
    profile_id: IDS.profiles.main,
    external_ai_allowed: true,
    break_stage: null,
  }),
  S({
    session_id: id("800000000006"),
    person_id: id("200000000005"),
    group_id: IDS.groups.zakup,
    assignment_id: id("400000000105"),
    header: {
      session_id: id("800000000006"), scenario_id: IDS.scenarios.sc1, scenario_title: "Редукторы к сроку", version_number: 1,
      fingerprint: "", difficulty: "easy", mode: "training", started_at: "2026-09-20T13:10:00Z", ended_at: "2026-09-20T13:13:00Z",
      duration_ms: 180000, participant_turns: 1, status: "ended_by_participant", scoring_profile: "short", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: null, final_id: null, final_title: null, result_number: null, result_max: 100,
      process_status: "too_short", process_number: null, criteria_bands: null, lucky: false,
    },
    flags: { training: true, simplified: true, reviewed: false, lucky: false, has_objection: false, judge_attempts: 0 },
    marks: [
      { kind: "simplified", text: "Упрощённый разбор по ключевым словам", replies: [2] },
      { kind: "too_short", text: "Меньше 3 реплик участника" },
      { kind: "ended_by_participant", text: "Завершена участником" },
    ],
    final_condition_text: null,
    epilogue: null,
    summary: [],
    objections: [],
    decisions: [],
    simplified_replies: [2],
    review: null,
    review_needed: false,
    opponent_violations: [],
    scores: null,
    stages_reached: ["st_intro"],
    facts_revealed: [],
    dialog: SC1_DIALOG.slice(0, 3),
    incidents: [],
    profile_id: IDS.profiles.main,
    external_ai_allowed: true,
    break_stage: null,
  }),
  S({
    session_id: id("800000000007"),
    person_id: id("200000000006"),
    group_id: IDS.groups.managers,
    assignment_id: id("400000000006"),
    header: {
      session_id: id("800000000007"), scenario_id: IDS.scenarios.sc3, scenario_title: "Продление контракта с клиентом", version_number: 1,
      fingerprint: "", difficulty: "normal", mode: "training", started_at: "2026-09-21T10:40:00Z", ended_at: "2026-09-21T10:58:00Z",
      duration_ms: 1080000, participant_turns: 4, status: "completed", scoring_profile: "normal", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: "B", final_id: "fin_b", final_title: "Контракт на 1 год с опцией", result_number: 76, result_max: 100,
      process_status: "ok", process_number: 74, criteria_bands: bands(3, 3, 3, 3, 3, 3), lucky: false,
    },
    flags: { training: true, reviewed: false, lucky: false, has_objection: false, judge_attempts: 1 },
    marks: [],
    final_condition_text: "Скидка 6 %, контракт на 1 год с опцией продления",
    epilogue: "Год продления с правом пересмотра.",
    summary: [
      { kind: "strength", observation: "Перевёл разговор от скидки к ценности", reply: 4, speaker: "participant", quote: "Стоимость простоя в разы выше скидки.", instead: "" },
      { kind: "miss", observation: "Не раскрыл факт о провале SLA конкурента", reply: 4, speaker: "participant", quote: "У нас 99,9 % за год.", instead: "Стоило упомянуть инциденты конкурента." },
    ],
    objections: [],
    decisions: [],
    simplified_replies: [],
    review: null,
    review_needed: false,
    opponent_violations: [],
    scores: { result: { number: 76, max: 100 }, process: { number: 74 } },
    stages_reached: ["st_intro", "st_value", "st_close"],
    facts_revealed: [],
    dialog: SC3_DIALOG,
    incidents: [],
    profile_id: IDS.profiles.main,
    external_ai_allowed: true,
    break_stage: null,
  }),
  S({
    session_id: id("800000000008"),
    person_id: id("200000000007"),
    group_id: IDS.groups.managers,
    assignment_id: id("400000000007"),
    header: {
      session_id: id("800000000008"), scenario_id: IDS.scenarios.sc3, scenario_title: "Продление контракта с клиентом", version_number: 1,
      fingerprint: "", difficulty: "normal", mode: "training", started_at: "2026-09-22T09:15:00Z", ended_at: "2026-09-22T09:31:00Z",
      duration_ms: 960000, participant_turns: 4, status: "completed", scoring_profile: "normal", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: "D", final_id: "fin_d", final_title: "Контракт не продлён", result_number: 40, result_max: 100,
      process_status: "ok", process_number: 41, criteria_bands: bands(1, 2, 1, 1, 2, 2), lucky: true,
    },
    flags: { training: true, reviewed: false, lucky: true, has_objection: true, judge_attempts: 1 },
    marks: [{ kind: "lucky", text: "Повезло: клиент сам предложил отложить решение, а не разорвать контракт" }],
    final_condition_text: null,
    epilogue: "Клиент уходит к конкуренту.",
    summary: [
      { kind: "miss", observation: "Пошёл на уступки под давлением", reply: 5, speaker: "participant", quote: "Готовы остаться при скидке 8 %.", instead: "Нельзя отвечать уступкой на угрозу." },
      { kind: "miss", observation: "Не выяснил условия конкурента", reply: 3, speaker: "participant", quote: "Понимаю ваши сомнения.", instead: "Стоило спросить детали предложения конкурента." },
    ],
    objections: [
      {
        id: id("900000000002"),
        text: "Оппонент озвучил цену ниже заявленного предела — из-за этого сделка выглядит хуже, чем была на самом деле.",
        target: { kind: "result" },
        submitted_at: "2026-09-21T12:30:00Z",
        response: { text: "Нарушение зафиксировано, оценка результата скорректирована.", responded_at: "2026-09-22T09:00:00Z" },
      },
    ],
    decisions: [],
    simplified_replies: [],
    review: null,
    review_needed: false,
    opponent_violations: [],
    scores: { result: { number: 40, max: 100 }, process: { number: 41 } },
    stages_reached: ["st_intro", "st_value", "st_close"],
    facts_revealed: [],
    dialog: SC3_DIALOG,
    incidents: [],
    profile_id: IDS.profiles.main,
    external_ai_allowed: true,
    break_stage: null,
  }),
  S({
    session_id: id("800000000009"),
    person_id: id("200000000008"),
    group_id: IDS.groups.managers,
    assignment_id: null,
    header: {
      session_id: id("800000000009"), scenario_id: IDS.scenarios.sc1, scenario_title: "Редукторы к сроку", version_number: 1,
      fingerprint: "", difficulty: "hard", mode: "training", started_at: "2026-09-19T17:25:00Z", ended_at: "2026-09-19T17:47:00Z",
      duration_ms: 1320000, participant_turns: 5, status: "completed", scoring_profile: "normal", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: "B", final_id: "fin_b", final_title: "Хорошая цена, но фланец не тот", result_number: 78, result_max: 100,
      process_status: "ok", process_number: 83, criteria_bands: bands(3, 4, 3, 3, 3, 4), lucky: false,
    },
    flags: { training: true, reviewed: false, lucky: false, has_objection: false, judge_attempts: 1 },
    marks: [],
    final_condition_text: "Цена 19 800 ₽, предоплата 75 %, отгрузка 7 марта",
    epilogue: "Экономия омрачена переделкой переходников под фланец.",
    summary: [
      { kind: "strength", observation: "Отличная работа с давлением", reply: 5, speaker: "participant", quote: "Давайте вернёмся к условиям отгрузки.", instead: "" },
      { kind: "miss", observation: "Забыл уточнить ревизию", reply: 8, speaker: "participant", quote: "Договорились.", instead: "Вопрос про чертёж снял бы риск." },
    ],
    objections: [],
    decisions: [],
    simplified_replies: [],
    review: null,
    review_needed: false,
    opponent_violations: [],
    scores: { result: { number: 78, max: 100 }, process: { number: 83 } },
    stages_reached: ["st_intro", "st_bargain", "st_trade", "st_deal"],
    facts_revealed: ["fact_cash", "fact_tolyatti"],
    dialog: SC1_DIALOG,
    incidents: [],
    profile_id: IDS.profiles.ownServer,
    external_ai_allowed: false,
    break_stage: null,
  }),
  S({
    session_id: id("800000000010"),
    person_id: id("200000000009"),
    group_id: IDS.groups.reserve,
    assignment_id: null,
    header: {
      session_id: id("800000000010"), scenario_id: IDS.scenarios.sc1, scenario_title: "Редукторы к сроку", version_number: 1,
      fingerprint: "", difficulty: "normal", mode: "training", started_at: "2026-09-20T15:30:00Z", ended_at: "2026-09-20T15:45:00Z",
      duration_ms: 900000, participant_turns: 4, status: "turn_limit", scoring_profile: "normal", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: "B", final_id: "fin_b", final_title: "Хорошая цена, но фланец не тот", result_number: 72, result_max: 100,
      process_status: "ok", process_number: 49, criteria_bands: bands(3, 2, 2, 2, 2, 3), lucky: false,
    },
    flags: { training: true, reviewed: false, lucky: false, has_objection: false, judge_attempts: 1 },
    marks: [{ kind: "turn_limit", text: "Закончились ходы (лимит 20)" }],
    final_condition_text: "Цена 20 400 ₽, предоплата 100 %",
    epilogue: null,
    summary: [
      { kind: "miss", observation: "Зациклился на цене, не ушёл в размен", reply: 9, speaker: "participant", quote: "Тогда 20 400.", instead: "Размен предоплатой закрыл бы сделку быстрее." },
    ],
    objections: [],
    decisions: [],
    simplified_replies: [],
    review: null,
    review_needed: false,
    opponent_violations: [],
    scores: { result: { number: 72, max: 100 }, process: { number: 49 } },
    stages_reached: ["st_intro", "st_bargain", "st_stuck"],
    facts_revealed: [],
    dialog: SC1_DIALOG.slice(0, 7),
    incidents: [],
    profile_id: IDS.profiles.ownServer,
    external_ai_allowed: false,
    break_stage: "st_stuck",
  }),
  S({
    session_id: id("800000000011"),
    person_id: id("200000000010"),
    group_id: IDS.groups.reserve,
    assignment_id: id("400000000008"),
    header: {
      session_id: id("800000000011"), scenario_id: IDS.scenarios.sc2, scenario_title: "Разговор о повышении", version_number: 1,
      fingerprint: "", difficulty: "normal", mode: "training", started_at: "2026-09-21T14:00:00Z", ended_at: null,
      duration_ms: null, participant_turns: 2, status: "abandoned", scoring_profile: "normal", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: null, final_id: null, final_title: null, result_number: null, result_max: 100,
      process_status: "not_scored", process_number: null, criteria_bands: null, lucky: false,
    },
    flags: { training: true, reviewed: false, lucky: false, has_objection: false, judge_attempts: 0 },
    marks: [
      { kind: "abandoned", text: "Закрыта сервером: нет событий 10 минут" },
      { kind: "process_not_received", text: "Оценка процесса не получена" },
    ],
    final_condition_text: null,
    epilogue: null,
    summary: [],
    objections: [],
    decisions: [],
    simplified_replies: [],
    review: null,
    review_needed: false,
    opponent_violations: [],
    scores: null,
    stages_reached: ["st_intro", "st_args"],
    facts_revealed: [],
    dialog: SC2_DIALOG,
    incidents: [
      { type: "incident", event_id: id("880000000001"), component: "portal_link", at_ms: 300000, route_to: null, detail: "Нет событий больше 10 минут — сессия закрыта сервером." },
    ],
    profile_id: IDS.profiles.ownServer,
    external_ai_allowed: false,
    break_stage: null,
  }),
  S({
    session_id: id("800000000012"),
    person_id: id("200000000002"),
    group_id: IDS.groups.zakup,
    assignment_id: id("400000000102"),
    header: {
      session_id: id("800000000012"), scenario_id: IDS.scenarios.sc1, scenario_title: "Редукторы к сроку", version_number: 1,
      fingerprint: "", difficulty: "hard", mode: "training", started_at: "2026-09-26T08:10:00Z", ended_at: null,
      duration_ms: null, participant_turns: 3, status: "in_progress", scoring_profile: "normal", criteria_set: "harvard_spin_v1", is_demo: false,
    },
    score_columns: {
      result_rank: null, final_id: null, final_title: null, result_number: null, result_max: 100,
      process_status: "pending", process_number: null, criteria_bands: null, lucky: false,
    },
    flags: { training: true, reviewed: false, lucky: false, has_objection: false, judge_attempts: 0 },
    marks: [],
    final_condition_text: null,
    epilogue: null,
    summary: [],
    objections: [],
    decisions: [],
    simplified_replies: [],
    review: null,
    review_needed: false,
    opponent_violations: [],
    scores: null,
    stages_reached: ["st_intro", "st_bargain"],
    facts_revealed: [],
    dialog: SC1_DIALOG.slice(0, 5),
    incidents: [],
    profile_id: IDS.profiles.main,
    external_ai_allowed: true,
    break_stage: null,
  }),
];

// ---------------------------------------------------------------------------
// Кадровые решения
// ---------------------------------------------------------------------------

export const DECISIONS: Decision[] = [
  {
    id: id("500000000001"),
    subject_id: id("200000000001"),
    decision: "Перевести на позицию ведущего специалиста по закупкам",
    grounds: "Две оценочные сессии в равных условиях: S (95/92) и A (88/84). Устойчиво высокие полосы по критериям «Интересы и размен» и «Поведение», раскрывает скрытые факты, уступки привязаны к встречным условиям.",
    decided_at: "2026-09-24T15:20:00Z",
    decided_by_name: "Громова Наталья Сергеевна",
    session_ids: [id("800000000001")],
    person: { subject_id: id("200000000001"), number: "N-3Q7KD1", display_name: "Корнилова Анна Сергеевна", is_pseudonym: false },
    supersedes_id: null,
    superseded_by_id: null,
    objections: [],
  },
];

// ---------------------------------------------------------------------------
// Настройки портала и журнал
// ---------------------------------------------------------------------------

export const SETTINGS_SEED = {
  demo_mode: true,
  admission_rehearsals: 3,
  abandon_timeout_minutes: 10,
  code_max_failed_attempts: 10,
  updated_at: "2026-09-20T09:00:00Z",
  updated_by_name: "Ланской Виктор Павлович",
};

export const AUDIT_SEED: Array<{
  occurred_at: string;
  actor_kind: "user" | "participant" | "system";
  actor_user_id?: string | null;
  actor_name?: string | null;
  action: import("../api/types").AuditAction;
  outcome: "ok" | "denied";
  subject_number?: string | null;
  session_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  rows_count?: number | null;
  details?: EngineObject | null;
}> = [
  { occurred_at: "2026-09-01T09:30:00Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "scenario_published", outcome: "ok", group_id: null, group_name: null, details: { scenario_id: IDS.scenarios.sc1, version: 1 } },
  { occurred_at: "2026-09-02T09:05:00Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "written_consent_recorded", outcome: "ok", subject_number: "N-3Q7KD1", group_id: IDS.groups.zakup, group_name: "Закупщики" },
  { occurred_at: "2026-09-10T09:00:00Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "assignment_created", outcome: "ok", subject_number: null, group_id: IDS.groups.zakup, group_name: "Закупщики", details: { batch_id: id("410000000002"), count: 4 } },
  { occurred_at: "2026-09-10T09:00:30Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "code_issued", outcome: "ok", subject_number: "N-3Q7KD1", group_id: IDS.groups.zakup, group_name: "Закупщики" },
  { occurred_at: "2026-09-12T11:20:00Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "scenario_published", outcome: "ok", details: { scenario_id: IDS.scenarios.sc2, version: 1 } },
  { occurred_at: "2026-09-15T10:05:00Z", actor_kind: "participant", actor_name: "Корнилова Анна Сергеевна", action: "session_opened", outcome: "ok", subject_number: "N-3Q7KD1", session_id: id("800000000001"), group_id: IDS.groups.zakup, group_name: "Закупщики" },
  { occurred_at: "2026-09-16T09:10:00Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "session_reviewed", outcome: "ok", session_id: id("800000000001"), group_id: IDS.groups.zakup, group_name: "Закупщики" },
  { occurred_at: "2026-09-17T14:22:00Z", actor_kind: "participant", actor_name: "Корнилова Анна Сергеевна", action: "session_opened", outcome: "ok", subject_number: "N-3Q7KD1", session_id: id("800000000002"), group_id: IDS.groups.zakup, group_name: "Закупщики" },
  { occurred_at: "2026-09-18T08:00:00Z", actor_kind: "user", actor_user_id: id("000000000002"), actor_name: "Ланской Виктор Павлович", action: "profile_key_changed", outcome: "ok", details: { profile_id: IDS.profiles.main } },
  { occurred_at: "2026-09-18T15:25:00Z", actor_kind: "participant", actor_name: "Шайхутдинов Руслан Альбертович", action: "session_opened", outcome: "ok", subject_number: "N-8M4VX2", session_id: id("800000000003"), group_id: IDS.groups.zakup, group_name: "Закупщики" },
  { occurred_at: "2026-09-19T12:00:00Z", actor_kind: "participant", actor_name: "Шайхутдинов Руслан Альбертович", action: "objection_submitted", outcome: "ok", subject_number: "N-8M4VX2", session_id: id("800000000003"), group_id: IDS.groups.zakup, group_name: "Закупщики" },
  { occurred_at: "2026-09-19T09:40:00Z", actor_kind: "participant", actor_name: "Гарипов Тимур Рашитович", action: "session_opened", outcome: "ok", subject_number: "N-2P6HC4", session_id: id("800000000005"), group_id: IDS.groups.zakup, group_name: "Закупщики" },
  { occurred_at: "2026-09-20T09:10:00Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "scenario_published", outcome: "ok", details: { scenario_id: IDS.scenarios.sc3, version: 1 } },
  { occurred_at: "2026-09-20T09:00:30Z", actor_kind: "user", actor_user_id: id("000000000002"), actor_name: "Ланской Виктор Павлович", action: "settings_changed", outcome: "ok", details: { admission_rehearsals: 3 } },
  { occurred_at: "2026-09-20T13:15:00Z", actor_kind: "participant", actor_name: "Закупщик-07", action: "session_opened", outcome: "ok", subject_number: "N-7R2MZ5", session_id: id("800000000006"), group_id: IDS.groups.zakup, group_name: "Закупщики" },
  { occurred_at: "2026-09-21T12:30:00Z", actor_kind: "participant", actor_name: "Валиев Артур Игоревич", action: "objection_submitted", outcome: "ok", subject_number: "N-6H8QV7", session_id: id("800000000008"), group_id: IDS.groups.managers, group_name: "Менеджеры" },
  { occurred_at: "2026-09-22T09:00:00Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "objection_answered", outcome: "ok", subject_number: "N-6H8QV7", session_id: id("800000000008"), group_id: IDS.groups.managers, group_name: "Менеджеры" },
  { occurred_at: "2026-09-22T13:02:00Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "session_reduced_opened", outcome: "ok", session_id: id("600000000001"), group_id: IDS.groups.zakup, group_name: "Закупщики" },
  { occurred_at: "2026-09-23T11:15:00Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "export_created", outcome: "ok", group_id: IDS.groups.zakup, group_name: "Закупщики", rows_count: 12 },
  { occurred_at: "2026-09-24T15:20:00Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "decision_recorded", outcome: "ok", subject_number: "N-3Q7KD1", session_id: id("800000000001"), group_id: IDS.groups.zakup, group_name: "Закупщики" },
  { occurred_at: "2026-09-25T09:45:00Z", actor_kind: "user", actor_user_id: id("000000000002"), actor_name: "Ланской Виктор Павлович", action: "login", outcome: "ok" },
  { occurred_at: "2026-09-25T16:40:00Z", actor_kind: "user", actor_user_id: id("000000000001"), actor_name: "Громова Наталья Сергеевна", action: "login", outcome: "ok" },
];

// ---------------------------------------------------------------------------
// Каркасы для создания сценариев
// ---------------------------------------------------------------------------

export function skeletonDoc(mode: Mode, sphere: Sphere, title: string): MockScenarioDoc {
  return {
    passport: { id: `${slugifyLocal(title)}-${new Date().getFullYear()}`, version: 1, title, mode, sphere, negotiation_type: "distributive" },
    brief: { situation: "", participant_role: "", participant_goals: [] },
    opponent: { card: { name: "", character: "", goals: [], never: [] }, brief: {} },
    issues: [
      { id: "iss_1", label: "Главный пункт", kind: "scale", dir: "down", min: 0, max: 100, start: 50, opponent: { start: 80, limit: 40, target: 30 }, participant: { target: 35, limit: 60 }, hidden: false },
    ],
    state: { trust: 50, patience: 50, pressure: 25, credit: 0 },
    facts: [{ id: "fact_1", label: "Скрытый факт", text: "", hidden: true, ask: [] }],
    stages: [
      { id: "st_start", title: "Начало", transitions: [{ type: "after", turns: 2, to: "st_deal" }] },
      { id: "st_deal", title: "Сделка" },
    ],
    finals: [
      { id: "fin_a", title: "Хорошая сделка", rank: "A", stage: "st_deal", condition: "", epilogue: "" },
      { id: "fin_b", title: "Сделка с натяжкой", rank: "B", stage: "st_deal", condition: "", epilogue: "" },
      { id: "fin_c", title: "Слабая сделка", rank: "C", stage: "st_deal", condition: "", epilogue: "" },
      { id: "fin_d", title: "Сделки нет", rank: "D", stage: "st_deal", condition: "", epilogue: "" },
    ],
    difficulty: {
      easy: { start_values: {}, opponent_limits: {}, note: null },
      normal: { start_values: {}, opponent_limits: {}, note: null },
      hard: { start_values: {}, opponent_limits: {}, note: null },
    },
    evidence_weights: DEFAULT_WEIGHTS.map((w) => ({ ...w })),
    custom_moves: [],
    move_effects: [],
  };
}

function slugifyLocal(title: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return (
    title.toLowerCase().split("").map((ch) => map[ch] ?? ch).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "scenario"
  );
}

export function asScenarioDocument(doc: MockScenarioDoc): ScenarioDocument {
  return doc as unknown as ScenarioDocument;
}

export const FINAL_RANK_ORDER: Array<FinalRank | null> = ["S", "A", "B", "C", "D", "F", null];
