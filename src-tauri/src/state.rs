//! Estado global: conexão SQLite e chave-mestra (somente em memória).

use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;

use rusqlite::Connection;
use zeroize::Zeroize;

pub struct AppState {
    pub inner: Mutex<Inner>,
    pub data_dir: PathBuf,
}

pub struct Inner {
    pub conn: Option<Connection>,
    pub key: Option<[u8; 32]>,
    /// Acesso temporário à área neuropsicológica restrita.
    pub restricted_until: Option<Instant>,
}

impl AppState {
    pub fn new(data_dir: PathBuf) -> Self {
        Self {
            inner: Mutex::new(Inner {
                conn: None,
                key: None,
                restricted_until: None,
            }),
            data_dir,
        }
    }

    pub fn db_path(&self) -> PathBuf {
        self.data_dir.join("psicoregistro.db")
    }

    pub fn attachments_dir(&self) -> PathBuf {
        self.data_dir.join("attachments")
    }
}

impl Inner {
    pub fn lock_session(&mut self) {
        if let Some(mut k) = self.key.take() {
            k.zeroize();
        }
        self.restricted_until = None;
    }

    pub fn require_key(&self) -> Result<[u8; 32], String> {
        self.key.ok_or_else(|| "Aplicação bloqueada.".to_string())
    }

    pub fn require_conn(&self) -> Result<&Connection, String> {
        self.conn
            .as_ref()
            .ok_or_else(|| "Banco de dados indisponível.".to_string())
    }

    pub fn restricted_ok(&self) -> bool {
        self.restricted_until
            .map(|t| t > Instant::now())
            .unwrap_or(false)
    }
}
