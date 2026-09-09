/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `secrets` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_api_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repository_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "hashed_key" TEXT NOT NULL,
    "last_used_at" DATETIME,
    "expires_at" DATETIME,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "api_keys_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "api_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_api_keys" ("created_at", "created_by", "expires_at", "hashed_key", "id", "key_prefix", "last_used_at", "name", "repository_id", "updated_at") SELECT "created_at", "created_by", "expires_at", "hashed_key", "id", "key_prefix", "last_used_at", "name", "repository_id", "updated_at" FROM "api_keys";
DROP TABLE "api_keys";
ALTER TABLE "new_api_keys" RENAME TO "api_keys";
CREATE UNIQUE INDEX "api_keys_hashed_key_key" ON "api_keys"("hashed_key");
CREATE TABLE "new_secrets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repository_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "secrets_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "secrets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "secrets_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_secrets" ("created_at", "created_by", "description", "encrypted_value", "id", "key", "repository_id", "updated_at", "updated_by") SELECT "created_at", "created_by", "description", "encrypted_value", "id", "key", "repository_id", "updated_at", "updated_by" FROM "secrets";
DROP TABLE "secrets";
ALTER TABLE "new_secrets" RENAME TO "secrets";
CREATE UNIQUE INDEX "secrets_repository_id_key_key" ON "secrets"("repository_id", "key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
