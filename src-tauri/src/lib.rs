//! PsicoRegistro — backend Tauri.

pub mod attachments;
pub mod audit;
pub mod auth;
pub mod backup;
pub mod crypto;
pub mod db;
pub mod demo;
pub mod entities;
pub mod search;
pub mod state;

use std::time::{Duration, Instant};

use base64::Engine;
use serde_json::{json, Value};
use state::AppState;
use tauri::{Manager, State};

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

type Cmd<T> = Result<T, String>;

fn with_open<T>(
    st: &State<'_, AppState>,
    f: impl FnOnce(&rusqlite::Connection, &[u8; 32], &state::Inner) -> Cmd<T>,
) -> Cmd<T> {
    let inner = st.inner.lock().map_err(|_| "Erro interno.")?;
    let key = inner.require_key()?;
    let conn = inner.require_conn()?;
    f(conn, &key, &inner)
}

// ---------- autenticação / sessão ----------

#[tauri::command]
fn app_status(st: State<'_, AppState>) -> Cmd<Value> {
    let inner = st.inner.lock().map_err(|_| "Erro interno.")?;
    let initialized = match inner.conn.as_ref() {
        Some(c) => auth::get_user(c)?.is_some(),
        None => false,
    };
    Ok(json!({
        "initialized": initialized,
        "unlocked": inner.key.is_some(),
        "restricted": inner.restricted_ok(),
    }))
}

#[tauri::command]
fn setup_password(st: State<'_, AppState>, password: String) -> Cmd<()> {
    let mut inner = st.inner.lock().map_err(|_| "Erro interno.")?;
    let conn = inner.require_conn()?;
    let key = auth::create_user(conn, &password)?;
    audit::log(conn, "setup", "users", None, None);
    inner.key = Some(key);
    Ok(())
}

#[tauri::command]
fn unlock(st: State<'_, AppState>, password: String) -> Cmd<()> {
    let mut inner = st.inner.lock().map_err(|_| "Erro interno.")?;
    let conn = inner.require_conn()?;
    let key = auth::unlock(conn, &password)?;
    audit::log(conn, "unlock", "session", None, None);
    inner.key = Some(key);
    Ok(())
}

#[tauri::command]
fn lock(st: State<'_, AppState>) -> Cmd<()> {
    let mut inner = st.inner.lock().map_err(|_| "Erro interno.")?;
    if let Some(c) = inner.conn.as_ref() {
        audit::log(c, "lock", "session", None, None);
    }
    inner.lock_session();
    Ok(())
}

#[tauri::command]
fn change_password(st: State<'_, AppState>, old: String, new: String) -> Cmd<()> {
    let inner = st.inner.lock().map_err(|_| "Erro interno.")?;
    let conn = inner.require_conn()?;
    auth::change_password(conn, &old, &new)?;
    audit::log(conn, "password_change", "users", None, None);
    Ok(())
}

#[tauri::command]
fn restricted_unlock(st: State<'_, AppState>, password: String) -> Cmd<()> {
    let mut inner = st.inner.lock().map_err(|_| "Erro interno.")?;
    let conn = inner.require_conn()?;
    if !auth::verify_only(conn, &password)? {
        return Err("Senha incorreta.".into());
    }
    audit::log(conn, "restricted_access", "restricted_neuropsych_records", None, None);
    inner.restricted_until = Some(Instant::now() + Duration::from_secs(600));
    Ok(())
}

#[tauri::command]
fn restricted_lock(st: State<'_, AppState>) -> Cmd<()> {
    let mut inner = st.inner.lock().map_err(|_| "Erro interno.")?;
    inner.restricted_until = None;
    Ok(())
}

// ---------- CRUD genérico ----------

fn guard_restricted(table: &str, inner: &state::Inner) -> Cmd<()> {
    if db::spec(table).map(|t| t.restricted).unwrap_or(false) && !inner.restricted_ok() {
        return Err("Área restrita bloqueada. Confirme sua senha para acessar.".into());
    }
    Ok(())
}

