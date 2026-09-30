/**
 * VectorOne — Targeted Test Account Seeder for Neon/Production
 * ============================================================
 * PURPOSE : Insert the 6 dedicated test accounts into the Neon
 *           production database used by the Vercel deployment.
 *
 * SAFETY  : IDEMPOTENT. Uses upsert on email (unique). Never
 *           touches unrelated users, departments, notices,
 *           events, courses, settings, or any other data.
 *
 * USAGE   : Set DATABASE_URL to the Neon connection string,
 *           then run:
 *
 *   $env:DATABASE_URL="postgresql://..."
 *   npx ts-node prisma/seed-test-accounts-neon.ts
 *
 * DO NOT  : commit this file with a real DATABASE_URL embedded.
 *           Pass it via environment variable only.
 */

import { PrismaClient, Role, StudentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ── Guard: refuse to run without DATABASE_URL ─────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Pass it as an environment variable.');
  console.error('   $env:DATABASE_URL="postgresql://..." (PowerShell)');
  process.exit(1);
}

// ── Safety check: confirm target database ────────────────────────────────
const dbUrl = process.env.DATABASE_URL;
const isNeon = dbUrl.includes('neon.tech') || dbUrl.includes('neon.host') || dbUrl.includes('neon.database') || dbUrl.includes('neondb');
const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

if (isLocalhost) {
  console.log('⚠️  DATABASE_URL points to localhost. This script is intended for Neon.');
  console.log('    Proceeding anyway — local run is fine for testing the script itself.');
}

const targetLabel = isNeon ? 'Neon production' : isLocalhost ? 'Local PostgreSQL' : 'Unknown remote database';
console.log(`\n🎯 Target database: ${targetLabel}`);

const prisma = new PrismaClient();

// ── Test account definitions ──────────────────────────────────────────────
const TEST_STUDENTS = [
  { email: 'vectorone.student1@tsecmumbai.in', password: 'VectorStudent@101', studentId: 'VO-TST-001', fullName: 'VectorOne Test Student 1', year: 2, division: 'A', semester: 3 },
  { email: 'vectorone.student2@tsecmumbai.in', password: 'VectorStudent@102', studentId: 'VO-TST-002', fullName: 'VectorOne Test Student 2', year: 2, division: 'B', semester: 3 },
  { email: 'vectorone.student3@tsecmumbai.in', password: 'VectorStudent@103', studentId: 'VO-TST-003', fullName: 'VectorOne Test Student 3', year: 2, division: 'C', semester: 3 },
];

const TEST_ADMINS = [
  { email: 'vectorone.admin1@vectorone.edu', password: 'VectorAdmin@101', fullName: 'VectorOne Test Admin 1' },
  { email: 'vectorone.admin2@vectorone.edu', password: 'VectorAdmin@102', fullName: 'VectorOne Test Admin 2' },
  { email: 'vectorone.admin3@vectorone.edu', password: 'VectorAdmin@103', fullName: 'VectorOne Test Admin 3' },
];

async function main() {
  // ── Step 1: Find the Computer Science department ──────────────────────────
  // Reuse the existing dept — do NOT create a new one.
  const deptCS = await prisma.department.findFirst({
    where: { name: { contains: 'Computer Science' } }
  });

  if (!deptCS) {
    // Fallback: use ANY active department rather than failing
    const anyDept = await prisma.department.findFirst({ where: { status: 'Active' } });
    if (!anyDept) {
      console.error('❌ No departments found in the target database. Cannot create student records.');
      process.exit(1);
    }
    console.warn(`⚠️  "Computer Science" department not found. Using fallback department: "${anyDept.name}" (${anyDept.deptId})`);
    return runSeed(anyDept);
  }

  console.log(`✅ Found department: "${deptCS.name}" (${deptCS.deptId})`);
  return runSeed(deptCS);
}

