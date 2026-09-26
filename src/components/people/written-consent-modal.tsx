"use client";

import { useEffect, useState } from "react";
import type { Person } from "@/lib/api/types";
import { addWrittenConsent } from "@/lib/api/modules/people";
import { useMutation } from "@/lib/api/hooks";
import { Button, Input, Modal, Notice, Select, useToast } from "@/components/ui";

interface WrittenConsentModalProps {
  open: boolean;
  onClose: () => void;
  person: Person;
  onSaved: () => void;
}

const CHANNEL_OPTIONS = [
  { value: "paper", label: "Бумага" },
  { value: "edo", label: "ЭДО" },
];

export function WrittenConsentModal({ open, onClose, person, onSaved }: WrittenConsentModalProps) {
  const toast = useToast();
  const [documentRef, setDocumentRef] = useState("");
  const [channel, setChannel] = useState("paper");
  const [signedOn, setSignedOn] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [touched, setTouched] = useState(false);
  const save = useMutation((b: Parameters<typeof addWrittenConsent>[1]) => addWrittenConsent(person.subject_id, b));

  useEffect(() => {
    if (!open) return;
    setDocumentRef("");
    setChannel("paper");
    setSignedOn("");
    setValidUntil("");
    setTouched(false);
  }, [open]);

  const invalid = !documentRef.trim() || !signedOn;

  const submit = async () => {
    setTouched(true);
    if (invalid) return;
    const saved = await save.run({
      document_ref: documentRef.trim(),
      document_channel: channel as "paper" | "edo",
      signed_on: signedOn,
      valid_until: validUntil || undefined,
    });
    if (!saved) return;
    toast.show("Письменное согласие отмечено");
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Отметить письменное согласие"
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button onClick={submit} loading={save.loading}>Сохранить</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Номер документа" value={documentRef} onChange={(e) => setDocumentRef(e.target.value)} placeholder="СОГ-2026-014" />
        <Select label="Канал" value={channel} onChange={setChannel} options={CHANNEL_OPTIONS} />
        <Input label="Дата подписи" type="date" value={signedOn} onChange={(e) => setSignedOn(e.target.value)} />
        <Input label="Действует до" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        {touched && invalid && <Notice variant="error" message="Нужны номер документа и дата подписи" />}
        {save.error && <Notice variant="error" message={save.error.problem.title} />}
      </div>
    </Modal>
  );
}