#[tauri::command]
fn entity_list(
    st: State<'_, AppState>,
    table: String,
    filters: Option<Vec<(String, String)>>,
    include_deleted: Option<bool>,
) -> Cmd<Vec<Value>> {
    with_open(&st, |conn, key, inner| {
        guard_restricted(&table, inner)?;
        entities::list(conn, key, &table, &filters.unwrap_or_default(), include_deleted.unwrap_or(false))
    })
}

#[tauri::command]
fn entity_get(st: State<'_, AppState>, table: String, id: String) -> Cmd<Value> {
    with_open(&st, |conn, key, inner| {
        guard_restricted(&table, inner)?;
        let v = entities::get(conn, key, &table, &id)?;
        if table == "clinical_entries" || table == "restricted_neuropsych_records" {
            audit::log(conn, "access", &table, Some(&id), None);
        }
        Ok(v)
    })
}

#[tauri::command]
fn entity_create(st: State<'_, AppState>, table: String, data: Value) -> Cmd<String> {
    with_open(&st, |conn, key, inner| {
        guard_restricted(&table, inner)?;
        entities::create(conn, key, &table, &data, false)
    })
}

#[tauri::command]
fn entity_update(st: State<'_, AppState>, table: String, id: String, data: Value) -> Cmd<()> {
    with_open(&st, |conn, key, inner| {
        guard_restricted(&table, inner)?;
        entities::update(conn, key, &table, &id, &data)
    })
}

#[tauri::command]
fn entity_delete(st: State<'_, AppState>, table: String, id: String) -> Cmd<()> {
    with_open(&st, |conn, _key, inner| {
        guard_restricted(&table, inner)?;
        entities::soft_delete(conn, &table, &id)
    })
}

#[tauri::command]
fn entity_restore(st: State<'_, AppState>, table: String, id: String) -> Cmd<()> {
    with_open(&st, |conn, _key, _| entities::restore(conn, &table, &id))
}

#[tauri::command]
fn entity_purge(st: State<'_, AppState>, table: String, id: String, password: String) -> Cmd<()> {
    with_open(&st, |conn, _key, _| {
        if !auth::verify_only(conn, &password)? {
            return Err("Senha incorreta.".into());
        }
        if table == "attachments" {
            // remoção do blob em disco tratada abaixo (fora do with_open não temos dir)
        }
        entities::purge(conn, &table, &id)
    })?;
    if table == "attachments" {
        attachments::remove_file(&st.attachments_dir(), &id);
    }
    Ok(())
}

#[tauri::command]
fn finalize_entry(st: State<'_, AppState>, table: String, id: String) -> Cmd<()> {
    if table != "clinical_entries" && table != "school_records" {
        return Err("Tabela inválida.".into());
    }
    with_open(&st, |conn, _key, _| {
        entities::set_status(conn, &table, &id, "finalizado")?;
        audit::log(conn, "finalize", &table, Some(&id), None);
        Ok(())
    })
}

#[tauri::command]
fn add_addendum(st: State<'_, AppState>, entry_id: String, reason: String, content: String) -> Cmd<String> {
    with_open(&st, |conn, key, _| {
        // valida existência e status
        let entry = entities::get(conn, key, "clinical_entries", &entry_id)?;
        let status = entry["status"].as_str().unwrap_or("");
        if status != "finalizado" && status != "corrigido" {
            return Err("Somente registros finalizados recebem adendo.".into());
        }
        let id = entities::create(
            conn,
            key,
            "clinical_entry_addenda",
            &json!({ "entry_id": entry_id, "reason": reason, "content": content }),
            false,
        )?;
        entities::set_status(conn, "clinical_entries", &entry_id, "corrigido")?;
        audit::log(conn, "addendum", "clinical_entries", Some(&entry_id), None);
        Ok(id)
    })
}

// ---------- pesquisa / estatísticas ----------

#[tauri::command]
fn search_global(st: State<'_, AppState>, query: String) -> Cmd<Vec<Value>> {
    with_open(&st, |conn, key, _| search::global(conn, key, &query))
}

