//! Backup criptografado em arquivo único (.prbk) e restauração segura.
//!
//! Formato: `PRBK1` + JSON do header (sal KDF + chave envelopada) + `\n` +
//! ciphertext (XChaCha20-Poly1305 da carga). Carga = JSON { db: base64,
//! attachments: [{name, data: base64}] }. Antes do ciphertext gravamos o hash
//! BLAKE3 da carga em claro no header para verificação de integridade.

use std::fs;
use std::path::Path;

use base64::Engine;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{audit, auth, crypto};

const MAGIC: &[u8] = b"PRBK1\n";

#[derive(Serialize, Deserialize)]
struct Header {
    kdf_salt: String,
    wrapped_key: String,
    payload_hash: String,
    created_at: String,
}

fn b64(data: &[u8]) -> String {
    base64::engine::general_purpose::STANDARD.encode(data)
}

fn unb64(s: &str) -> Result<Vec<u8>, String> {
    base64::engine::general_purpose::STANDARD
        .decode(s)
        .map_err(|_| "Backup corrompido.".to_string())
}

pub fn create(
    conn: &Connection,
    key: &[u8; 32],
    attachments_dir: &Path,
    dest_path: &str,
) -> Result<(), String> {
    let user = auth::get_user(conn)?.ok_or("Nenhum usuário configurado.")?;
    // Snapshot consistente do banco via VACUUM INTO.
    let tmp = std::env::temp_dir().join(format!("prbk-{}.db", uuid::Uuid::new_v4()));
    let tmp_str = tmp.to_string_lossy().replace('\'', "''");
    conn.execute(&format!("VACUUM INTO '{}'", tmp_str), [])
        .map_err(|_| "Erro ao gerar cópia do banco.")?;
    let db_bytes = fs::read(&tmp).map_err(|_| "Erro ao ler cópia do banco.")?;
    let _ = fs::remove_file(&tmp);

    let mut atts = Vec::new();
    if attachments_dir.exists() {
        for entry in fs::read_dir(attachments_dir).map_err(|_| "Erro ao ler anexos.")? {
            let entry = entry.map_err(|_| "Erro ao ler anexos.")?;
            if entry.path().is_file() {
                let name = entry.file_name().to_string_lossy().to_string();
                let data = fs::read(entry.path()).map_err(|_| "Erro ao ler anexo.")?;
                atts.push(json!({ "name": name, "data": b64(&data) }));
            }
        }
    }
    let payload = serde_json::to_vec(&json!({ "db": b64(&db_bytes), "attachments": atts }))
        .map_err(|_| "Erro ao montar backup.")?;
    let payload_hash = blake3::hash(&payload).to_hex().to_string();
    let ct = crypto::encrypt(key, &payload).map_err(|e| e.to_string())?;
    let header = Header {
        kdf_salt: b64(&user.kdf_salt),
        wrapped_key: b64(&user.wrapped_key),
        payload_hash,
        created_at: crate::now_iso(),
    };
    let mut out = Vec::new();
    out.extend_from_slice(MAGIC);
    out.extend_from_slice(serde_json::to_string(&header).unwrap().as_bytes());
    out.push(b'\n');
    out.extend_from_slice(&ct);
    fs::write(dest_path, &out).map_err(|_| "Erro ao gravar arquivo de backup.")?;

    // Verificação: relê e confere integridade antes de concluir.
    let written = fs::read(dest_path).map_err(|_| "Erro ao verificar backup.")?;
    let (_, payload2) = decrypt_backup(&written, None, Some(key))?;
    if blake3::hash(&payload2).to_hex().to_string() != blake3::hash(&payload).to_hex().to_string() {
        return Err("Verificação de integridade do backup falhou.".into());
    }
    audit::log(conn, "backup_create", "backup", None, None);
    Ok(())
}

/// Decifra um arquivo de backup usando senha (restauração) ou chave já aberta (verificação).
fn decrypt_backup(
    raw: &[u8],
    password: Option<&str>,
    key: Option<&[u8; 32]>,
) -> Result<(Header, Vec<u8>), String> {
    if !raw.starts_with(MAGIC) {
        return Err("Arquivo não é um backup do PsicoRegistro.".into());
    }
    let rest = &raw[MAGIC.len()..];
    let nl = rest
        .iter()
        .position(|&b| b == b'\n')
        .ok_or("Backup corrompido.")?;
    let header: Header =
        serde_json::from_slice(&rest[..nl]).map_err(|_| "Backup corrompido.")?;
    let ct = &rest[nl + 1..];
    let master: [u8; 32] = if let Some(k) = key {
        *k
    } else {
        let password = password.ok_or("Senha necessária.")?;
        let salt = unb64(&header.kdf_salt)?;
        let derived = crypto::derive_key(password, &salt).map_err(|e| e.to_string())?;
        let wrapped = unb64(&header.wrapped_key)?;
        crypto::decrypt(&derived, &wrapped)
            .map_err(|_| "Senha incorreta para este backup.")?
            .try_into()
            .map_err(|_| "Backup corrompido.".to_string())?
    };
    let payload = crypto::decrypt(&master, ct).map_err(|_| "Senha incorreta ou backup corrompido.")?;
    if blake3::hash(&payload).to_hex().to_string() != header.payload_hash {
        return Err("Falha de integridade do backup.".into());
    }
    Ok((header, payload))
}

