"use client";

import { useEffect, useState } from "react";
import { createGroup } from "@/lib/api/modules/people";
import { useMutation } from "@/lib/api/hooks";
import { Button, Input, Modal, Notice, useToast } from "@/components/ui";

interface GroupFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function GroupFormModal({ open, onClose, onSaved }: GroupFormModalProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [touched, setTouched] = useState(false);
  const save = useMutation((b: { name: string; department?: string }) => createGroup(b));

  useEffect(() => {
    if (!open) return;
    setName("");
    setDepartment("");
    setTouched(false);
  }, [open]);

  const submit = async () => {
    setTouched(true);
    if (!name.trim()) return;
    const saved = await save.run({ name: name.trim(), department: department.trim() || undefined });
    if (!saved) return;
    toast.show("Группа добавлена");
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить группу"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button onClick={submit} loading={save.loading}>Добавить</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Название" value={name} onChange={(e) => setName(e.target.value)} placeholder="Отдел закупок" />
        {touched && !name.trim() && <Notice variant="error" message="Нужно название группы" />}
        <Input label="Подразделение" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Департамент продаж" />
        {save.error && <Notice variant="error" message={save.error.problem.title} />}
      </div>
    </Modal>
  );
}