#[tauri::command]
fn stats_counts(st: State<'_, AppState>) -> Cmd<Value> {
    with_open(&st, |conn, _key, _| {
        let count = |sql: &str| -> i64 {
            conn.query_row(sql, [], |r| r.get(0)).unwrap_or(0)
        };
        let group = |sql: &str| -> Vec<Value> {
            let mut out = Vec::new();
            if let Ok(mut stmt) = conn.prepare(sql) {
                if let Ok(rows) = stmt.query_map([], |r| {
                    let k: Option<String> = r.get(0)?;
                    let n: i64 = r.get(1)?;
                    Ok(json!({ "key": k.unwrap_or_else(|| "(não informado)".into()), "count": n }))
                }) {
                    out.extend(rows.flatten());
                }
            }
            out
        };
        Ok(json!({
            "active_cases": count("SELECT COUNT(*) FROM clinical_cases WHERE deleted_at IS NULL AND status IN ('triagem','em_andamento')"),
            "patients": count("SELECT COUNT(*) FROM patients WHERE deleted_at IS NULL"),
            "students": count("SELECT COUNT(*) FROM students WHERE deleted_at IS NULL"),
            "schools": count("SELECT COUNT(*) FROM schools WHERE deleted_at IS NULL AND status = 'ativa'"),
            "entries_by_type": group("SELECT entry_type, COUNT(*) FROM clinical_entries WHERE deleted_at IS NULL GROUP BY entry_type"),
            "school_by_activity": group("SELECT activity_type, COUNT(*) FROM school_records WHERE deleted_at IS NULL GROUP BY activity_type"),
            "referrals_by_area": group("SELECT area, COUNT(*) FROM referrals WHERE deleted_at IS NULL GROUP BY area"),
            "referrals_by_status": group("SELECT status, COUNT(*) FROM referrals WHERE deleted_at IS NULL GROUP BY status"),
            "students_by_school": group("SELECT school_id, COUNT(*) FROM students WHERE deleted_at IS NULL GROUP BY school_id"),
            "entries_by_month": group("SELECT substr(entry_date,1,7), COUNT(*) FROM clinical_entries WHERE deleted_at IS NULL GROUP BY substr(entry_date,1,7) ORDER BY 1"),
            "school_by_month": group("SELECT substr(record_date,1,7), COUNT(*) FROM school_records WHERE deleted_at IS NULL GROUP BY substr(record_date,1,7) ORDER BY 1"),
        }))
    })
}

#[tauri::command]
fn dashboard(st: State<'_, AppState>) -> Cmd<Value> {
    with_open(&st, |conn, _key, _| {
        let count = |sql: &str| -> i64 { conn.query_row(sql, [], |r| r.get(0)).unwrap_or(0) };
        let last_backup: Option<String> = conn
            .query_row("SELECT value FROM app_settings WHERE key = 'last_backup_at'", [], |r| r.get(0))
            .ok();
        Ok(json!({
            "drafts": count("SELECT COUNT(*) FROM clinical_entries WHERE deleted_at IS NULL AND status = 'rascunho'")
                + count("SELECT COUNT(*) FROM school_records WHERE deleted_at IS NULL AND status = 'rascunho'"),
            "recent_entries": count("SELECT COUNT(*) FROM clinical_entries WHERE deleted_at IS NULL AND entry_date >= date('now','-7 day')"),
            "recent_school": count("SELECT COUNT(*) FROM school_records WHERE deleted_at IS NULL AND record_date >= date('now','-7 day')"),
            "pending_reminders": count("SELECT COUNT(*) FROM reminders WHERE deleted_at IS NULL AND status = 'pendente'"),
            "overdue_reminders": count("SELECT COUNT(*) FROM reminders WHERE deleted_at IS NULL AND status = 'pendente' AND due_date < date('now')"),
            "referrals_no_return": count("SELECT COUNT(*) FROM referrals WHERE deleted_at IS NULL AND status IN ('sem_retorno','planejado','entregue','agendado')"),
            "assessments_open": count("SELECT COUNT(*) FROM clinical_cases WHERE deleted_at IS NULL AND case_type = 'avaliacao_neuropsicologica' AND status IN ('triagem','em_andamento')"),
            "last_backup_at": last_backup,
        }))
    })
}