/// Restaura um backup. Nunca substitui o banco atual sem antes criar uma cópia
/// de segurança em `data_dir/pre-restore-<timestamp>/`.
pub fn restore(
    data_dir: &Path,
    db_path: &Path,
    attachments_dir: &Path,
    src_path: &str,
    password: &str,
) -> Result<(), String> {
    let raw = fs::read(src_path).map_err(|_| "Não foi possível ler o arquivo de backup.")?;
    let (_, payload) = decrypt_backup(&raw, Some(password), None)?;
    let parsed: serde_json::Value =
        serde_json::from_slice(&payload).map_err(|_| "Backup corrompido.")?;
    let db_bytes = unb64(parsed["db"].as_str().ok_or("Backup corrompido.")?)?;

    // Cópia de segurança do estado atual.
    let stamp = chrono::Utc::now().format("%Y%m%d-%H%M%S");
    let safety = data_dir.join(format!("pre-restore-{}", stamp));
    fs::create_dir_all(&safety).map_err(|_| "Erro ao criar cópia de segurança.")?;
    if db_path.exists() {
        fs::copy(db_path, safety.join("psicoregistro.db"))
            .map_err(|_| "Erro ao copiar banco atual.")?;
    }
    if attachments_dir.exists() {
        let att_safety = safety.join("attachments");
        fs::create_dir_all(&att_safety).ok();
        if let Ok(rd) = fs::read_dir(attachments_dir) {
            for e in rd.flatten() {
                if e.path().is_file() {
                    let _ = fs::copy(e.path(), att_safety.join(e.file_name()));
                }
            }
        }
    }

    // Substitui banco e anexos.
    fs::write(db_path, db_bytes).map_err(|_| "Erro ao gravar banco restaurado.")?;
    // remove WAL/SHM antigos para evitar estado inconsistente
    let _ = fs::remove_file(db_path.with_extension("db-wal"));
    let _ = fs::remove_file(db_path.with_extension("db-shm"));
    fs::create_dir_all(attachments_dir).ok();
    if let Ok(rd) = fs::read_dir(attachments_dir) {
        for e in rd.flatten() {
            if e.path().is_file() {
                let _ = fs::remove_file(e.path());
            }
        }
    }
    if let Some(atts) = parsed["attachments"].as_array() {
        for a in atts {
            let name = a["name"].as_str().unwrap_or_default();
            if name.is_empty() || name.contains(['/', '\\']) || name.contains("..") {
                continue;
            }
            let data = unb64(a["data"].as_str().unwrap_or_default())?;
            fs::write(attachments_dir.join(name), data).map_err(|_| "Erro ao gravar anexo.")?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    #[test]
    fn backup_and_restore_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("psicoregistro.db");
        let att_dir = dir.path().join("attachments");
        fs::create_dir_all(&att_dir).unwrap();
        fs::write(att_dir.join("abc.bin"), b"blob-cifrado").unwrap();

        let conn = db::open(&db_path).unwrap();
        db::migrate(&conn).unwrap();
        let key = auth::create_user(&conn, "senha-backup-1").unwrap();
        crate::entities::create(
            &conn,
            &key,
            "patients",
            &serde_json::json!({"full_name": "Paciente Exemplo A"}),
            false,
        )
        .unwrap();

        let bkp = dir.path().join("teste.prbk");
        create(&conn, &key, &att_dir, bkp.to_str().unwrap()).unwrap();
        drop(conn);

        // apaga tudo e restaura
        fs::remove_file(&db_path).unwrap();
        fs::remove_file(att_dir.join("abc.bin")).unwrap();
        restore(dir.path(), &db_path, &att_dir, bkp.to_str().unwrap(), "senha-backup-1").unwrap();

        let conn2 = db::open(&db_path).unwrap();
        let key2 = auth::unlock(&conn2, "senha-backup-1").unwrap();
        let rows = crate::entities::list(&conn2, &key2, "patients", &[], false).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0]["full_name"], "Paciente Exemplo A");
        assert!(att_dir.join("abc.bin").exists());
        // cópia de segurança criada
        let pre: Vec<_> = fs::read_dir(dir.path())
            .unwrap()
            .flatten()
            .filter(|e| e.file_name().to_string_lossy().starts_with("pre-restore-"))
            .collect();
        assert_eq!(pre.len(), 1);
    }

    #[test]
    fn restore_wrong_password_fails() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("psicoregistro.db");
        let att_dir = dir.path().join("attachments");
        let conn = db::open(&db_path).unwrap();
        db::migrate(&conn).unwrap();
        let key = auth::create_user(&conn, "senha-backup-1").unwrap();
        let bkp = dir.path().join("t.prbk");
        create(&conn, &key, &att_dir, bkp.to_str().unwrap()).unwrap();
        assert!(restore(dir.path(), &db_path, &att_dir, bkp.to_str().unwrap(), "errada").is_err());
    }
}
