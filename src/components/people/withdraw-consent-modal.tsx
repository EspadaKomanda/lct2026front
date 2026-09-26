"use client";

import { useEffect, useState } from "react";
import type { Person } from "@/lib/api/types";
import { withdrawConsent } from "@/lib/api/modules/people";
import { useMutation } from "@/lib/api/hooks";
import { Button, Input, Modal, Notice, useToast } from "@/components/ui";

interface WithdrawConsentModalProps {
  open: boolean;
  onClose: () => void;
  person: Person;
  onSaved: () => void;
}

export function WithdrawConsentModal({ open, onClose, person, onSaved }: WithdrawConsentModalProps) {
  const toast = useToast();
  const [confirmName, setConfirmName] = useState("");
  const save = useMutation((b: { scope: "all"; document_ref: string; confirm_name: string }) =>
    withdrawConsent(person.subject_id, b),
  );

  useEffect(() => {
    if (!open) return;
    setConfirmName("");
  }, [open]);

  const fullName = person.full_name ?? "";
  const confirmed = fullName.length > 0 && confirmName === fullName;

  const submit = async () => {
    const result = await save.run({ scope: "all", document_ref: "по запросу сотрудника", confirm_name: confirmName });
    if (!result) return;
    toast.show(result.message ?? "Согласие отозвано. Связь с сотрудником уничтожена");
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Отозвать согласие"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button variant="danger" onClick={submit} disabled={!confirmed} disabledReason="Введите ФИО сотрудника" loading={save.loading}>
            Отозвать согласие
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Notice
          variant="error"
          message="Это действие необратимо: аннулируются коды, удаляется связь с сотрудником, тексты реплик станут недоступны"
        />
        {fullName ? (
          <Input
            label="Введите ФИО сотрудника"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={fullName}
          />
        ) : (
          <Notice variant="warning" message="У сотрудника нет ФИО — полный отзыв согласия невозможен" />
        )}
        {save.error && <Notice variant="error" message={save.error.problem.title} />}
      </div>
    </Modal>
  );
}
