//! Teste de integração: executa a migração da chave sobre uma CÓPIA de um banco
//! real, verificando que os dados existentes continuam legíveis e que a chave em
//! texto puro só desaparece após a validação completa.
//!
//! O caminho da cópia vem de PSICOREGISTRO_DB_COPIA; sem ela, o teste é ignorado
//! (assim o CI não depende de banco local).

use psicoregistro_lib::{auth, db, entities};
use serde_json::json;

#[test]
fn migracao_sobre_copia_de_banco_real() {
    let caminho = std::env::var("PSICOREGISTRO_DB_COPIA").unwrap_or_default();
    if caminho.trim().is_empty() {
        eprintln!("PSICOREGISTRO_DB_COPIA não definida — teste ignorado");
        return;
    }
    let path = std::path::PathBuf::from(&caminho);
    assert!(path.exists(), "a cópia do banco deve existir: {caminho}");

    let conn = db::open(&path).expect("abrir banco");
    db::migrate(&conn).expect("migrar esquema");

    // Estado inicial: chave em texto puro (como nas versões anteriores).
    let antes = auth::protecao_atual(&conn);
    assert_eq!(
        antes,
        auth::ProtecaoChave::TextoPuro,
        "cópia deve começar em texto puro"
    );

    // Grava um registro com a chave atual, para servir de canário real.
    let chave_antes = auth::local_key(&conn).expect("chave");
    // local_key já migra; a partir daqui a proteção deve ser DPAPI
    assert_eq!(auth::protecao_atual(&conn), auth::ProtecaoChave::Dpapi);

    let id = entities::create(
        &conn,
        &chave_antes,
        "schools",
        &json!({"name": "Escola de Teste de Migração"}),
        false,
    )
    .expect("criar registro");

    // Reabre o banco: a chave deve vir do blob DPAPI e ler o que foi gravado.
    drop(conn);
    let conn2 = db::open(&path).expect("reabrir");
    let chave_depois = auth::local_key(&conn2).expect("chave após reabrir");
    assert_eq!(chave_depois, chave_antes, "mesma chave após proteção");

    let row = entities::get(&conn2, &chave_depois, "schools", &id).expect("ler registro");
    assert_eq!(row["name"], "Escola de Teste de Migração");

    // A chave em texto puro não pode mais existir.
    let restou: i64 = conn2
        .query_row(
            "SELECT COUNT(*) FROM app_settings WHERE key = 'master_key'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(restou, 0, "master_key em texto puro deve ter sido removida");
}