// ---------- configurações ----------

#[tauri::command]
fn settings_get(st: State<'_, AppState>) -> Cmd<Value> {
    let inner = st.inner.lock().map_err(|_| "Erro interno.")?;
    let conn = inner.require_conn()?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM app_settings")
        .map_err(|_| "Erro na consulta.")?;
    let mut obj = serde_json::Map::new();
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(|_| "Erro na consulta.")?;
    for row in rows.flatten() {
        obj.insert(row.0, Value::String(row.1));
    }
    Ok(Value::Object(obj))
}

#[tauri::command]
fn settings_set(st: State<'_, AppState>, key: String, value: String) -> Cmd<()> {
    let allowed = [
        "theme", "font_scale", "backup_reminder_days", "last_backup_at", "autolock_minutes",
    ];
    if !allowed.contains(&key.as_str()) {
        return Err("Configuração desconhecida.".into());
    }
    let inner = st.inner.lock().map_err(|_| "Erro interno.")?;
    let conn = inner.require_conn()?;
    conn.execute(
        "INSERT INTO app_settings (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
        rusqlite::params![key, value, now_iso()],
    )
    .map_err(|_| "Erro ao salvar configuração.")?;
    Ok(())
}

// ---------- anexos ----------

#[tauri::command]
fn attachment_add(
    st: State<'_, AppState>,
    owner_kind: String,
    owner_id: String,
    src_path: String,
    restricted: Option<bool>,
) -> Cmd<String> {
    let dir = st.attachments_dir();
    with_open(&st, |conn, key, inner| {
        if restricted.unwrap_or(false) && !inner.restricted_ok() {
            return Err("Área restrita bloqueada.".into());
        }
        attachments::add(conn, key, &dir, &owner_kind, &owner_id, &src_path, restricted.unwrap_or(false))
    })
}

#[tauri::command]
fn attachment_export(st: State<'_, AppState>, id: String, dest_path: String) -> Cmd<()> {
    let dir = st.attachments_dir();
    with_open(&st, |conn, key, _| attachments::export_to(conn, key, &dir, &id, &dest_path))
}

/// Grava um arquivo (ex.: PDF de exportação) escolhido pelo usuário via diálogo.
#[tauri::command]
fn write_export_file(st: State<'_, AppState>, dest_path: String, base64_data: String) -> Cmd<()> {
    {
        // exige sessão aberta para evitar escrita fora do fluxo autenticado
        let inner = st.inner.lock().map_err(|_| "Erro interno.")?;
        inner.require_key()?;
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data.as_bytes())
        .map_err(|_| "Dados inválidos.")?;
    std::fs::write(&dest_path, bytes).map_err(|_| "Erro ao gravar arquivo.")?;
    Ok(())
}

#[tauri::command]
fn attachment_preview(st: State<'_, AppState>, id: String) -> Cmd<Value> {
    let dir = st.attachments_dir();
    with_open(&st, |conn, key, _| {
        let (name, bytes) = attachments::read_decrypted(conn, key, &dir, &id)?;
        if bytes.len() > 8 * 1024 * 1024 {
            return Err("Arquivo grande demais para pré-visualização. Use exportar.".into());
        }
        let ext = name.rsplit('.').next().unwrap_or("").to_lowercase();
        let mime = match ext.as_str() {
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "pdf" => "application/pdf",
            _ => return Err("Pré-visualização disponível apenas para imagens e PDF.".into()),
        };
        Ok(json!({
            "name": name,
            "mime": mime,
            "base64": base64::engine::general_purpose::STANDARD.encode(&bytes),
        }))
    })
}

// ---------- backup / exportação / auditoria ----------

#[tauri::command]
fn backup_create(st: State<'_, AppState>, dest_path: String) -> Cmd<()> {
    let dir = st.attachments_dir();
    with_open(&st, |conn, key, _| {
        backup::create(conn, key, &dir, &dest_path)?;
        conn.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES ('last_backup_at', ?1, ?1)
             ON CONFLICT(key) DO UPDATE SET value = ?1, updated_at = ?1",
            [now_iso()],
        )
        .ok();
        Ok(())
    })
}

