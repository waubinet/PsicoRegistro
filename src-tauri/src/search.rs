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

pub fn global(conn: &Connection, key: &[u8; 32], query: &str) -> Result<Vec<Value>, String> {
    let q = query.trim();
    if q.len() < 2 {
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    let sources: &[(&str, &str, &[&str])] = &[
        ("patients", "Paciente", &["full_name", "social_name"]),
        ("students", "Estudante", &["full_name", "social_name"]),
        ("schools", "Escola", &["name"]),
        ("clinical_cases", "Caso clínico", &["initial_demand"]),
        ("reminders", "Pendência", &["title"]),
    ];
    for (table, label, fields) in sources {
        let rows = entities::list(conn, key, table, &[], false)?;
        for r in rows {
            let hit = fields.iter().any(|f| {
                r[*f].as_str().map(|s| matches(s, q)).unwrap_or(false)
            });
            if hit {
                let name = fields
                    .iter()
                    .filter_map(|f| r[*f].as_str())
                    .find(|s| !s.is_empty())
                    .unwrap_or("(sem nome)");
                out.push(json!({
                    "table": table,
                    "kind": label,
                    "id": r["id"],
                    "name": name,
                    "status": r["status"],
                    "date": r["created_at"],
                }));
            }
            if out.len() >= 50 {
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
}
