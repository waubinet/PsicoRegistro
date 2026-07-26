//! Autenticação local: senha-mestra, envelope de chave e lockout progressivo.
//!
//! Envelope: uma chave-mestra aleatória cifra os dados; ela é guardada em
//! `users.wrapped_key`, cifrada pela chave derivada da senha (Argon2id +
//! `kdf_salt`). Trocar a senha reencripta apenas o envelope.

use base64::Engine as _;
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

/// Como a chave-mestra está guardada neste banco.
#[derive(Debug, PartialEq, Eq, Clone, Copy, serde::Serialize)]
pub enum ProtecaoChave {
    /// Protegida pela DPAPI do Windows (conta do usuário atual).
    Dpapi,
    /// Ainda em texto puro — DPAPI indisponível ou migração abortada.
    TextoPuro,
}

fn b64() -> base64::engine::general_purpose::GeneralPurpose {
    base64::engine::general_purpose::STANDARD
}

fn ler_config(conn: &Connection, chave: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM app_settings WHERE key = ?1",
        [chave],
        |r| r.get::<_, String>(0),
    )
    .ok()
}

fn gravar_config(conn: &Connection, chave: &str, valor: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO app_settings (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
        params![chave, valor, now_iso()],
    )
    .map(|_| ())
    .map_err(|_| "Erro ao gravar configuração.".to_string())
}

/// Confere que a chave decifra os registros já existentes (canário).
/// Sem registros, considera válida — não há o que contradizer.
fn chave_le_dados_existentes(conn: &Connection, key: &[u8; 32]) -> bool {
    for t in crate::db::TABLES {
        let sql = format!("SELECT data_enc FROM {} LIMIT 1", t.name);
        if let Ok(blob) = conn.query_row(&sql, [], |r| r.get::<_, Vec<u8>>(0)) {
            return crypto::decrypt(key, &blob).is_ok();
        }
    }
    true
}

/// Modo sem senha: devolve a chave-mestra, preferindo a versão protegida por
/// DPAPI. A aplicação abre direto, sem tela de senha e sem interação.
///
/// Ordem: (1) blob DPAPI; (2) chave em texto puro, migrando-a para DPAPI;
/// (3) primeira execução — gera já protegida.
pub fn local_key(conn: &Connection) -> Result<[u8; 32], String> {
    // (1) já protegida
    if let Some(b64_blob) = ler_config(conn, "protected_master_key") {
        if let Ok(blob) = b64().decode(&b64_blob) {
            match crate::dpapi::unprotect(&blob) {
                Ok(bytes) => {
                    if let Ok(k) = <[u8; 32]>::try_from(bytes.as_slice()) {
                        return Ok(k);
                    }
                    return Err("Chave protegida com tamanho inválido.".into());
                }
                Err(e) => {
                    // Blob de outra conta/máquina: se a versão em claro ainda
                    // existir, seguimos por ela; senão, é falha real.
                    if ler_config(conn, "master_key").is_none() {
                        return Err(format!(
                            "Não foi possível abrir a chave protegida nesta conta do Windows. {e}"
                        ));
                    }
                }
            }
        }
    }

    // (2) texto puro → migra
    if let Some(b64_key) = ler_config(conn, "master_key") {
        let bytes = b64()
            .decode(&b64_key)
            .map_err(|_| "Chave local corrompida.".to_string())?;
        let key: [u8; 32] = bytes
            .as_slice()
            .try_into()
            .map_err(|_| "Chave local com tamanho inválido.".to_string())?;
        // migração é best-effort: se falhar, o app continua funcionando
        let _ = migrar_para_dpapi(conn, &key);
        return Ok(key);
    }

    // (3) primeira execução
    let key: [u8; 32] = crypto::random_bytes(32)
        .try_into()
        .map_err(|_| "Falha ao gerar chave.".to_string())?;
    match crate::dpapi::protect(&key) {
        Ok(blob) => {
            gravar_config(conn, "protected_master_key", &b64().encode(&blob))?;
            crate::audit::log(conn, "key_protected", "session", None, Some("nova"));
        }
        Err(_) => {
            gravar_config(conn, "master_key", &b64().encode(key))?;
        }
    }
    Ok(key)
}

/// Migra a chave em texto puro para DPAPI seguindo validação estrita.
/// Só remove `master_key` depois que tudo confere. Qualquer falha aborta sem
/// tocar em registro algum.
pub fn migrar_para_dpapi(conn: &Connection, key: &[u8; 32]) -> Result<bool, String> {
    // 3. a chave atual realmente lê os dados existentes?
    if !chave_le_dados_existentes(conn, key) {
        return Err("A chave atual não decifra os registros existentes; migração abortada.".into());
    }
    // 4/5. protege e grava
    let blob = crate::dpapi::protect(key)?;
    gravar_config(conn, "protected_master_key", &b64().encode(&blob))?;

    // 6/7. recupera e confere que é a MESMA chave, e que continua lendo
    let recuperada = crate::dpapi::unprotect(&blob)?;
    let igual = recuperada.as_slice() == key.as_slice();
    if !igual {
        conn.execute(
            "DELETE FROM app_settings WHERE key = 'protected_master_key'",
            [],
        )
        .ok();
        return Err("Chave recuperada difere da original; migração abortada.".into());
    }
    let k2: [u8; 32] = recuperada
        .as_slice()
        .try_into()
        .map_err(|_| "Chave recuperada inválida.".to_string())?;
    if !chave_le_dados_existentes(conn, &k2) {
        conn.execute(
            "DELETE FROM app_settings WHERE key = 'protected_master_key'",
            [],
        )
        .ok();
        return Err("Validação de leitura falhou; migração abortada.".into());
    }

    // 8. só agora remove a versão em texto puro
    conn.execute("DELETE FROM app_settings WHERE key = 'master_key'", [])
        .map_err(|_| "Erro ao remover a chave em texto puro.".to_string())?;
    // 9. auditoria sem a chave
    crate::audit::log(conn, "key_protected", "session", None, Some("migrada"));
    Ok(true)
}

