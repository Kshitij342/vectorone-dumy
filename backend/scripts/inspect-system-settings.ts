import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSetting.findMany();
  console.log('System Settings in Database:');
  console.dir(settings, { depth: null });
}

main().finally(() => prisma.$disconnect());
