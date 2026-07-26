//! Criptografia: Argon2id (derivação de chave) + XChaCha20-Poly1305 (AEAD).
//! Nunca implementamos primitivas próprias — apenas as bibliotecas RustCrypto.

use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use chacha20poly1305::aead::{Aead, KeyInit, OsRng};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use rand::RngCore;

pub const KEY_LEN: usize = 32;
pub const NONCE_LEN: usize = 24;

#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("falha de criptografia")]
    Aead,
    #[error("falha na derivação de chave")]
    Kdf,
    #[error("dados cifrados corrompidos")]
    Malformed,
}

/// Hash de verificação da senha (PHC string, Argon2id).
pub fn hash_password(password: &str) -> Result<String, CryptoError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|_| CryptoError::Kdf)
}

pub fn verify_password(password: &str, phc: &str) -> bool {
    PasswordHash::new(phc)
        .map(|parsed| {
            Argon2::default()
                .verify_password(password.as_bytes(), &parsed)
                .is_ok()
        })
        .unwrap_or(false)
}

/// Deriva uma chave de 32 bytes a partir da senha e de um sal fixo por usuário.
pub fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; KEY_LEN], CryptoError> {
    let mut out = [0u8; KEY_LEN];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut out)
        .map_err(|_| CryptoError::Kdf)?;
    Ok(out)
}

pub fn random_bytes(n: usize) -> Vec<u8> {
    let mut b = vec![0u8; n];
    OsRng.fill_bytes(&mut b);
    b
}

/// Cifra com XChaCha20-Poly1305; saída = nonce (24B) || ciphertext.
pub fn encrypt(key: &[u8; KEY_LEN], plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let cipher = XChaCha20Poly1305::new(key.into());
    let nonce_bytes = random_bytes(NONCE_LEN);
    let nonce = XNonce::from_slice(&nonce_bytes);
    let ct = cipher
        .encrypt(nonce, plaintext)
        .map_err(|_| CryptoError::Aead)?;
    let mut out = nonce_bytes;
    out.extend_from_slice(&ct);
    Ok(out)
}

pub fn decrypt(key: &[u8; KEY_LEN], data: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if data.len() < NONCE_LEN {
        return Err(CryptoError::Malformed);
    }
    let (nonce_bytes, ct) = data.split_at(NONCE_LEN);
    let cipher = XChaCha20Poly1305::new(key.into());
    cipher
        .decrypt(XNonce::from_slice(nonce_bytes), ct)
        .map_err(|_| CryptoError::Aead)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_encrypt_decrypt() {
        let key: [u8; 32] = random_bytes(32).try_into().unwrap();
        let msg = "conteúdo sensível com acentuação".as_bytes();
        let ct = encrypt(&key, msg).unwrap();
        assert_ne!(ct, msg);
        assert_eq!(decrypt(&key, &ct).unwrap(), msg);
    }

    #[test]
    fn wrong_key_fails() {
        let k1: [u8; 32] = random_bytes(32).try_into().unwrap();
        let k2: [u8; 32] = random_bytes(32).try_into().unwrap();
        let ct = encrypt(&k1, b"dado").unwrap();
        assert!(decrypt(&k2, &ct).is_err());
    }

    #[test]
    fn tampered_ciphertext_fails() {
        let key: [u8; 32] = random_bytes(32).try_into().unwrap();
        let mut ct = encrypt(&key, b"integridade").unwrap();
        let last = ct.len() - 1;
        ct[last] ^= 0xff;
        assert!(decrypt(&key, &ct).is_err());
    }

    #[test]
    fn password_hash_verify() {
        let phc = hash_password("senha-forte-123").unwrap();
        assert!(verify_password("senha-forte-123", &phc));
        assert!(!verify_password("errada", &phc));
    }

    #[test]
    fn derive_is_deterministic() {
        let salt = random_bytes(16);
        let a = derive_key("s", &salt).unwrap();
        let b = derive_key("s", &salt).unwrap();
        assert_eq!(a, b);
    }
}