/// Como a chave está guardada agora (para exibir em Configurações).
pub fn protecao_atual(conn: &Connection) -> ProtecaoChave {
    if ler_config(conn, "master_key").is_some() {
        ProtecaoChave::TextoPuro
    } else if ler_config(conn, "protected_master_key").is_some() {
        ProtecaoChave::Dpapi
    } else {
        ProtecaoChave::TextoPuro
    }
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

    /// A chave em texto puro é migrada para DPAPI preservando os dados.
    #[test]
    fn migra_chave_para_dpapi_preservando_dados() {
        use base64::Engine;
        let c = test_conn();
        let enc = base64::engine::general_purpose::STANDARD;

        // estado "antigo": chave em texto puro + um registro cifrado com ela
        let antiga: [u8; 32] = crypto::random_bytes(32).try_into().unwrap();
        c.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES ('master_key', ?1, ?2)",
            params![enc.encode(antiga), now_iso()],
        )
        .unwrap();
        let id = crate::entities::create(
            &c,
            &antiga,
            "patients",
            &serde_json::json!({"full_name": "Paciente Exemplo A"}),
            false,
        )
        .unwrap();

        // abrir o app dispara a migração
        let obtida = local_key(&c).unwrap();
        assert_eq!(obtida, antiga, "a MESMA chave deve ser preservada");
        assert_eq!(protecao_atual(&c), ProtecaoChave::Dpapi);

        // texto puro removido, blob protegido presente
        assert!(
            ler_config(&c, "master_key").is_none(),
            "chave em claro deve sair"
        );
        let blob_b64 = ler_config(&c, "protected_master_key").expect("blob DPAPI");
        assert!(
            !blob_b64.contains(&enc.encode(antiga)),
            "blob não pode conter a chave"
        );

        // dado anterior continua legível
        let row = crate::entities::get(&c, &obtida, "patients", &id).unwrap();
        assert_eq!(row["full_name"], "Paciente Exemplo A");

        // reabrir usa o blob e devolve a mesma chave
        assert_eq!(local_key(&c).unwrap(), antiga);
    }

    /// Se a chave não decifra os dados, a migração aborta sem remover nada.
    #[test]
    fn migracao_aborta_quando_chave_nao_le_dados() {
        let c = test_conn();
        let boa: [u8; 32] = crypto::random_bytes(32).try_into().unwrap();
        crate::entities::create(
            &c,
            &boa,
            "patients",
            &serde_json::json!({"full_name": "X"}),
            false,
        )
        .unwrap();

        let errada: [u8; 32] = crypto::random_bytes(32).try_into().unwrap();
        let r = migrar_para_dpapi(&c, &errada);
        assert!(r.is_err(), "deve abortar");
        assert!(
            ler_config(&c, "protected_master_key").is_none(),
            "não deve deixar blob para trás"
        );
    }

    /// Primeira execução já nasce protegida, sem chave em texto puro.
    #[test]
    fn primeira_execucao_nasce_protegida() {
        let c = test_conn();
        let k = local_key(&c).unwrap();
        assert_eq!(protecao_atual(&c), ProtecaoChave::Dpapi);
        assert!(ler_config(&c, "master_key").is_none());
        assert_eq!(local_key(&c).unwrap(), k, "reabrir devolve a mesma chave");
    }

    /// A auditoria registra o evento sem jamais gravar a chave.
    #[test]
    fn auditoria_nao_contem_a_chave() {
        use base64::Engine;
        let c = test_conn();
        let enc = base64::engine::general_purpose::STANDARD;
        let k: [u8; 32] = crypto::random_bytes(32).try_into().unwrap();
        c.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES ('master_key', ?1, ?2)",
            params![enc.encode(k), now_iso()],
        )
        .unwrap();
        local_key(&c).unwrap();

        let alvo = enc.encode(k);
        let n: i64 = c
            .query_row(
                "SELECT COUNT(*) FROM audit_events WHERE COALESCE(detail,'') LIKE '%' || ?1 || '%'",
                [&alvo],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(n, 0, "a chave nunca pode aparecer na auditoria");
        let houve: i64 = c
            .query_row(
                "SELECT COUNT(*) FROM audit_events WHERE event_type = 'key_protected'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(houve, 1);
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
