/*
  Warnings:

  - You are about to drop the column `encrypted_value` on the `secrets` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_secrets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repository_id" TEXT NOT NULL,
    "key" TEXT,
    "encryptedValue" TEXT,
    "value" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SECRET',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "secrets_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "secrets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "secrets_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_secrets" ("created_at", "created_by", "description", "id", "key", "repository_id", "updated_at", "updated_by") SELECT "created_at", "created_by", "description", "id", "key", "repository_id", "updated_at", "updated_by" FROM "secrets";
DROP TABLE "secrets";
ALTER TABLE "new_secrets" RENAME TO "secrets";
CREATE UNIQUE INDEX "secrets_repository_id_key_key" ON "secrets"("repository_id", "key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
