import CryptoJS from "crypto-js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const KEY_TAG = "poetcam-encryption-key";

class CryptoService {
  private encryptionKey: string | null = null;

  private async getKey(): Promise<string> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    let key = await SecureStore.getItemAsync(KEY_TAG);
    if (!key) {
      // For crypto-js, we can just use a random string as a key.
      // We'll generate secure random bytes and base64 encode them for a strong key.
      const randomBytes = await Crypto.getRandomBytesAsync(32); // 256-bit key
      key = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(randomBytes))));
      await SecureStore.setItemAsync(KEY_TAG, key);
    }

    this.encryptionKey = key;
    return key;
  }

  async encrypt(data: string): Promise<string | null> {
    try {
      const key = await this.getKey();
      if (!key) {
        throw new Error("Encryption key is not available.");
      }
      const ciphertext = CryptoJS.AES.encrypt(data, key).toString();
      return ciphertext;
    } catch (error) {
      console.error("Encryption failed:", error);
      return null;
    }
  }

  async decrypt(encryptedData: string): Promise<string | null> {
    try {
      const key = await this.getKey();
      if (!key) {
        throw new Error("Decryption key is not available.");
      }
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      // If decryption fails, originalText will be empty.
      if (!originalText) {
        throw new Error("Decryption failed. The resulting text is empty.");
      }
      return originalText;
    } catch (error) {
      console.error("Decryption failed:", error);
      return null;
    }
  }

  async clearKey(): Promise<void> {
    this.encryptionKey = null;
    await SecureStore.deleteItemAsync(KEY_TAG);
  }
}

export const cryptoService = new CryptoService();
