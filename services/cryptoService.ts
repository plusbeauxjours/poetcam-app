import { Buffer } from "buffer";
import * as SecureStore from "expo-secure-store";
import crypto from "react-native-quick-crypto";

const KEY_TAG = "poetcam-encryption-key-v2";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

class CryptoService {
  private encryptionKey: Buffer | null = null;

  private async getKey(): Promise<Buffer> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    let keyString = await SecureStore.getItemAsync(KEY_TAG);
    if (!keyString) {
      const keyBuffer = crypto.randomBytes(32);
      keyString = keyBuffer.toString("base64");
      await SecureStore.setItemAsync(KEY_TAG, keyString);
    }

    const key = Buffer.from(keyString, "base64");
    this.encryptionKey = key;
    return key;
  }

  async encrypt(data: string): Promise<string | null> {
    try {
      const key = await this.getKey();
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      let encrypted = cipher.update(data, "utf8", "base64");
      encrypted += cipher.final("base64");
      const authTag = cipher.getAuthTag();
      return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
    } catch (error) {
      console.error("Encryption failed:", error);
      return null;
    }
  }

  async decrypt(encryptedString: string): Promise<string | null> {
    if (!encryptedString) return null;
    try {
      const key = await this.getKey();
      const parts = encryptedString.split(":");
      if (parts.length !== 3) {
        throw new Error("Invalid encrypted data format.");
      }
      const [ivBase64, authTagBase64, encryptedDataBase64] = parts;
      const iv = Buffer.from(ivBase64, "base64");
      const authTag = Buffer.from(authTagBase64, "base64");
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedDataBase64, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
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
