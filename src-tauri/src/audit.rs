//! Auditoria: registra apenas metadados (tipo de evento, entidade, id, data).
//! Nunca grava conteúdo clínico, senhas ou chaves.

use rusqlite::{params, Connection};

use crate::now_iso;

pub fn log(
    conn: &Connection,
    event_type: &str,
    entity_kind: &str,
    entity_id: Option<&str>,
    detail: Option<&str>,
) {
    let _ = conn.execute(
        "INSERT INTO audit_events (id, event_type, entity_kind, entity_id, detail, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            uuid::Uuid::new_v4().to_string(),
            event_type,
            entity_kind,
            entity_id,
            detail,
            now_iso()
        ],
    );
}

#[derive(serde::Serialize)]
pub struct AuditEvent {
    pub id: String,
    pub event_type: String,
    pub entity_kind: String,
    pub entity_id: Option<String>,
    pub detail: Option<String>,
    pub created_at: String,
}

pub fn list(
    conn: &Connection,
    limit: i64,
    offset: i64,
    event_type: Option<String>,
) -> Result<Vec<AuditEvent>, String> {
    let mut sql = String::from(
        "SELECT id, event_type, entity_kind, entity_id, detail, created_at FROM audit_events",
    );
    if event_type.is_some() {
        sql.push_str(" WHERE event_type = ?3");
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT ?1 OFFSET ?2");
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|_| "Erro na consulta de auditoria.")?;
    let map_row = |r: &rusqlite::Row| {
        Ok(AuditEvent {
            id: r.get(0)?,
            event_type: r.get(1)?,
            entity_kind: r.get(2)?,
            entity_id: r.get(3)?,
            detail: r.get(4)?,
            created_at: r.get(5)?,
        })
    };
    let rows = if let Some(et) = event_type {
        stmt.query_map(params![limit, offset, et], map_row)
    } else {
        stmt.query_map(params![limit, offset], map_row)
    }
    .map_err(|_| "Erro na consulta de auditoria.")?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}
