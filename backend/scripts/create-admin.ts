import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

export async function createOrUpdateAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@tsecmumbai.in';
  const password = process.env.ADMIN_PASSWORD || 'AdminSecret@123';
  const fullName = process.env.ADMIN_FULL_NAME || 'System Administrator';

  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      passwordHash,
      role: Role.ADMIN,
      admin: {
        upsert: {
          create: { fullName },
          update: { fullName },
        }
      }
    },
    create: {
      email: normalizedEmail,
      passwordHash,
      role: Role.ADMIN,
      admin: {
        create: { fullName }
      },
      settings: { create: {} }
    },
    include: { admin: true }
  });

  console.log(`✅ Admin account created/updated successfully: ${user.email} (ID: ${user.id})`);
  return user;
}

if (require.main === module) {
  createOrUpdateAdmin()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Failed to create admin account:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
