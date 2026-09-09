/*
  Warnings:

  - You are about to drop the column `owner_id` on the `repositories` table. All the data in the column will be lost.
  - Added the required column `created_by` to the `repositories` table without a default value. This is not possible if the table is not empty.
  - Made the column `repository_group_id` on table `repositories` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `created_by` to the `repository_groups` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_repositories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repository_group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "repositories_repository_group_id_fkey" FOREIGN KEY ("repository_group_id") REFERENCES "repository_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "repositories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_repositories" ("created_at", "deleted_at", "description", "id", "name", "repository_group_id", "slug", "updated_at") SELECT "created_at", "deleted_at", "description", "id", "name", "repository_group_id", "slug", "updated_at" FROM "repositories";
DROP TABLE "repositories";
ALTER TABLE "new_repositories" RENAME TO "repositories";
CREATE UNIQUE INDEX "repositories_repository_group_id_slug_key" ON "repositories"("repository_group_id", "slug");
CREATE TABLE "new_repository_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "repository_groups_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "repository_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_repository_groups" ("created_at", "deleted_at", "description", "id", "name", "slug", "updated_at", "workspace_id") SELECT "created_at", "deleted_at", "description", "id", "name", "slug", "updated_at", "workspace_id" FROM "repository_groups";
DROP TABLE "repository_groups";
ALTER TABLE "new_repository_groups" RENAME TO "repository_groups";
CREATE UNIQUE INDEX "repository_groups_workspace_id_slug_key" ON "repository_groups"("workspace_id", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
