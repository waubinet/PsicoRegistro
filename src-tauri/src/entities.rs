//! CRUD genérico das tabelas de entidade.
//!
//! Toda escrita usa queries parametrizadas; nomes de tabela/coluna passam por
//! allowlist (`db::spec`). Campos sensíveis vivem no JSON cifrado `data_enc`.

use rusqlite::{params_from_iter, Connection, ToSql};
use serde_json::{Map, Value};

use crate::db::{spec, TableSpec};
use crate::{audit, crypto, now_iso};

fn table_spec(table: &str) -> Result<&'static TableSpec, String> {
    spec(table).ok_or_else(|| "Tabela desconhecida.".to_string())
}

fn check_col(t: &TableSpec, col: &str) -> Result<(), String> {
    if t.plain.contains(&col) {
        Ok(())
    } else {
        Err("Coluna de filtro inválida.".to_string())
    }
}

fn encrypt_data(key: &[u8; 32], data: &Value) -> Result<Vec<u8>, String> {
    let raw = serde_json::to_vec(data).map_err(|_| "Dados inválidos.")?;
    crypto::encrypt(key, &raw).map_err(|e| e.to_string())
}

fn decrypt_data(key: &[u8; 32], blob: &[u8]) -> Result<Value, String> {
    let raw = crypto::decrypt(key, blob).map_err(|e| e.to_string())?;
    serde_json::from_slice(&raw).map_err(|_| "Registro corrompido.".to_string())
}

/// Monta o objeto retornado ao frontend: id + colunas puras + dados decifrados + metadados.
fn row_to_json(
    t: &TableSpec,
    key: &[u8; 32],
    row: &rusqlite::Row,
) -> Result<Value, String> {
    let mut obj = Map::new();
    let id: String = row.get(0).map_err(|_| "Erro de leitura.")?;
    obj.insert("id".into(), Value::String(id));
    for (i, col) in t.plain.iter().enumerate() {
        let v: Option<String> = row.get(1 + i).map_err(|_| "Erro de leitura.")?;
        obj.insert((*col).to_string(), v.map(Value::String).unwrap_or(Value::Null));
    }
    let n = t.plain.len();
    let blob: Vec<u8> = row.get(1 + n).map_err(|_| "Erro de leitura.")?;
    let data = decrypt_data(key, &blob)?;
    if let Value::Object(m) = data {
        for (k, v) in m {
            obj.entry(k).or_insert(v);
        }
    }
    let is_demo: i64 = row.get(2 + n).map_err(|_| "Erro de leitura.")?;
    let created: String = row.get(3 + n).map_err(|_| "Erro de leitura.")?;
    let updated: String = row.get(4 + n).map_err(|_| "Erro de leitura.")?;
    let deleted: Option<String> = row.get(5 + n).map_err(|_| "Erro de leitura.")?;
    obj.insert("is_demo".into(), Value::Bool(is_demo != 0));
    obj.insert("created_at".into(), Value::String(created));
    obj.insert("updated_at".into(), Value::String(updated));
    obj.insert("deleted_at".into(), deleted.map(Value::String).unwrap_or(Value::Null));
    Ok(Value::Object(obj))
}

fn select_cols(t: &TableSpec) -> String {
    let mut cols = vec!["id".to_string()];
    cols.extend(t.plain.iter().map(|c| c.to_string()));
    cols.push("data_enc".into());
    cols.push("is_demo".into());
    cols.push("created_at".into());
    cols.push("updated_at".into());
    cols.push("deleted_at".into());
    cols.join(", ")
}

pub fn list(
    conn: &Connection,
    key: &[u8; 32],
    table: &str,
    filters: &[(String, String)],
    include_deleted: bool,
) -> Result<Vec<Value>, String> {
    let t = table_spec(table)?;
    let mut sql = format!("SELECT {} FROM {} WHERE 1=1", select_cols(t), t.name);
    if !include_deleted {
        sql.push_str(" AND deleted_at IS NULL");
    }
    let mut params: Vec<&dyn ToSql> = Vec::new();
    for (i, (col, val)) in filters.iter().enumerate() {
        check_col(t, col)?;
        sql.push_str(&format!(" AND {} = ?{}", col, i + 1));
        params.push(val);
    }
    sql.push_str(" ORDER BY created_at DESC");
    let mut stmt = conn.prepare(&sql).map_err(|_| "Erro na consulta.")?;
    let rows = stmt
        .query_map(params_from_iter(params), |r| {
            Ok(row_to_json(t, key, r))
        })
        .map_err(|_| "Erro na consulta.")?;
    // Uma linha que não decifra (ex.: gravada com uma chave anterior) é ignorada,
    // para não inviabilizar a listagem inteira.
    let mut out = Vec::new();
    for r in rows.flatten() {
        if let Ok(v) = r {
            out.push(v);
        }
    }
    Ok(out)
}

