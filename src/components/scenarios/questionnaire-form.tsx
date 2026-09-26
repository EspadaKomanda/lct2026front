"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createScenario } from "@/lib/api/modules/scenarios";
import type {
  Difficulty,
  Mode,
  NegotiationType,
  Questionnaire,
  Sphere,
} from "@/lib/api/types";
import {
  DIFFICULTY_LABEL,
  NEGOTIATION_TYPE_LABEL,
  SPHERE_LABEL,
} from "@/lib/labels";
import { Icon } from "@/components/icons";
import {
  Button,
  Card,
  Input,
  SegmentControl,
  Select,
  SelectOption,
  Textarea,
  useToast,
} from "@/components/ui";
import { useRun } from "./use-run";

const REQUIRED = "Заполните — без этого сценарий не собрать";

const SPHERE_OPTIONS: SelectOption[] = (Object.keys(SPHERE_LABEL) as Sphere[]).map((v) => ({
  value: v,
  label: SPHERE_LABEL[v],
}));

const TYPE_OPTIONS: SelectOption[] = (
  Object.keys(NEGOTIATION_TYPE_LABEL) as NegotiationType[]
).map((v) => ({ value: v, label: NEGOTIATION_TYPE_LABEL[v] }));

const DIFFICULTY_OPTIONS = (
  Object.keys(DIFFICULTY_LABEL) as Difficulty[]
).map((v) => ({ value: v, label: DIFFICULTY_LABEL[v] }));

export function QuestionnaireForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const toast = useToast();
  const createRun = useRun(createScenario);

  const [sphere, setSphere] = useState<Sphere | "">("");
  const [topic, setTopic] = useState("");
  const [participantRole, setParticipantRole] = useState("");
  const [opponentRole, setOpponentRole] = useState("");
  const [opponentCharacter, setOpponentCharacter] = useState("");
  const [negotiationType, setNegotiationType] = useState<NegotiationType | "">("");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [timeLimit, setTimeLimit] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<{ sphere?: string; topic?: string }>({});

  const submit = async () => {
    const next: typeof errors = {};
    if (!sphere) next.sphere = REQUIRED;
    if (!topic.trim()) next.topic = REQUIRED;
    setErrors(next);
    if (next.sphere || next.topic) return;

    const minutes = Number(timeLimit);
    const questionnaire: Questionnaire = {
      sphere: sphere as Sphere,
      topic: topic.trim(),
      participant_role: participantRole.trim() || undefined,
      opponent_role: opponentRole.trim() || undefined,
      opponent_character: opponentCharacter.trim() || undefined,
      negotiation_type: negotiationType || undefined,
      difficulty,
      time_limit_minutes:
        timeLimit.trim() !== "" && Number.isFinite(minutes) && minutes >= 3 && minutes <= 60
          ? minutes
          : undefined,
      comment: comment.trim() || undefined,
    };

    const card = await createRun.run({ origin: "brief", mode, questionnaire });
    if (card) {
      router.push(`/scenarios/${card.id}?generating=1`);
    } else {
      toast.show(createRun.lastError.current?.problem.title ?? "Не удалось создать сценарий");
    }
  };

  return (
    <Card className="max-w-[720px] p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="questionnaire-sphere" className="text-13 font-medium">
          Сфера <span className="text-danger">*</span>
        </label>
        <Select
          id="questionnaire-sphere"
          value={sphere}
          onChange={(v) => {
            setSphere(v as Sphere);
            setErrors((e) => ({ ...e, sphere: undefined }));
          }}
          options={SPHERE_OPTIONS}
          placeholder="Выберите сферу"
          error={Boolean(errors.sphere)}
        />
        {errors.sphere ? (
          <span className="flex items-center gap-1.5 text-xs text-danger">
            <Icon name="xCircle" size={14} />
            {errors.sphere}
          </span>
        ) : (
          <span className="text-xs text-dusk">Веса критериев оценки возьмутся из сферы</span>
        )}
      </div>

      <Input
        id="questionnaire-topic"
        label={
          <>
            Тема <span className="text-danger">*</span>
          </>
        }
        value={topic}
        onChange={(e) => {
          setTopic(e.target.value);
          setErrors((err) => ({ ...err, topic: undefined }));
        }}
        placeholder="Срочная закупка 120 мотор-редукторов: к сроку успевает только один поставщик"
        hint={errors.topic ? undefined : "О чём разговор, одной фразой"}
        error={errors.topic}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="questionnaire-participant-role"
          label="Роль участника"
          value={participantRole}
          onChange={(e) => setParticipantRole(e.target.value)}
          placeholder="Специалист по закупкам"
        />
        <Input
          id="questionnaire-opponent-role"
          label="Роль и цели оппонента"
          value={opponentRole}
          onChange={(e) => setOpponentRole(e.target.value)}
          placeholder="Коммерческий директор поставщика, хочет денег до конца марта"
        />
      </div>

      <Input
        id="questionnaire-opponent-character"
        label="Тон и характер оппонента"
        value={opponentCharacter}
        onChange={(e) => setOpponentCharacter(e.target.value)}
        placeholder="Жёсткий, но честный"
        hint="Например: вежливый, но жёсткий в сроках"
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          id="questionnaire-type"
          label="Тип переговоров"
          value={negotiationType}
          onChange={(v) => setNegotiationType(v as NegotiationType)}
          options={TYPE_OPTIONS}
          placeholder="Не выбран"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-13 font-medium">Сложность</span>
          <SegmentControl
            value={difficulty}
            onChange={(v) => setDifficulty(v as Difficulty)}
            options={DIFFICULTY_OPTIONS}
            aria-label="Сложность"
          />
          <span className="text-xs text-dusk">Сценарий соберётся сразу на трёх уровнях</span>
        </div>
      </div>

      <Input
        id="questionnaire-time-limit"
        label="Лимит времени"
        type="number"
        min={3}
        max={60}
        value={timeLimit}
        onChange={(e) => setTimeLimit(e.target.value)}
        suffix="мин"
        className="w-40"
        hint="От 3 до 60 минут"
      />

      <Textarea
        id="questionnaire-comment"
        label="Комментарий"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Что ещё важно учесть при сборке сценария"
      />

      <div className="flex justify-end pt-1">
        <Button loading={createRun.loading} onClick={() => void submit()}>
          Сгенерировать сценарий
        </Button>
      </div>
    </Card>
  );
}
