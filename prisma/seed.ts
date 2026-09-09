import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const db = new PrismaClient();
async function main() {
  console.log('SEEDING');

  const password = process.env.SEED_ADMIN_PASSWORD || 'secret123';
  await db.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@gmail.com',
      password: await bcrypt.hash(password, 12),
      systemRole: 'SUPERADMIN',
    },
  });
}
main().finally(() => db.$disconnect());
