import { invoke } from "@tauri-apps/api/core";

export type Entity = Record<string, unknown> & {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_demo?: boolean;
};

export type AppStatus = {
  initialized: boolean;
  unlocked: boolean;
  restricted: boolean;
};

export const api = {
  status: () => invoke<AppStatus>("app_status"),
  restrictedUnlock: () => invoke<void>("restricted_unlock"),
  restrictedLock: () => invoke<void>("restricted_lock"),

  list: (table: string, filters?: [string, string][], includeDeleted?: boolean) =>
    invoke<Entity[]>("entity_list", { table, filters, includeDeleted }),
  get: (table: string, id: string) => invoke<Entity>("entity_get", { table, id }),
  create: (table: string, data: Record<string, unknown>) =>
    invoke<string>("entity_create", { table, data }),
  update: (table: string, id: string, data: Record<string, unknown>) =>
    invoke<void>("entity_update", { table, id, data }),
  remove: (table: string, id: string) => invoke<void>("entity_delete", { table, id }),
  restore: (table: string, id: string) => invoke<void>("entity_restore", { table, id }),
  purge: (table: string, id: string) => invoke<void>("entity_purge", { table, id }),
  finalize: (table: string, id: string) => invoke<void>("finalize_entry", { table, id }),
  addAddendum: (entryId: string, reason: string, content: string) =>
    invoke<string>("add_addendum", { entryId, reason, content }),

  search: (query: string) => invoke<Record<string, string>[]>("search_global", { query }),
  stats: () => invoke<Record<string, unknown>>("stats_counts"),
  dashboard: () => invoke<Record<string, unknown>>("dashboard"),

  settingsGet: () => invoke<Record<string, string>>("settings_get"),
  settingsSet: (key: string, value: string) => invoke<void>("settings_set", { key, value }),

  attachmentAdd: (ownerKind: string, ownerId: string, srcPath: string, restricted?: boolean) =>
    invoke<string>("attachment_add", { ownerKind, ownerId, srcPath, restricted }),
  attachmentExport: (id: string, destPath: string) =>
    invoke<void>("attachment_export", { id, destPath }),
  attachmentPreview: (id: string) =>
    invoke<{ name: string; mime: string; base64: string }>("attachment_preview", { id }),

  backupCreate: (destPath: string) => invoke<void>("backup_create", { destPath }),
  backupRestore: (srcPath: string) => invoke<void>("backup_restore", { srcPath }),
  exportLog: (exportType: string, targetKind: string, targetId?: string) =>
    invoke<void>("export_log", { exportType, targetKind, targetId }),
  auditList: (limit?: number, offset?: number, eventType?: string) =>
    invoke<
      { id: string; event_type: string; entity_kind: string; entity_id: string | null; detail: string | null; created_at: string }[]
    >("audit_list", { limit, offset, eventType }),
  trashList: () =>
    invoke<{ entity_kind: string; entity_id: string; deleted_at: string }[]>("trash_list"),

  demoSeed: () => invoke<void>("demo_seed"),
  demoClear: () => invoke<number>("demo_clear"),
};