pub fn get(conn: &Connection, key: &[u8; 32], table: &str, id: &str) -> Result<Value, String> {
    let t = table_spec(table)?;
    let sql = format!("SELECT {} FROM {} WHERE id = ?1", select_cols(t), t.name);
    conn.query_row(&sql, [id], |r| Ok(row_to_json(t, key, r)))
        .map_err(|_| "Registro não encontrado.".to_string())?
}

/// Separa o objeto recebido em colunas puras (allowlist) e o restante (cifrado).
fn split_payload(t: &TableSpec, data: &Value) -> Result<(Vec<(String, Option<String>)>, Value), String> {
    let obj = data.as_object().ok_or("Dados inválidos.")?;
    let mut plain = Vec::new();
    let mut rest = Map::new();
    for (k, v) in obj {
        if ["id", "is_demo", "created_at", "updated_at", "deleted_at", "data_enc"].contains(&k.as_str()) {
            continue;
        }
        if t.plain.contains(&k.as_str()) {
            let s = match v {
                Value::Null => None,
                Value::String(s) => Some(s.clone()),
                other => Some(other.to_string()),
            };
            plain.push((k.clone(), s));
        } else {
            rest.insert(k.clone(), v.clone());
        }
    }
    Ok((plain, Value::Object(rest)))
}

pub fn create(
    conn: &Connection,
    key: &[u8; 32],
    table: &str,
    data: &Value,
    is_demo: bool,
) -> Result<String, String> {
    let t = table_spec(table)?;
    let (plain, rest) = split_payload(t, data)?;
    let id = uuid::Uuid::new_v4().to_string();
    let blob = encrypt_data(key, &rest)?;
    let now = now_iso();
    let mut cols = vec!["id".to_string()];
    let mut placeholders = vec!["?1".to_string()];
    let mut params: Vec<Box<dyn ToSql>> = vec![Box::new(id.clone())];
    let mut idx = 2;
    for (c, v) in &plain {
        cols.push(c.clone());
        placeholders.push(format!("?{}", idx));
        params.push(Box::new(v.clone()));
        idx += 1;
    }
    cols.push("data_enc".into());
    placeholders.push(format!("?{}", idx));
    params.push(Box::new(blob));
    idx += 1;
    cols.push("is_demo".into());
    placeholders.push(format!("?{}", idx));
    params.push(Box::new(if is_demo { 1i64 } else { 0 }));
    idx += 1;
    cols.push("created_at".into());
    placeholders.push(format!("?{}", idx));
    params.push(Box::new(now.clone()));
    idx += 1;
    cols.push("updated_at".into());
    placeholders.push(format!("?{}", idx));
    params.push(Box::new(now));
    let sql = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        t.name,
        cols.join(", "),
        placeholders.join(", ")
    );
    conn.execute(&sql, params_from_iter(params.iter().map(|b| b.as_ref())))
        .map_err(|_| "Erro ao gravar registro.".to_string())?;
    audit::log(conn, "create", t.name, Some(&id), None);
    Ok(id)
}

/// Regra de imutabilidade: evolução finalizada não aceita edição comum.
fn assert_mutable(conn: &Connection, table: &str, id: &str) -> Result<(), String> {
    if table == "clinical_entries" || table == "school_records" {
        let status: Option<String> = conn
            .query_row(
                &format!("SELECT status FROM {} WHERE id = ?1", table),
                [id],
                |r| r.get(0),
            )
            .map_err(|_| "Registro não encontrado.".to_string())?;
        if matches!(status.as_deref(), Some("finalizado") | Some("corrigido")) {
            return Err(
                "Registro finalizado não pode ser editado. Use um adendo para correções.".into(),
            );
        }
    }
    Ok(())
}

