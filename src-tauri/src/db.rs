//! Esquema do banco, migrações versionadas e especificação das tabelas de entidade.
//!
//! Modelo de armazenamento: cada entidade tem colunas estruturais em texto puro
//! (FKs, status, tipos, datas — necessárias para filtros e integridade) e uma
//! coluna `data_enc BLOB` com o JSON dos campos sensíveis, cifrado com
//! XChaCha20-Poly1305. Nomes, textos clínicos, contatos e escores ficam sempre
//! dentro de `data_enc`.

use rusqlite::Connection;

pub struct TableSpec {
    pub name: &'static str,
    /// Colunas em texto puro permitidas em create/update/filtros (além das padrão).
    pub plain: &'static [&'static str],
    /// Tabela pertence à área neuropsicológica restrita.
    pub restricted: bool,
}

pub const TABLES: &[TableSpec] = &[
    TableSpec { name: "professional_profiles", plain: &[], restricted: false },
    TableSpec { name: "patients", plain: &["status"], restricted: false },
    TableSpec { name: "patient_guardians", plain: &["patient_id"], restricted: false },
    TableSpec { name: "clinical_cases", plain: &["patient_id", "case_type", "status", "start_date", "end_date"], restricted: false },
    TableSpec { name: "clinical_entries", plain: &["case_id", "entry_type", "status", "entry_date", "followup_date"], restricted: false },
    TableSpec { name: "clinical_entry_addenda", plain: &["entry_id"], restricted: false },
    TableSpec { name: "neuropsych_assessments", plain: &["case_id", "stage", "status", "session_date"], restricted: false },
    TableSpec { name: "neuropsych_instruments", plain: &[], restricted: false },
    TableSpec { name: "restricted_neuropsych_records", plain: &["case_id", "applied_date"], restricted: true },
    TableSpec { name: "schools", plain: &["status", "network"], restricted: false },
    TableSpec { name: "school_classes", plain: &["school_id"], restricted: false },
    TableSpec { name: "students", plain: &["school_id", "status", "grade", "shift"], restricted: false },
    TableSpec { name: "student_guardians", plain: &["student_id"], restricted: false },
    TableSpec { name: "school_records", plain: &["student_id", "school_id", "activity_type", "status", "record_date", "followup_date", "restriction_level"], restricted: false },
    TableSpec { name: "institutional_school_records", plain: &["school_id", "record_type", "record_date"], restricted: false },
    TableSpec { name: "record_participants", plain: &["record_id", "record_kind"], restricted: false },
    TableSpec { name: "referrals", plain: &["student_id", "school_id", "status", "referral_date", "area", "next_check_date"], restricted: false },
    TableSpec { name: "reminders", plain: &["due_date", "status", "reminder_type", "priority", "linked_kind", "linked_id"], restricted: false },
    TableSpec { name: "attachments", plain: &["owner_kind", "owner_id", "ext", "size_bytes", "hash", "restricted"], restricted: false },
    TableSpec { name: "exports", plain: &["export_type", "target_kind", "target_id"], restricted: false },
];

pub fn spec(table: &str) -> Option<&'static TableSpec> {
    TABLES.iter().find(|t| t.name == table)
}

const MIGRATIONS: &[(&str, &str)] = &[(
    "0001_initial",
    r#"
    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        password_phc TEXT NOT NULL,
        kdf_salt BLOB NOT NULL,
        wrapped_key BLOB NOT NULL,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    CREATE TABLE audit_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        entity_kind TEXT NOT NULL,
        entity_id TEXT,
        detail TEXT,
        created_at TEXT NOT NULL
    );
    CREATE INDEX idx_audit_created ON audit_events(created_at);
    CREATE TABLE deleted_items (
        id TEXT PRIMARY KEY,
        entity_kind TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        deleted_at TEXT NOT NULL,
        purged_at TEXT
    );
    "#,
)];

/// SQL padrão de uma tabela de entidade.
fn entity_ddl(t: &TableSpec) -> String {
    let mut cols = String::new();
    for c in t.plain {
        cols.push_str(&format!("{} TEXT,\n", c));
    }
    format!(
        "CREATE TABLE IF NOT EXISTS {name} (
            id TEXT PRIMARY KEY,
            {cols}
            data_enc BLOB NOT NULL,
            is_demo INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        );",
        name = t.name,
        cols = cols
    )
}

pub fn open(path: &std::path::Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    Ok(conn)
}

pub fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS database_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);",
    )?;
    for (version, sql) in MIGRATIONS {
        let done: bool = conn
            .prepare("SELECT 1 FROM database_migrations WHERE version = ?1")?
            .exists([version])?;
        if !done {
            conn.execute_batch(sql)?;
            conn.execute(
                "INSERT INTO database_migrations (version, applied_at) VALUES (?1, ?2)",
                rusqlite::params![version, crate::now_iso()],
            )?;
        }
    }
    // Tabelas de entidade (idempotente).
    for t in TABLES {
        conn.execute_batch(&entity_ddl(t))?;
    }
    // Índices de pesquisa frequente.
    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_cases_patient ON clinical_cases(patient_id);
         CREATE INDEX IF NOT EXISTS idx_entries_case ON clinical_entries(case_id);
         CREATE INDEX IF NOT EXISTS idx_entries_date ON clinical_entries(entry_date);
         CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
         CREATE INDEX IF NOT EXISTS idx_srecords_student ON school_records(student_id);
         CREATE INDEX IF NOT EXISTS idx_srecords_date ON school_records(record_date);
         CREATE INDEX IF NOT EXISTS idx_referrals_student ON referrals(student_id);
         CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
         CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_date);
         CREATE INDEX IF NOT EXISTS idx_attach_owner ON attachments(owner_kind, owner_id);",
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrate_creates_all_tables() {
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();
        for t in TABLES {
            let ok: bool = conn
                .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?1")
                .unwrap()
                .exists([t.name])
                .unwrap();
            assert!(ok, "tabela ausente: {}", t.name);
        }
        // idempotência
        migrate(&conn).unwrap();
    }
}
