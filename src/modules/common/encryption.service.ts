import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
@Injectable()
export class EncryptionService {
  private key() {
    const key = Buffer.from(process.env.ENCRYPTION_KEY || "", "base64");
    if (key.length !== 32)
      throw new Error("ENCRYPTION_KEY must be base64-encoded 32 bytes");
    return key;
  }
  encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), data]
      .map((item) => item.toString("base64"))
      .join(".");
  }
  decrypt(payload: string) {
    const [iv, tag, data] = payload
      .split(".")
      .map((item) => Buffer.from(item, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  }
}
