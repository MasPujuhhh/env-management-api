# Backend

NestJS modules keep HTTP controllers thin and business logic in services. Prisma owns the SQLite data model. Secret values use AES-256-GCM and API keys use SHA-256 hashes; plaintext API keys are returned only from creation.

Commands: `npm run prisma:generate`, `npx prisma migrate dev`, `npm run prisma:seed`, `npm run build`, and `npm test`.

Never replace `ENCRYPTION_KEY` directly: decrypt and re-encrypt every existing secret with the new key in a controlled migration, verify the migration, then deploy the new configuration. Keep an emergency backup of the database and old key until validation is complete.

