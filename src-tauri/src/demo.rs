//! Dados de demonstração claramente fictícios. Nunca usa dados reais.

use rusqlite::Connection;
use serde_json::json;

use crate::db::TABLES;
use crate::entities;

pub fn seed(conn: &Connection, key: &[u8; 32]) -> Result<(), String> {
    let d = true; // is_demo
    let school = entities::create(conn, key, "schools", &json!({
        "name": "Escola Municipal Modelo (Demonstração)",
        "network": "municipal",
        "status": "ativa",
        "address": "Rua Fictícia, 000 — Bairro Exemplo",
        "phone": "(00) 0000-0000",
        "email": "contato@escola-modelo.exemplo",
        "principal": "Diretora Fictícia",
        "pedagogical_coordinator": "Coordenador Fictício",
        "shifts": "Matutino, Vespertino",
        "service_days": "Terças e quintas"
    }), d)?;
    let class = entities::create(conn, key, "school_classes", &json!({
        "school_id": school, "name": "3º Ano B (Demonstração)", "shift": "matutino"
    }), d)?;
    let student = entities::create(conn, key, "students", &json!({
        "school_id": school, "status": "em_acompanhamento", "grade": "3º ano", "shift": "matutino",
        "full_name": "Estudante Demonstração B",
        "birth_date": "2017-03-15",
        "class_id": class,
        "class_name": "3º Ano B",
        "homeroom_teacher": "Professora Fictícia",
        "demand_origin": "Encaminhamento da coordenação (exemplo)",
        "first_contact_date": "2026-02-10"
    }), d)?;
    entities::create(conn, key, "student_guardians", &json!({
        "student_id": student, "name": "Responsável Fictício", "relation": "Mãe (exemplo)",
        "phone": "(00) 00000-0000"
    }), d)?;
    entities::create(conn, key, "school_records", &json!({
        "student_id": student, "school_id": school, "activity_type": "escuta",
        "status": "finalizado", "record_date": "2026-03-05", "restriction_level": "padrao",
        "location": "Sala de atendimento", "requester": "Coordenação (exemplo)",
        "situation": "Registro de demonstração — situação fictícia.",
        "objective": "Exemplo de objetivo.",
        "performed": "Exemplo de escuta realizada (dados fictícios).",
        "immediate_result": "Exemplo de resultado."
    }), d)?;
    entities::create(conn, key, "referrals", &json!({
        "student_id": student, "school_id": school, "status": "sem_retorno",
        "referral_date": "2026-03-10", "area": "fonoaudiologia",
        "next_check_date": "2026-07-01",
        "destination": "Serviço Fictício de Fonoaudiologia",
        "reason": "Motivo de demonstração.",
        "guardian_informed": "Sim (exemplo)",
        "communication_method": "Bilhete (exemplo)"
    }), d)?;

    let patient = entities::create(conn, key, "patients", &json!({
        "status": "ativo",
        "full_name": "Paciente Exemplo A",
        "birth_date": "1990-05-20",
        "phone": "(00) 90000-0000",
        "email": "paciente.exemplo@exemplo.invalido",
        "occupation": "Ocupação fictícia",
        "emergency_contact": "Contato Fictício",
        "emergency_relation": "Amizade (exemplo)"
    }), d)?;
    let case = entities::create(conn, key, "clinical_cases", &json!({
        "patient_id": patient, "case_type": "psicoterapia", "status": "em_andamento",
        "start_date": "2026-02-01",
        "initial_demand": "Demanda de demonstração (fictícia).",
        "demand_origin": "Busca espontânea (exemplo)",
        "goals": "Objetivos fictícios de exemplo.",
        "modality": "presencial",
        "frequency": "Semanal"
    }), d)?;
    entities::create(conn, key, "clinical_entries", &json!({
        "case_id": case, "entry_type": "psicoterapia", "status": "finalizado",
        "entry_date": "2026-03-03",
        "start_time": "14:00", "end_time": "14:50",
        "modality": "presencial", "location": "Consultório (exemplo)",
        "theme": "Tema fictício de demonstração",
        "session_objective": "Objetivo fictício.",
        "procedures": "Procedimentos fictícios.",
        "summary": "Descrição sucinta fictícia, apenas para demonstração.",
        "evolution": "Evolução fictícia.",
        "next_plan": "Plano fictício."
    }), d)?;
    entities::create(conn, key, "clinical_entries", &json!({
        "case_id": case, "entry_type": "psicoterapia", "status": "rascunho",
        "entry_date": "2026-03-10",
        "theme": "Rascunho de demonstração"
    }), d)?;
    entities::create(conn, key, "reminders", &json!({
        "title": "Retorno do encaminhamento (demonstração)",
        "reminder_type": "verificacao_encaminhamento", "priority": "media",
        "due_date": "2026-07-25", "status": "pendente",
        "linked_kind": "students", "linked_id": student,
        "description": "Pendência fictícia de exemplo."
    }), d)?;
    Ok(())
}

pub fn clear(conn: &Connection) -> Result<u64, String> {
    let mut total = 0u64;
    for t in TABLES {
        let n = conn
            .execute(&format!("DELETE FROM {} WHERE is_demo = 1", t.name), [])
            .map_err(|_| "Erro ao remover dados de demonstração.")?;
        total += n as u64;
    }
    crate::audit::log(conn, "demo_clear", "demo", None, None);
    Ok(total)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{crypto, db};

    #[test]
    fn seed_and_clear() {
        let c = Connection::open_in_memory().unwrap();
        db::migrate(&c).unwrap();
        let key: [u8; 32] = crypto::random_bytes(32).try_into().unwrap();
        seed(&c, &key).unwrap();
        let n: i64 = c
            .query_row("SELECT COUNT(*) FROM patients WHERE is_demo = 1", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 1);
        let removed = clear(&c).unwrap();
        assert!(removed >= 10);
        let n: i64 = c.query_row("SELECT COUNT(*) FROM patients", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 0);
    }
}
