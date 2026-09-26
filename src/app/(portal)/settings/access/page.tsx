"use client";

import { useEffect, useState } from "react";
import { listGroups } from "@/lib/api/modules/people";
import { getMe } from "@/lib/api/modules/auth";
import {
  createUser,
  listUsers,
  setUserGroupAccess,
  updateUser,
} from "@/lib/api/modules/users";
import { useApi } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import type { Group, PortalUser, Role } from "@/lib/api/types";
import { ROLE_LABEL } from "@/lib/labels";
import {
  Badge,
  Button,
  Checkbox,
  DataTable,
  Drawer,
  Input,
  Modal,
  Notice,
  PageSpinner,
  Radio,
  Switch,
  useToast,
  type Column,
} from "@/components/ui";
import { AdminGate } from "@/components/settings/admin-gate";

const ROLES: Role[] = ["methodologist", "observer", "admin"];
const LOGIN_RE = /^[a-z0-9._-]{3,64}$/;

function errorTitle(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.problem.title : fallback;
}

export default function AccessPage() {
  const meQ = useApi(() => getMe(), []);
  return (
    <AdminGate me={meQ.data}>
      <AccessContent />
    </AdminGate>
  );
}

function AccessContent() {
  const toast = useToast();
  const usersQ = useApi(() => listUsers(), []);
  const groupsQ = useApi(() => listGroups(), []);
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const users = usersQ.data;
  const groups = groupsQ.data ?? [];
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  const columns: Column<PortalUser>[] = [
    {
      key: "full_name",
      title: "ФИО",
      render: (u) => <span className="font-medium text-night">{u.full_name}</span>,
    },
    {
      key: "login",
      title: "Логин",
      render: (u) => <span className="font-mono text-xs">{u.login}</span>,
    },
    {
      key: "role",
      title: "Роль",
      width: 150,
      render: (u) => ROLE_LABEL[u.role],
    },
    {
      key: "groups",
      title: "Группы",
      render: (u) =>
        u.role === "admin"
          ? "Все группы"
          : u.group_ids.length > 0
            ? u.group_ids.map((id) => groupName.get(id) ?? id).join(", ")
            : "—",
    },
    {
      key: "is_active",
      title: "Активен",
      width: 110,
      render: (u) =>
        u.is_active ? (
          <Badge variant="reviewed" icon="check">активен</Badge>
        ) : (
          <Badge variant="statusGray">отключён</Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-medium leading-tight">Доступ и роли</h1>
        <Button className="ml-auto" onClick={() => setCreateOpen(true)}>
          Новый пользователь
        </Button>
      </div>

      {usersQ.error ? (
        <Notice variant="error" title={usersQ.error.problem.title} />
      ) : usersQ.loading ? (
        <PageSpinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={users ?? []}
            rowKey={(u) => u.id}
            onRowClick={setEditing}
            emptyText="Пользователей нет"
          />
          <UserDrawer
            user={editing}
            groups={groups}
            onClose={() => setEditing(null)}
            onSaved={() => {
              usersQ.reload();
              toast.show("Пользователь сохранён");
            }}
          />
        </>
      )}

      <UserCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          usersQ.reload();
          toast.show("Пользователь создан");
        }}
      />
    </div>
  );
}

interface UserDraft {
  full_name: string;
  role: Role;
  is_active: boolean;
  group_ids: string[];
  password: string;
}