#[tauri::command]
fn backup_restore(st: State<'_, AppState>, src_path: String, password: String) -> Cmd<()> {
    let mut inner = st.inner.lock().map_err(|_| "Erro interno.")?;
    // fecha conexão atual antes de trocar o arquivo
    inner.conn = None;
    inner.lock_session();
    let res = backup::restore(
        &st.data_dir,
        &st.db_path(),
        &st.attachments_dir(),
        &src_path,
        &password,
    );
    // reabre banco (restaurado ou original)
    let conn = db::open(&st.db_path()).map_err(|_| "Erro ao reabrir banco.")?;
    db::migrate(&conn).map_err(|_| "Erro ao migrar banco.")?;
    if res.is_ok() {
        audit::log(&conn, "backup_restore", "backup", None, None);
        if let Ok(key) = auth::unlock(&conn, &password) {
            inner.key = Some(key);
        }
    }
    inner.conn = Some(conn);
    res
}

#[tauri::command]
fn export_log(st: State<'_, AppState>, export_type: String, target_kind: String, target_id: Option<String>) -> Cmd<()> {
    with_open(&st, |conn, key, _| {
        entities::create(
            conn,
            key,
            "exports",
            &json!({ "export_type": export_type, "target_kind": target_kind, "target_id": target_id }),
            false,
        )?;
        audit::log(conn, "export", &target_kind, target_id.as_deref(), Some(&export_type));
        Ok(())
    })
}

#[tauri::command]
fn audit_list(st: State<'_, AppState>, limit: Option<i64>, offset: Option<i64>, event_type: Option<String>) -> Cmd<Vec<audit::AuditEvent>> {
    with_open(&st, |conn, _key, _| {
        audit::list(conn, limit.unwrap_or(200), offset.unwrap_or(0), event_type)
    })
}

#[tauri::command]
fn trash_list(st: State<'_, AppState>) -> Cmd<Vec<Value>> {
    with_open(&st, |conn, _key, _| {
        let mut stmt = conn
            .prepare("SELECT entity_kind, entity_id, deleted_at FROM deleted_items WHERE purged_at IS NULL ORDER BY deleted_at DESC LIMIT 500")
            .map_err(|_| "Erro na consulta.")?;
        let rows = stmt
            .query_map([], |r| {
                Ok(json!({
                    "entity_kind": r.get::<_, String>(0)?,
                    "entity_id": r.get::<_, String>(1)?,
                    "deleted_at": r.get::<_, String>(2)?,
                }))
            })
            .map_err(|_| "Erro na consulta.")?;
        Ok(rows.flatten().collect())
    })
}

// ---------- demonstração ----------

#[tauri::command]
fn demo_seed(st: State<'_, AppState>) -> Cmd<()> {
    with_open(&st, |conn, key, _| {
        demo::seed(conn, key)?;
        audit::log(conn, "demo_seed", "demo", None, None);
        Ok(())
    })
}

#[tauri::command]
fn demo_clear(st: State<'_, AppState>) -> Cmd<u64> {
    with_open(&st, |conn, _key, _| demo::clear(conn))
}

// ---------- bootstrap ----------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("diretório de dados indisponível");
            std::fs::create_dir_all(&data_dir).ok();
            let st = AppState::new(data_dir);
            let conn = db::open(&st.db_path()).expect("falha ao abrir banco");
            db::migrate(&conn).expect("falha ao migrar banco");
            st.inner.lock().unwrap().conn = Some(conn);
            app.manage(st);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_status,
            setup_password,
            unlock,
            lock,
            change_password,
            restricted_unlock,
            restricted_lock,
            entity_list,
            entity_get,
            entity_create,
            entity_update,
            entity_delete,
            entity_restore,
            entity_purge,
            finalize_entry,
            add_addendum,
            search_global,
            stats_counts,
            dashboard,
            settings_get,
            settings_set,
            attachment_add,
            attachment_export,
            attachment_preview,
            write_export_file,
            backup_create,
            backup_restore,
            export_log,
            audit_list,
            trash_list,
            demo_seed,
            demo_clear,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar a aplicação");
}
