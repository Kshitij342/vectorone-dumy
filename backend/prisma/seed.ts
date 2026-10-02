/**
 * VectorOne — clean database seed
 *
 * This project intentionally starts with zero application data. Demo accounts,
 * academic records, notices, assignments, and other sample content are seeded
 * only by dedicated local-development scripts.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
    console.log('⚠️ Production environment detected. The zero-state seed is intentionally skipped.');
    console.log('👉 Use the admin creation script or the local test-account seeder for development-only data.');
    return;
  }

  const [students, faculty, departments, courses, notices, events, assignments, resources, calendarEvents, conversations, messages, notifications, attendance, users] = await Promise.all([
    prisma.student.count(),
    prisma.facultyMember.count(),
    prisma.department.count(),
    prisma.course.count(),
    prisma.notice.count(),
    prisma.event.count(),
    prisma.assignment.count(),
    prisma.resource.count(),
    prisma.calendarEvent.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.notification.count(),
    prisma.attendanceRecord.count(),
    prisma.user.count(),
  ]);

  console.log('🌱 Initializing VectorOne database in a clean zero-state.');
  console.log('No sample or demo academic content is inserted by this seed.');
  console.log('Current counts:', {
    students,
    faculty,
    departments,
    courses,
    notices,
    events,
    assignments,
    resources,
    calendarEvents,
    conversations,
    messages,
    notifications,
    attendance,
    users,
  });
}

main()
  .catch((error) => {
    console.error('❌ Clean seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
