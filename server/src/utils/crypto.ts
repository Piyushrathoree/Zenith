import * as CryptoJS from 'crypto-js';

/**
 * Encrypts a string using AES-256.
 * Used to store OAuth access/refresh tokens securely in the DB.
 */
function encryptData(data: string, key: string): string {
    return CryptoJS.AES.encrypt(data, key).toString();
}

/**
 * Decrypts an AES-256 encrypted string.
 */
function decryptData(encryptedData: string, key: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return bytes.toString(CryptoJS.enc.Utf8);
}

export { encryptData, decryptData };
