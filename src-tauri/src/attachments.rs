//! Anexos: validação de tipo/tamanho, criptografia em repouso e hash de integridade.

use std::fs;
use std::path::Path;

use rusqlite::Connection;
use serde_json::json;

use crate::{audit, crypto, entities};

pub const ALLOWED_EXT: &[&str] = &["pdf", "jpg", "jpeg", "png", "docx", "odt"];
pub const MAX_SIZE: u64 = 25 * 1024 * 1024; // 25 MB

pub fn validate_ext(name: &str) -> Result<String, String> {
    let ext = Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .ok_or("Arquivo sem extensão.")?;
    if ALLOWED_EXT.contains(&ext.as_str()) {
        Ok(ext)
    } else {
        Err("Tipo de arquivo não permitido. Aceitos: PDF, JPG, JPEG, PNG, DOCX, ODT.".into())
    }
}

pub fn add(
    conn: &Connection,
    key: &[u8; 32],
    attachments_dir: &Path,
    owner_kind: &str,
    owner_id: &str,
    src_path: &str,
    restricted: bool,
) -> Result<String, String> {
    let src = Path::new(src_path);
    let file_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Caminho inválido.")?
        .to_string();
    let ext = validate_ext(&file_name)?;
    let meta = fs::metadata(src).map_err(|_| "Não foi possível ler o arquivo.")?;
    if meta.len() > MAX_SIZE {
        return Err("Arquivo maior que 25 MB.".into());
    }
    let bytes = fs::read(src).map_err(|_| "Não foi possível ler o arquivo.")?;
    let hash = blake3::hash(&bytes).to_hex().to_string();
    let enc = crypto::encrypt(key, &bytes).map_err(|e| e.to_string())?;
    fs::create_dir_all(attachments_dir).map_err(|_| "Erro ao preparar diretório de anexos.")?;
    let id = entities::create(
        conn,
        key,
        "attachments",
        &json!({
            "owner_kind": owner_kind,
            "owner_id": owner_id,
            "ext": ext,
            "size_bytes": meta.len().to_string(),
            "hash": hash,
            "restricted": if restricted { "1" } else { "0" },
            "original_name": file_name,
        }),
        false,
    )?;
    let dest = attachments_dir.join(format!("{}.bin", id));
    fs::write(&dest, enc).map_err(|_| "Erro ao gravar anexo.")?;
    audit::log(conn, "attachment_add", "attachments", Some(&id), None);
    Ok(id)
}

pub fn read_decrypted(
    conn: &Connection,
    key: &[u8; 32],
    attachments_dir: &Path,
    id: &str,
) -> Result<(String, Vec<u8>), String> {
    let row = entities::get(conn, key, "attachments", id)?;
    let name = row["original_name"].as_str().unwrap_or("anexo").to_string();
    let path = attachments_dir.join(format!("{}.bin", id));
    let enc = fs::read(&path).map_err(|_| "Anexo não encontrado no disco.")?;
    let bytes = crypto::decrypt(key, &enc).map_err(|_| "Falha ao decifrar anexo.")?;
    let expected = row["hash"].as_str().unwrap_or("");
    let actual = blake3::hash(&bytes).to_hex().to_string();
    if !expected.is_empty() && expected != actual {
        return Err("Falha de integridade do anexo.".into());
    }
    Ok((name, bytes))
}

pub fn export_to(
    conn: &Connection,
    key: &[u8; 32],
    attachments_dir: &Path,
    id: &str,
    dest_path: &str,
) -> Result<(), String> {
    let (_, bytes) = read_decrypted(conn, key, attachments_dir, id)?;
    fs::write(dest_path, bytes).map_err(|_| "Erro ao salvar arquivo.")?;
    audit::log(conn, "attachment_export", "attachments", Some(id), None);
    Ok(())
}

pub fn remove_file(attachments_dir: &Path, id: &str) {
    let _ = fs::remove_file(attachments_dir.join(format!("{}.bin", id)));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    #[test]
    fn ext_validation() {
        assert!(validate_ext("laudo.pdf").is_ok());
        assert!(validate_ext("foto.PNG").is_ok());
        assert!(validate_ext("virus.exe").is_err());
        assert!(validate_ext("script.js").is_err());
        assert!(validate_ext("semext").is_err());
    }

    #[test]
    fn add_and_read_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let conn = Connection::open_in_memory().unwrap();
        db::migrate(&conn).unwrap();
        let key: [u8; 32] = crypto::random_bytes(32).try_into().unwrap();
        let src = dir.path().join("doc.pdf");
        fs::write(&src, b"%PDF-1.4 conteudo de teste").unwrap();
        let att_dir = dir.path().join("att");
        let id = add(&conn, &key, &att_dir, "patients", "p1", src.to_str().unwrap(), false).unwrap();
        // arquivo em disco deve estar cifrado
        let on_disk = fs::read(att_dir.join(format!("{}.bin", id))).unwrap();
        assert!(!String::from_utf8_lossy(&on_disk).contains("conteudo de teste"));
        let (name, bytes) = read_decrypted(&conn, &key, &att_dir, &id).unwrap();
        assert_eq!(name, "doc.pdf");
        assert_eq!(bytes, b"%PDF-1.4 conteudo de teste");
    }
}
