/**
 * VectorOne — Test Account Verification Script
 * Run: cd backend && npx ts-node prisma/verify-test-accounts.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const testAccounts = [
  { email: 'vectorone.student1@tsecmumbai.in', password: 'VectorStudent@101', role: 'STUDENT' },
  { email: 'vectorone.student2@tsecmumbai.in', password: 'VectorStudent@102', role: 'STUDENT' },
  { email: 'vectorone.student3@tsecmumbai.in', password: 'VectorStudent@103', role: 'STUDENT' },
  { email: 'vectorone.admin1@vectorone.edu',   password: 'VectorAdmin@101',   role: 'ADMIN' },
  { email: 'vectorone.admin2@vectorone.edu',   password: 'VectorAdmin@102',   role: 'ADMIN' },
  { email: 'vectorone.admin3@vectorone.edu',   password: 'VectorAdmin@103',   role: 'ADMIN' },
];

async function main() {
  console.log('\n🔍 Verifying VectorOne test accounts...\n');

  let allPassed = true;

  for (const account of testAccounts) {
    const user = await prisma.user.findUnique({
      where: { email: account.email },
      include: { student: true, admin: true }
    });

    if (!user) {
      console.log(`❌ MISSING   ${account.email}`);
      allPassed = false;
      continue;
    }

    const passwordOk = await bcrypt.compare(account.password, user.passwordHash);
    const roleOk = user.role === account.role;
    const noGoogleId = !user.googleId;
    const profileName = user.student?.fullName ?? user.admin?.fullName ?? '—';
    const profileOk = !!user.student || !!user.admin;

    const status = passwordOk && roleOk && noGoogleId && profileOk ? '✅ OK' : '❌ FAIL';
    if (!passwordOk || !roleOk || !noGoogleId || !profileOk) allPassed = false;

    console.log(`${status}  ${account.role.padEnd(7)} | ${account.email}`);
    console.log(`          name="${profileName}" | password=${passwordOk ? 'OK' : 'WRONG'} | role=${roleOk ? 'OK' : 'WRONG'} | googleId=${noGoogleId ? 'none (correct)' : 'SET (unexpected)'}`);
  }

  // Also confirm original admin is untouched
  const origAdmin = await prisma.user.findUnique({ where: { email: 'admin@vectorone.edu' }, include: { admin: true } });
  const origOk = origAdmin && (await bcrypt.compare('Admin@123', origAdmin.passwordHash));
  console.log(`\n${origOk ? '✅' : '❌'} Original admin@vectorone.edu / Admin@123 — ${origOk ? 'intact' : 'PROBLEM'}`);

  // Count totals
  const testEmails = testAccounts.map(a => a.email);
  const total = await prisma.user.count({ where: { email: { in: testEmails } } });
  console.log(`\n📊 Total test accounts in DB: ${total}/6 (no duplicates possible — email is UNIQUE)\n`);

  if (allPassed) {
    console.log('🎉 All test accounts verified successfully.\n');
  } else {
    console.log('⚠️  Some checks failed — review output above.\n');
    process.exit(1);
  }
}

main()
  .catch(e => { console.error('❌ Verification failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
