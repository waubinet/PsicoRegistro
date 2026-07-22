//! Autenticação local: senha-mestra, envelope de chave e lockout progressivo.
//!
//! Envelope: uma chave-mestra aleatória cifra os dados; ela é guardada em
//! `users.wrapped_key`, cifrada pela chave derivada da senha (Argon2id +
//! `kdf_salt`). Trocar a senha reencripta apenas o envelope.

use chrono::{DateTime, Duration, Utc};
use rusqlite::{params, Connection, OptionalExtension};

use crate::crypto;
use crate::now_iso;

pub struct UserRow {
    pub id: String,
    pub password_phc: String,
    pub kdf_salt: Vec<u8>,
    pub wrapped_key: Vec<u8>,
    pub failed_attempts: i64,
    pub locked_until: Option<String>,
}

/// Modo sem senha: obtém (ou cria na primeira execução) a chave-mestra guardada
/// localmente em `app_settings`. A aplicação abre direto, sem tela de senha.
///
/// Os dados seguem cifrados em disco, mas a chave acompanha a máquina — quem
/// tiver acesso aos arquivos consegue lê-los. As funções de senha abaixo
/// permanecem no código caso se queira reativar a proteção.
pub fn local_key(conn: &Connection) -> Result<[u8; 32], String> {
    use base64::Engine;
    let enc = base64::engine::general_purpose::STANDARD;

    if let Ok(b64) = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'master_key'",
        [],
        |r| r.get::<_, String>(0),
    ) {
        if let Ok(bytes) = enc.decode(b64) {
            if let Ok(k) = <[u8; 32]>::try_from(bytes.as_slice()) {
                return Ok(k);
            }
        }
    }

    let key: [u8; 32] = crypto::random_bytes(32)
        .try_into()
        .map_err(|_| "Falha ao gerar chave.".to_string())?;
    conn.execute(
        "INSERT INTO app_settings (key, value, updated_at) VALUES ('master_key', ?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?1, updated_at = ?2",
        params![enc.encode(key), now_iso()],
    )
    .map_err(|_| "Erro ao salvar a chave local.".to_string())?;
    Ok(key)
}

pub fn get_user(conn: &Connection) -> Result<Option<UserRow>, String> {
    conn.query_row(
        "SELECT id, password_phc, kdf_salt, wrapped_key, failed_attempts, locked_until FROM users LIMIT 1",
        [],
        |r| {
            Ok(UserRow {
                id: r.get(0)?,
                password_phc: r.get(1)?,
                kdf_salt: r.get(2)?,
                wrapped_key: r.get(3)?,
                failed_attempts: r.get(4)?,
                locked_until: r.get(5)?,
            })
        },
    )
    .optional()
    .map_err(|_| "Erro ao consultar usuário.".to_string())
}

pub fn create_user(conn: &Connection, password: &str) -> Result<[u8; 32], String> {
    if get_user(conn)?.is_some() {
        return Err("Usuário já configurado.".into());
    }
    if password.chars().count() < 8 {
        return Err("A senha deve ter pelo menos 8 caracteres.".into());
    }
    let phc = crypto::hash_password(password).map_err(|e| e.to_string())?;
    let salt = crypto::random_bytes(16);
    let derived = crypto::derive_key(password, &salt).map_err(|e| e.to_string())?;
    let master: [u8; 32] = crypto::random_bytes(32).try_into().unwrap();
    let wrapped = crypto::encrypt(&derived, &master).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO users (id, password_phc, kdf_salt, wrapped_key, failed_attempts, locked_until, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 0, NULL, ?5, ?5)",
        params![uuid::Uuid::new_v4().to_string(), phc, salt, wrapped, now_iso()],
    )
    .map_err(|_| "Erro ao criar usuário.".to_string())?;
    Ok(master)
}

/// Segundos de espera após `attempts` falhas (progressivo, máx. 15 min).
pub fn lockout_seconds(attempts: i64) -> i64 {
    if attempts < 3 {
        0
    } else {
        (2i64.pow((attempts - 2).min(10) as u32) * 5).min(900)
    }
}