async function runSeed(dept: { id: string; name: string }) {
  console.log('\n── Creating / verifying test students ───────────────────────────\n');

  for (const ts of TEST_STUDENTS) {
    // Hash the password fresh for this account
    const hash = await bcrypt.hash(ts.password, 12);

    // Upsert User — if exists, update passwordHash to keep credentials current
    const user = await prisma.user.upsert({
      where:  { email: ts.email },
      update: { passwordHash: hash, role: Role.STUDENT },
      create: { email: ts.email, passwordHash: hash, role: Role.STUDENT }
    });

    // Upsert Student profile
    await prisma.student.upsert({
      where:  { userId: user.id },
      update: {
        fullName: ts.fullName,
        year: ts.year,
        division: ts.division,
        semester: ts.semester,
        departmentId: dept.id,
        status: StudentStatus.Active,
      },
      create: {
        userId: user.id,
        studentId: ts.studentId,
        fullName: ts.fullName,
        year: ts.year,
        division: ts.division,
        semester: ts.semester,
        departmentId: dept.id,
        status: StudentStatus.Active,
      }
    });

    // Upsert UserSetting
    await prisma.userSetting.upsert({
      where:  { userId: user.id },
      update: {},
      create: { userId: user.id }
    });

    console.log(`  ✅ STUDENT  ${ts.email}  →  ${ts.fullName}`);
  }

  console.log('\n── Creating / verifying test admins ─────────────────────────────\n');

  for (const ta of TEST_ADMINS) {
    const hash = await bcrypt.hash(ta.password, 12);

    const user = await prisma.user.upsert({
      where:  { email: ta.email },
      update: { passwordHash: hash, role: Role.ADMIN },
      create: { email: ta.email, passwordHash: hash, role: Role.ADMIN }
    });

    await prisma.admin.upsert({
      where:  { userId: user.id },
      update: { fullName: ta.fullName },
      create: { userId: user.id, fullName: ta.fullName }
    });

    await prisma.userSetting.upsert({
      where:  { userId: user.id },
      update: {},
      create: { userId: user.id }
    });

    console.log(`  ✅ ADMIN    ${ta.email}  →  ${ta.fullName}`);
  }

  // ── Step 2: Verify all 6 accounts ────────────────────────────────────────
  console.log('\n── Verifying all test accounts ──────────────────────────────────\n');

  const allEmails = [
    ...TEST_STUDENTS.map(s => s.email),
    ...TEST_ADMINS.map(a => a.email),
  ];

  const accounts = await prisma.user.findMany({
    where: { email: { in: allEmails } },
    include: { student: true, admin: true }
  });

  const allPasswords = [
    ...TEST_STUDENTS.map(s => ({ email: s.email, password: s.password })),
    ...TEST_ADMINS.map(a => ({ email: a.email, password: a.password })),
  ];

  let allOk = true;
  for (const acc of allPasswords) {
    const user = accounts.find(u => u.email === acc.email);
    if (!user) {
      console.log(`  ❌ MISSING  ${acc.email}`);
      allOk = false;
      continue;
    }
    const pwOk = await bcrypt.compare(acc.password, user.passwordHash);
    const profileOk = !!(user.student || user.admin);
    const noGoogle = !user.googleId;
    const status = pwOk && profileOk && noGoogle ? '✅' : '❌';
    if (!pwOk || !profileOk || !noGoogle) allOk = false;

    const profile = user.student?.fullName ?? user.admin?.fullName ?? '—';
    console.log(`  ${status} ${user.role.padEnd(7)} | ${user.email} | name="${profile}" | pw=${pwOk ? 'OK' : 'FAIL'} | googleId=${noGoogle ? 'none' : 'SET-UNEXPECTED'}`);
  }

  // ── Confirm original admin is untouched ──────────────────────────────────
  const origAdmin = await prisma.user.findUnique({
    where: { email: 'admin@vectorone.edu' },
    include: { admin: true }
  });
  if (origAdmin) {
    console.log(`\n  ✅ Original admin@vectorone.edu is present and untouched (role=${origAdmin.role})`);
  } else {
    console.log('\n  ℹ️  admin@vectorone.edu not found in this database (may be expected in fresh Neon)');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const found = accounts.length;
  console.log(`\n  📊 Test accounts confirmed: ${found}/6`);

  if (allOk && found === 6) {
    console.log('\n🎉 All 6 test accounts are in Neon and verified.\n');
  } else {
    console.log('\n⚠️  Some checks failed — see output above.\n');
    process.exit(1);
  }
}

main()
  .catch(e => { console.error('\n❌ Script failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
