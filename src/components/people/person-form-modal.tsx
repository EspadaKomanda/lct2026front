"use client";

import { useState } from "react";
import type { Group, Person, PersonWrite } from "@/lib/api/types";
import { createPerson, updatePerson } from "@/lib/api/modules/people";
import { useMutation } from "@/lib/api/hooks";
import { Button, Input, Modal, Notice, Select, useToast } from "@/components/ui";

interface PersonFormModalProps {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  /** задано — режим редактирования карточки */
  person?: Person | null;
  onSaved: () => void;
}

interface PersonBody {
  group_id: string;
  full_name: string | null;
  pseudonym: string | null;
  personnel_no: string | null;
  job_title: string | null;
}

function PersonForm({ onClose, groups, person, onSaved }: Omit<PersonFormModalProps, "open">) {
  const toast = useToast();
  const [fullName, setFullName] = useState(person?.full_name ?? "");
  const [pseudonym, setPseudonym] = useState(person?.pseudonym ?? "");
  const [personnelNo, setPersonnelNo] = useState(person?.personnel_no ?? "");
  const [jobTitle, setJobTitle] = useState(person?.job_title ?? "");
  const [groupId, setGroupId] = useState(
    person?.group_id ?? groups.find((g) => g.has_access)?.id ?? groups[0]?.id ?? "",
  );
  const [touched, setTouched] = useState(false);
  const save = useMutation(
    person
      ? (b: PersonBody) => updatePerson(person.subject_id, b as PersonWrite)
      : (b: PersonBody) => createPerson(b as PersonWrite),
  );

  const noIdentity = !fullName.trim() && !pseudonym.trim();
  const noGroup = !groupId;
  const invalid = (touched && noIdentity) || noGroup;

  const submit = async () => {
    setTouched(true);
    if (noIdentity || noGroup) return;
    const body: PersonBody = {
      group_id: groupId,
      full_name: fullName.trim() || null,
      pseudonym: pseudonym.trim() || null,
      personnel_no: personnelNo.trim() || null,
      job_title: jobTitle.trim() || null,
    };
    const saved = await save.run(body);
    if (!saved) return;
    toast.show(person ? "Карточка сотрудника сохранена" : "Сотрудник добавлен");
    onSaved();
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={person ? "Изменить карточку" : "Добавить сотрудника"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button onClick={submit} loading={save.loading}>{person ? "Сохранить" : "Добавить"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="ФИО" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванова Мария Петровна" />
        {!fullName.trim() && pseudonym.trim() && (
          <Notice variant="banner" message="Без ФИО можно назначать только тренировку" />
        )}
        <Input label="Псевдоним" value={pseudonym} onChange={(e) => setPseudonym(e.target.value)} placeholder="Закупщик-07" />
        <Input label="Табельный номер" value={personnelNo} onChange={(e) => setPersonnelNo(e.target.value)} placeholder="Т-1042" />
        <Input label="Должность" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Ведущий специалист" />
        <Select
          label="Группа"
          value={groupId}
          onChange={setGroupId}
          placeholder="Выберите группу"
          options={groups.map((g) => ({ value: g.id, label: g.name }))}
        />
        {invalid && noIdentity && (
          <Notice variant="error" message="Укажите ФИО или псевдоним" />
        )}
        {save.error && <Notice variant="error" message={save.error.problem.title} />}
      </div>
    </Modal>
  );
}

export function PersonFormModal({ open, ...rest }: PersonFormModalProps) {
  if (!open) return null;
  return <PersonForm {...rest} />;
}