pub fn unlock(conn: &Connection, password: &str) -> Result<[u8; 32], String> {
    let user = get_user(conn)?.ok_or("Nenhum usuário configurado.")?;
    if let Some(ref until) = user.locked_until {
        if let Ok(t) = DateTime::parse_from_rfc3339(until) {
            let now = Utc::now();
            if t > now {
                let secs = (t.with_timezone(&Utc) - now).num_seconds().max(1);
                return Err(format!("Muitas tentativas. Aguarde {} segundos.", secs));
            }
        }
    }
    if !crypto::verify_password(password, &user.password_phc) {
        let attempts = user.failed_attempts + 1;
        let wait = lockout_seconds(attempts);
        let locked_until = if wait > 0 {
            Some((Utc::now() + Duration::seconds(wait)).to_rfc3339())
        } else {
            None
        };
        conn.execute(
            "UPDATE users SET failed_attempts = ?1, locked_until = ?2, updated_at = ?3 WHERE id = ?4",
            params![attempts, locked_until, now_iso(), user.id],
        )
        .ok();
        return Err("Senha incorreta.".into());
    }
    conn.execute(
        "UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = ?1 WHERE id = ?2",
        params![now_iso(), user.id],
    )
    .ok();
    let derived = crypto::derive_key(password, &user.kdf_salt).map_err(|e| e.to_string())?;
    let master = crypto::decrypt(&derived, &user.wrapped_key)
        .map_err(|_| "Não foi possível decifrar a chave.".to_string())?;
    master.try_into().map_err(|_| "Chave inválida.".to_string())
}

pub fn verify_only(conn: &Connection, password: &str) -> Result<bool, String> {
    let user = get_user(conn)?.ok_or("Nenhum usuário configurado.")?;
    Ok(crypto::verify_password(password, &user.password_phc))
}

pub fn change_password(conn: &Connection, old: &str, new: &str) -> Result<(), String> {
    if new.chars().count() < 8 {
        return Err("A nova senha deve ter pelo menos 8 caracteres.".into());
    }
    let master = unlock(conn, old)?;
    let user = get_user(conn)?.ok_or("Nenhum usuário configurado.")?;
    let phc = crypto::hash_password(new).map_err(|e| e.to_string())?;
    let salt = crypto::random_bytes(16);
    let derived = crypto::derive_key(new, &salt).map_err(|e| e.to_string())?;
    let wrapped = crypto::encrypt(&derived, &master).map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE users SET password_phc = ?1, kdf_salt = ?2, wrapped_key = ?3, updated_at = ?4 WHERE id = ?5",
        params![phc, salt, wrapped, now_iso(), user.id],
    )
    .map_err(|_| "Erro ao atualizar senha.".to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    fn test_conn() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        db::migrate(&c).unwrap();
        c
    }

    #[test]
    fn create_and_unlock() {
        let c = test_conn();
        let k1 = create_user(&c, "senha-mestra-1").unwrap();
        let k2 = unlock(&c, "senha-mestra-1").unwrap();
        assert_eq!(k1, k2);
    }

    #[test]
    fn wrong_password_and_lockout() {
        let c = test_conn();
        create_user(&c, "senha-mestra-1").unwrap();
        for _ in 0..3 {
            assert!(unlock(&c, "errada").is_err());
        }
        // após 3 falhas o lockout entra em vigor
        let err = unlock(&c, "senha-mestra-1").unwrap_err();
        assert!(err.contains("Aguarde"), "esperava lockout, obteve: {}", err);
    }

    #[test]
    fn lockout_progression() {
        assert_eq!(lockout_seconds(0), 0);
        assert_eq!(lockout_seconds(2), 0);
        assert_eq!(lockout_seconds(3), 10);
        assert_eq!(lockout_seconds(4), 20);
        assert_eq!(lockout_seconds(20), 900);
    }

    #[test]
    fn change_password_keeps_master_key() {
        let c = test_conn();
        let k1 = create_user(&c, "senha-original").unwrap();
        change_password(&c, "senha-original", "senha-nova-123").unwrap();
        assert!(unlock(&c, "senha-original").is_err());
        let k2 = unlock(&c, "senha-nova-123").unwrap();
        assert_eq!(k1, k2, "a chave-mestra deve permanecer a mesma");
    }

    #[test]
    fn short_password_rejected() {
        let c = test_conn();
        assert!(create_user(&c, "curta").is_err());
    }
}
