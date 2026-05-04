use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use sha2::Sha256;
use rand::RngCore;

pub fn generate_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);
    key
}

pub fn generate_nonce() -> [u8; 12] {
    let mut nonce = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce);
    nonce
}

pub fn generate_stream_id() -> String {
    let mut bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

pub fn encrypt(data: &[u8], key: &[u8; 32], nonce: &[u8; 12]) -> Vec<u8> {
    let cipher: Aes256Gcm = KeyInit::new(key.into());
    let nonce = Nonce::from_slice(nonce);
    cipher.encrypt(nonce, data).expect("Encryption failed")
}

pub fn decrypt(data: &[u8], key: &[u8; 32], nonce: &[u8; 12]) -> Option<Vec<u8>> {
    let cipher: Aes256Gcm = KeyInit::new(key.into());
    let nonce = Nonce::from_slice(nonce);
    cipher.decrypt(nonce, data).ok()
}

pub fn hmac_sign(data: &str, secret: &str) -> String {
    use hmac::{Hmac, Mac};
    type HmacSha256 = Hmac<Sha256>;
    let mut mac = <HmacSha256 as Mac>::new_from_slice(secret.as_bytes())
        .expect("HMAC accepts keys of any length");
    mac.update(data.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

pub fn hmac_verify(data: &str, signature: &str, secret: &str) -> bool {
    hmac_sign(data, secret) == signature
}


