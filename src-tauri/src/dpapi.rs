//! Proteção da chave-mestra pela DPAPI do Windows (escopo do usuário atual).
//!
//! A aplicação continua abrindo **sem senha**: a DPAPI decifra automaticamente
//! para a conta Windows que protegeu o blob. Ninguém digita nada; o que muda é
//! que a chave deixa de ficar em texto puro no banco.
//!
//! Ligamos diretamente ao crypt32 para não acrescentar dependências (o Smart App
//! Control desta máquina reage mal a build scripts novos).

use std::ffi::c_void;
use std::ptr;

#[repr(C)]
struct DataBlob {
    cb_data: u32,
    pb_data: *mut u8,
}

/// Sem interface: nunca exibe prompt ao usuário.
const CRYPTPROTECT_UI_FORBIDDEN: u32 = 0x1;

#[link(name = "crypt32")]
extern "system" {
    fn CryptProtectData(
        p_data_in: *const DataBlob,
        sz_data_descr: *const u16,
        p_optional_entropy: *const DataBlob,
        pv_reserved: *mut c_void,
        p_prompt_struct: *mut c_void,
        dw_flags: u32,
        p_data_out: *mut DataBlob,
    ) -> i32;

    fn CryptUnprotectData(
        p_data_in: *const DataBlob,
        pp_sz_data_descr: *mut *mut u16,
        p_optional_entropy: *const DataBlob,
        pv_reserved: *mut c_void,
        p_prompt_struct: *mut c_void,
        dw_flags: u32,
        p_data_out: *mut DataBlob,
    ) -> i32;
}

#[link(name = "kernel32")]
extern "system" {
    fn LocalFree(h_mem: *mut c_void) -> *mut c_void;
}

/// Entropia da aplicação: um blob de outro programa não abre aqui.
const ENTROPY: &[u8] = b"PsicoRegistro/master-key/v1";

fn blob(data: &[u8]) -> DataBlob {
    DataBlob {
        cb_data: data.len() as u32,
        pb_data: data.as_ptr() as *mut u8,
    }
}

/// Copia o resultado e libera a memória alocada pelo Windows.
///
/// # Safety
/// `out` deve ter sido preenchido por CryptProtectData/CryptUnprotectData.
unsafe fn take(out: DataBlob) -> Vec<u8> {
    if out.pb_data.is_null() || out.cb_data == 0 {
        return Vec::new();
    }
    let v = std::slice::from_raw_parts(out.pb_data, out.cb_data as usize).to_vec();
    LocalFree(out.pb_data as *mut c_void);
    v
}

/// Protege dados para a conta Windows atual. Nunca usa escopo de máquina.
pub fn protect(data: &[u8]) -> Result<Vec<u8>, String> {
    let mut out = DataBlob {
        cb_data: 0,
        pb_data: ptr::null_mut(),
    };
    let ok = unsafe {
        CryptProtectData(
            &blob(data),
            ptr::null(),
            &blob(ENTROPY),
            ptr::null_mut(),
            ptr::null_mut(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut out,
        )
    };
    if ok == 0 {
        return Err("Não foi possível proteger a chave nesta conta do Windows.".into());
    }
    let v = unsafe { take(out) };
    if v.is_empty() {
        return Err("Proteção da chave devolveu dados vazios.".into());
    }
    Ok(v)
}

pub fn unprotect(data: &[u8]) -> Result<Vec<u8>, String> {
    let mut out = DataBlob {
        cb_data: 0,
        pb_data: ptr::null_mut(),
    };
    let ok = unsafe {
        CryptUnprotectData(
            &blob(data),
            ptr::null_mut(),
            &blob(ENTROPY),
            ptr::null_mut(),
            ptr::null_mut(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut out,
        )
    };
    if ok == 0 {
        return Err("Chave protegida indisponível para esta conta do Windows.".into());
    }
    let v = unsafe { take(out) };
    if v.is_empty() {
        return Err("Recuperação da chave devolveu dados vazios.".into());
    }
    Ok(v)
}

/// A DPAPI está utilizável neste ambiente?
pub fn disponivel() -> bool {
    match protect(b"teste-de-disponibilidade") {
        Ok(b) => unprotect(&b)
            .map(|v| v == b"teste-de-disponibilidade")
            .unwrap_or(false),
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_preserva_a_chave() {
        let key = b"chave-mestra-de-teste-32-bytes!!";
        let blob = protect(key).unwrap();
        assert_ne!(blob.as_slice(), key.as_slice(), "deve sair protegido");
        assert_eq!(unprotect(&blob).unwrap(), key.to_vec());
    }

    #[test]
    fn blob_adulterado_falha() {
        let mut blob = protect(b"segredo").unwrap();
        let last = blob.len() - 1;
        blob[last] ^= 0xff;
        assert!(unprotect(&blob).is_err());
    }

    #[test]
    fn disponibilidade_detectada() {
        assert!(disponivel(), "DPAPI deveria estar disponível no Windows");
    }
}