pub fn update(
    conn: &Connection,
    key: &[u8; 32],
    table: &str,
    id: &str,
    data: &Value,
) -> Result<(), String> {
    let t = table_spec(table)?;
    assert_mutable(conn, table, id)?;
    let (plain, rest) = split_payload(t, data)?;
    let blob = encrypt_data(key, &rest)?;
    let mut sets = Vec::new();
    let mut params: Vec<Box<dyn ToSql>> = Vec::new();
    let mut idx = 1;
    for (c, v) in &plain {
        sets.push(format!("{} = ?{}", c, idx));
        params.push(Box::new(v.clone()));
        idx += 1;
    }
    sets.push(format!("data_enc = ?{}", idx));
    params.push(Box::new(blob));
    idx += 1;
    sets.push(format!("updated_at = ?{}", idx));
    params.push(Box::new(now_iso()));
    idx += 1;
    let sql = format!("UPDATE {} SET {} WHERE id = ?{}", t.name, sets.join(", "), idx);
    params.push(Box::new(id.to_string()));
    let n = conn
        .execute(&sql, params_from_iter(params.iter().map(|b| b.as_ref())))
        .map_err(|_| "Erro ao atualizar registro.".to_string())?;
    if n == 0 {
        return Err("Registro não encontrado.".into());
    }
    audit::log(conn, "update", t.name, Some(id), None);
    Ok(())
}

/// Transição de status controlada (ex.: finalizar evolução). Não passa pela
/// checagem de imutabilidade para permitir marcar como "corrigido" via adendo.
pub fn set_status(conn: &Connection, table: &str, id: &str, status: &str) -> Result<(), String> {
    let t = table_spec(table)?;
    check_col(t, "status")?;
    let n = conn
        .execute(
            &format!("UPDATE {} SET status = ?1, updated_at = ?2 WHERE id = ?3", t.name),
            rusqlite::params![status, now_iso(), id],
        )
        .map_err(|_| "Erro ao atualizar situação.".to_string())?;
    if n == 0 {
        return Err("Registro não encontrado.".into());
    }
    audit::log(conn, "status", t.name, Some(id), Some(status));
    Ok(())
}

pub fn soft_delete(conn: &Connection, table: &str, id: &str) -> Result<(), String> {
    let t = table_spec(table)?;
    let now = now_iso();
    let n = conn
        .execute(
            &format!("UPDATE {} SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL", t.name),
            rusqlite::params![now, id],
        )
        .map_err(|_| "Erro ao excluir registro.".to_string())?;
    if n == 0 {
        return Err("Registro não encontrado.".into());
    }
    conn.execute(
        "INSERT INTO deleted_items (id, entity_kind, entity_id, deleted_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![uuid::Uuid::new_v4().to_string(), t.name, id, now],
    )
    .ok();
    audit::log(conn, "delete", t.name, Some(id), None);
    Ok(())
}

pub fn restore(conn: &Connection, table: &str, id: &str) -> Result<(), String> {
    let t = table_spec(table)?;
    let n = conn
        .execute(
            &format!("UPDATE {} SET deleted_at = NULL, updated_at = ?1 WHERE id = ?2", t.name),
            rusqlite::params![now_iso(), id],
        )
        .map_err(|_| "Erro ao restaurar registro.".to_string())?;
    if n == 0 {
        return Err("Registro não encontrado.".into());
    }
    conn.execute(
        "DELETE FROM deleted_items WHERE entity_kind = ?1 AND entity_id = ?2",
        rusqlite::params![t.name, id],
    )
    .ok();
    audit::log(conn, "restore", t.name, Some(id), None);
    Ok(())
}