function UserDrawer({
  user,
  groups,
  onClose,
  onSaved,
}: {
  user: PortalUser | null;
  groups: Group[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDraft({
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        group_ids: [...user.group_ids],
        password: "",
      });
      setSaveError(null);
    }
  }, [user]);

  if (!user) return null;

  const noGroupsWarning =
    draft !== null &&
    (draft.role === "observer" || draft.role === "methodologist") &&
    draft.group_ids.length === 0;

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateUser(user.id, {
        full_name: draft.full_name.trim(),
        role: draft.role,
        is_active: draft.is_active,
        ...(draft.password ? { new_password: draft.password } : {}),
      });
      if (draft.role !== "admin") {
        await setUserGroupAccess(user.id, draft.group_ids);
      }
      onSaved();
      onClose();
    } catch (e) {
      setSaveError(
        `Не удалось сохранить: ${errorTitle(e, "ошибка соединения")}. Изменения остались в форме — повторите`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={user !== null} onClose={onClose} title={user.full_name} width={480}>
      {!draft ? null : (
        <div className="flex flex-col gap-4">
          {saveError && <Notice variant="error" title={saveError} />}
          <Input
            label="ФИО"
            value={draft.full_name}
            onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-13 font-medium">Логин</span>
            <Input readOnly value={user.login} inputClassName="font-mono text-xs" />
            <span className="text-xs text-dusk">Логин нельзя изменить после создания</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-13 font-medium">Роль</span>
            {ROLES.map((role) => (
              <Radio
                key={role}
                name="edit-role"
                value={role}
                checked={draft.role === role}
                onChange={(v) => setDraft({ ...draft, role: v as Role })}
                label={ROLE_LABEL[role]}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Switch
              checked={draft.is_active}
              onChange={(v) => setDraft({ ...draft, is_active: v })}
              aria-label="Активен"
            />
            <span>Активен</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-13 font-medium">Группы</span>
            {draft.role === "admin" ? (
              <p className="text-sm text-dusk">Администратор видит все группы</p>
            ) : groups.length === 0 ? (
              <p className="text-sm text-dusk">Групп нет</p>
            ) : (
              groups.map((g) => (
                <Checkbox
                  key={g.id}
                  checked={draft.group_ids.includes(g.id)}
                  onChange={(checked) =>
                    setDraft({
                      ...draft,
                      group_ids: checked
                        ? [...draft.group_ids, g.id]
                        : draft.group_ids.filter((id) => id !== g.id),
                    })
                  }
                  label={g.name}
                />
              ))
            )}
            {noGroupsWarning && (
              <Notice
                variant="warning"
                title="Для роли без групп разделы „Результаты“, „Люди“ и „Статистика“ будут пусты"
              />
            )}
          </div>
          <Input
            label="Новый пароль"
            type="password"
            autoComplete="new-password"
            value={draft.password}
            onChange={(e) => setDraft({ ...draft, password: e.target.value })}
            hint="Оставьте пустым, чтобы не менять пароль"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            <Button
              loading={saving}
              disabled={!draft.full_name.trim()}
              onClick={onSave}
            >
              Сохранить
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function UserCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [login, setLogin] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("methodologist");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setLogin("");
    setFullName("");
    setRole("methodologist");
    setPassword("");
    setErrors({});
    setCreateError(null);
  };

  const onSubmit = async () => {
    const next: Record<string, string> = {};
    if (!LOGIN_RE.test(login.trim())) {
      next.login = "3–64 символа: латиница, цифры, точка, подчёркивание, дефис";
    }
    if (!fullName.trim()) next.full_name = "Укажите ФИО";
    if (password.length < 10) next.password = "Пароль должен быть не короче 10 символов";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setCreating(true);
    setCreateError(null);
    try {
      await createUser({
        login: login.trim(),
        full_name: fullName.trim(),
        role,
        password,
      });
      onCreated();
      onClose();
      reset();
    } catch (e) {
      setCreateError(errorTitle(e, "Не удалось создать пользователя"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!creating) {
          onClose();
          reset();
        }
      }}
      title="Новый пользователь"
      footer={
        <>
          <Button
            variant="secondary"
            disabled={creating}
            onClick={() => {
              onClose();
              reset();
            }}
          >
            Отмена
          </Button>
          <Button loading={creating} onClick={onSubmit}>
            Создать
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {createError && <Notice variant="error" title={createError} />}
        <Input
          label="Логин"
          value={login}
          error={errors.login}
          onChange={(e) => setLogin(e.target.value)}
          inputClassName="font-mono text-xs"
          placeholder="ivanov"
        />
        <Input
          label="ФИО"
          value={fullName}
          error={errors.full_name}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Иванов Иван Иванович"
        />
        <div className="flex flex-col gap-2">
          <span className="text-13 font-medium">Роль</span>
          {ROLES.map((r) => (
            <Radio
              key={r}
              name="create-role"
              value={r}
              checked={role === r}
              onChange={(v) => setRole(v as Role)}
              label={ROLE_LABEL[r]}
            />
          ))}
        </div>
        <Input
          label="Пароль"
          type="password"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Минимум 10 символов"
        />
      </div>
    </Modal>
  );
}
