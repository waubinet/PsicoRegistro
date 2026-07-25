//! Pesquisa global: decifra apenas campos de identificação e devolve resultados
//! mínimos (nome, tipo, data, situação) — nunca conteúdo clínico.

use rusqlite::Connection;
use serde_json::{json, Value};

use crate::entities;

fn norm(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .map(|c| match c {
            'á' | 'à' | 'â' | 'ã' => 'a',
            'é' | 'ê' => 'e',
            'í' => 'i',
            'ó' | 'ô' | 'õ' => 'o',
            'ú' | 'ü' => 'u',
            'ç' => 'c',
            _ => c,
        })
        .collect()
}

pub fn matches(haystack: &str, needle: &str) -> bool {
    norm(haystack).contains(&norm(needle))
}

/// Fontes da pesquisa: tabela, rótulo, campos que dão o nome do resultado e
/// campos adicionais pesquisáveis (marcadores, série, conteúdo dos registros…).
struct Fonte {
    tabela: &'static str,
    rotulo: &'static str,
    /// usados para exibir o nome do resultado
    nome: &'static [&'static str],
    /// pesquisáveis, mas nunca exibidos (inclui conteúdo de registros)
    extras: &'static [&'static str],
    /// campo de data preferencial
    data: &'static str,
}

const FONTES: &[Fonte] = &[
    Fonte { tabela: "patients", rotulo: "Paciente", nome: &["full_name", "social_name"],
        extras: &["cpf", "phone", "email", "tags", "occupation", "institution", "admin_notes"], data: "created_at" },
    Fonte { tabela: "students", rotulo: "Estudante", nome: &["full_name", "social_name"],
        extras: &["grade", "class_name", "enrollment", "tags", "homeroom_teacher", "demand_origin", "notes"], data: "created_at" },
    Fonte { tabela: "schools", rotulo: "Escola", nome: &["name"],
        extras: &["address", "principal", "pedagogical_coordinator", "inep_code", "phone", "notes"], data: "created_at" },
    Fonte { tabela: "clinical_cases", rotulo: "Caso clínico", nome: &["initial_demand"],
        extras: &["goals", "context", "notes", "demand_origin"], data: "start_date" },
    Fonte { tabela: "clinical_entries", rotulo: "Evolução", nome: &["theme"],
        extras: &["summary", "evolution", "session_objective", "procedures", "conduct", "tags", "author"], data: "entry_date" },
    Fonte { tabela: "school_records", rotulo: "Registro escolar", nome: &["objective"],
        extras: &["situation", "performed", "guidance", "requester", "participants", "immediate_result"], data: "record_date" },
    Fonte { tabela: "referrals", rotulo: "Encaminhamento", nome: &["destination"],
        extras: &["reason", "result", "notes", "guardian_informed"], data: "referral_date" },
    Fonte { tabela: "institutional_school_records", rotulo: "Ocorrência/registro institucional", nome: &["objective"],
        extras: &["narrative", "demand", "activity", "participants", "results", "situation"], data: "record_date" },
    Fonte { tabela: "reminders", rotulo: "Pendência", nome: &["title"],
        extras: &["description"], data: "due_date" },
];

pub fn global(conn: &Connection, key: &[u8; 32], query: &str) -> Result<Vec<Value>, String> {
    let q = query.trim();
    if q.len() < 2 {
        return Ok(vec![]);
    }

    // nomes de escolas, para dar contexto aos resultados de estudantes
    let mut escolas = std::collections::HashMap::new();
    if let Ok(rows) = entities::list(conn, key, "schools", &[], false) {
        for r in rows {
            if let (Some(id), Some(n)) = (r["id"].as_str(), r["name"].as_str()) {
                escolas.insert(id.to_string(), n.to_string());
            }
        }
    }

    let mut out = Vec::new();
    for f in FONTES {
        let rows = entities::list(conn, key, f.tabela, &[], false)?;
        for r in rows {
            let campo_bate = |c: &str| r[c].as_str().map(|s| matches(s, q)).unwrap_or(false);
            if !f.nome.iter().any(|c| campo_bate(c)) && !f.extras.iter().any(|c| campo_bate(c)) {
                continue;
            }
            let nome = f
                .nome
                .iter()
                .filter_map(|c| r[*c].as_str())
                .find(|s| !s.trim().is_empty())
                .unwrap_or("(sem título)");
            // contexto administrativo — nunca conteúdo clínico
            let detalhe = match f.tabela {
                "students" => {
                    let escola = r["school_id"].as_str().and_then(|s| escolas.get(s)).cloned().unwrap_or_default();
                    let serie = r["grade"].as_str().unwrap_or("");
                    [serie, escola.as_str()].iter().filter(|s| !s.is_empty()).cloned().collect::<Vec<_>>().join(" · ")
                }
                "school_records" | "institutional_school_records" | "referrals" => r["school_id"]
                    .as_str()
                    .and_then(|s| escolas.get(s))
                    .cloned()
                    .unwrap_or_default(),
                _ => String::new(),
            };
            let data = r[f.data]
                .as_str()
                .filter(|s| !s.is_empty())
                .or_else(|| r["created_at"].as_str())
                .unwrap_or("");
            // registro "pai" para a navegação (evolução → caso, registro → estudante…)
            let pai = match f.tabela {
                "clinical_entries" => r["case_id"].as_str(),
                "school_records" | "referrals" => r["student_id"].as_str(),
                "institutional_school_records" => r["school_id"].as_str(),
                _ => None,
            }
            .unwrap_or("");
            out.push(json!({
                "table": f.tabela,
                "kind": f.rotulo,
                "id": r["id"],
                "parent": pai,
                "name": nome,
                "detail": detalhe,
                "status": r["status"],
                "date": data,
            }));
            if out.len() >= 200 {
                return Ok(out);
            }
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accent_insensitive() {
        assert!(matches("José da Educação", "jose"));
        assert!(matches("São Paulo", "sao pa"));
        assert!(!matches("Maria", "jose"));
    }

    #[test]
    fn busca_em_campos_extras_sem_expor_conteudo() {
        use crate::{crypto, db, entities};
        use serde_json::json;
        let c = rusqlite::Connection::open_in_memory().unwrap();
        db::migrate(&c).unwrap();
        let key: [u8; 32] = crypto::random_bytes(32).try_into().unwrap();

        let escola = entities::create(&c, &key, "schools", &json!({"name": "Escola Modelo"}), false).unwrap();
        entities::create(&c, &key, "students", &json!({
            "school_id": escola, "full_name": "Estudante Teste",
            "grade": "3º ano", "tags": "alfabetizacao"
        }), false).unwrap();

        // acha por marcador (campo extra), não só por nome
        let r = global(&c, &key, "alfabetizacao").unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0]["name"], "Estudante Teste");
        // o resultado traz contexto administrativo (série · escola)
        assert!(r[0]["detail"].as_str().unwrap().contains("Escola Modelo"));
        // e não devolve o conteúdo pesquisado
        assert!(r[0].get("tags").is_none());

        // acha por série
        assert_eq!(global(&c, &key, "3º ano").unwrap().len(), 1);
    }
}
