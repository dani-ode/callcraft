use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Encryption failed")]
    EncryptionError,
    #[error("Decryption failed")]
    DecryptionError,
    #[error("Invalid key length: must be 32 bytes")]
    InvalidKeyLength,
    #[error("Password hashing failed")]
    HashError,
}

/// Encrypts plaintext string using AES-256-GCM and a master key (32 bytes)
pub fn encrypt_aes_256_gcm(plaintext: &str, master_key_hex: &str) -> Result<(String, String), CryptoError> {
    let key_bytes = hex::decode(master_key_hex).map_err(|_| CryptoError::InvalidKeyLength)?;
    if key_bytes.len() != 32 {
        return Err(CryptoError::InvalidKeyLength);
    }

    let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|_| CryptoError::InvalidKeyLength)?;
    
    // Generate random 12-byte nonce
    let mut nonce_bytes = [0u8; 12];
    getrandom::getrandom(&mut nonce_bytes).map_err(|_| CryptoError::EncryptionError)?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|_| CryptoError::EncryptionError)?;

    Ok((hex::encode(ciphertext), hex::encode(nonce_bytes)))
}

/// Decrypts ciphertext string using AES-256-GCM
pub fn decrypt_aes_256_gcm(ciphertext_hex: &str, nonce_hex: &str, master_key_hex: &str) -> Result<String, CryptoError> {
    let key_bytes = hex::decode(master_key_hex).map_err(|_| CryptoError::InvalidKeyLength)?;
    if key_bytes.len() != 32 {
        return Err(CryptoError::InvalidKeyLength);
    }

    let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|_| CryptoError::InvalidKeyLength)?;
    let ciphertext = hex::decode(ciphertext_hex).map_err(|_| CryptoError::DecryptionError)?;
    let nonce_bytes = hex::decode(nonce_hex).map_err(|_| CryptoError::DecryptionError)?;

    if nonce_bytes.len() != 12 {
        return Err(CryptoError::DecryptionError);
    }

    let nonce = Nonce::from_slice(&nonce_bytes);
    let decrypted_bytes = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| CryptoError::DecryptionError)?;

    String::from_utf8(decrypted_bytes).map_err(|_| CryptoError::DecryptionError)
}

/// Hashes password / secret key using Argon2id
pub fn hash_secret_argon2(secret: &str) -> Result<String, CryptoError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(secret.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|_| CryptoError::HashError)
}

/// Verifies secret key against Argon2id hash
pub fn verify_secret_argon2(secret: &str, hash_str: &str) -> Result<bool, CryptoError> {
    let parsed_hash = PasswordHash::new(hash_str).map_err(|_| CryptoError::HashError)?;
    Ok(Argon2::default()
        .verify_password(secret.as_bytes(), &parsed_hash)
        .is_ok())
}