/// Exclusão definitiva (exige senha verificada pelo chamador).
pub fn purge(conn: &Connection, table: &str, id: &str) -> Result<(), String> {
    let t = table_spec(table)?;
    let n = conn
        .execute(&format!("DELETE FROM {} WHERE id = ?1", t.name), [id])
        .map_err(|_| "Erro ao excluir definitivamente.".to_string())?;
    if n == 0 {
        return Err("Registro não encontrado.".into());
    }
    conn.execute(
        "UPDATE deleted_items SET purged_at = ?1 WHERE entity_kind = ?2 AND entity_id = ?3",
        rusqlite::params![now_iso(), t.name, id],
    )
    .ok();
    audit::log(conn, "purge", t.name, Some(id), None);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use serde_json::json;

    fn setup() -> (Connection, [u8; 32]) {
        let c = Connection::open_in_memory().unwrap();
        db::migrate(&c).unwrap();
        let key: [u8; 32] = crypto::random_bytes(32).try_into().unwrap();
        (c, key)
    }

    #[test]
    fn crud_roundtrip_with_encryption() {
        let (c, key) = setup();
        let id = create(
            &c,
            &key,
            "patients",
            &json!({"status": "ativo", "full_name": "Paciente Exemplo A", "phone": "(00) 0000-0000"}),
            false,
        )
        .unwrap();
        // nome não pode estar em texto puro no banco
        let blob: Vec<u8> = c
            .query_row("SELECT data_enc FROM patients WHERE id = ?1", [&id], |r| r.get(0))
            .unwrap();
        assert!(!String::from_utf8_lossy(&blob).contains("Paciente Exemplo A"));
        let got = get(&c, &key, "patients", &id).unwrap();
        assert_eq!(got["full_name"], "Paciente Exemplo A");
        assert_eq!(got["status"], "ativo");
        update(&c, &key, "patients", &id, &json!({"status": "inativo", "full_name": "Paciente Exemplo A"})).unwrap();
        let got = get(&c, &key, "patients", &id).unwrap();
        assert_eq!(got["status"], "inativo");
    }

    #[test]
    fn soft_delete_restore_purge() {
        let (c, key) = setup();
        let id = create(&c, &key, "patients", &json!({"full_name": "X"}), false).unwrap();
        soft_delete(&c, "patients", &id).unwrap();
        assert!(list(&c, &key, "patients", &[], false).unwrap().is_empty());
        assert_eq!(list(&c, &key, "patients", &[], true).unwrap().len(), 1);
        restore(&c, "patients", &id).unwrap();
        assert_eq!(list(&c, &key, "patients", &[], false).unwrap().len(), 1);
        soft_delete(&c, "patients", &id).unwrap();
        purge(&c, "patients", &id).unwrap();
        assert!(list(&c, &key, "patients", &[], true).unwrap().is_empty());
    }

    #[test]
    fn finalized_entry_is_immutable() {
        let (c, key) = setup();
        let id = create(
            &c,
            &key,
            "clinical_entries",
            &json!({"status": "rascunho", "summary": "texto"}),
            false,
        )
        .unwrap();
        set_status(&c, "clinical_entries", &id, "finalizado").unwrap();
        let err = update(&c, &key, "clinical_entries", &id, &json!({"summary": "alterado"})).unwrap_err();
        assert!(err.contains("adendo"));
    }

    #[test]
    fn filter_column_allowlist() {
        let (c, key) = setup();
        let err = list(&c, &key, "patients", &[("nome; DROP TABLE".into(), "x".into())], false)
            .unwrap_err();
        assert!(err.contains("inválida"));
        assert!(list(&c, &key, "nao_existe", &[], false).is_err());
    }

    #[test]
    fn rows_from_another_key_are_skipped_not_fatal() {
        let (c, key) = setup();
        create(&c, &key, "patients", &json!({"full_name": "Legível"}), false).unwrap();
        // registro gravado com outra chave (ex.: chave anterior do app)
        let other: [u8; 32] = crypto::random_bytes(32).try_into().unwrap();
        create(&c, &other, "patients", &json!({"full_name": "Ilegível"}), false).unwrap();

        let rows = list(&c, &key, "patients", &[], false).unwrap();
        assert_eq!(rows.len(), 1, "a linha ilegível deve ser ignorada, não quebrar a lista");
        assert_eq!(rows[0]["full_name"], "Legível");
    }

    #[test]
    fn audit_has_no_content() {
        let (c, key) = setup();
        create(&c, &key, "patients", &json!({"full_name": "Sigiloso"}), false).unwrap();
        let count: i64 = c
            .query_row(
                "SELECT COUNT(*) FROM audit_events WHERE event_type = 'create'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
        let any: i64 = c
            .query_row(
                "SELECT COUNT(*) FROM audit_events WHERE detail LIKE '%Sigiloso%'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(any, 0);
    }
}
