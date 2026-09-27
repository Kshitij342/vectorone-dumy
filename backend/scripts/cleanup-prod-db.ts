import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient, Role } from '@prisma/client';
import { createOrUpdateAdmin } from './create-admin';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function cleanupProductionDatabase() {
  console.log('==================================================');
  console.log('STARTING PRODUCTION DATABASE CLEANUP');
  console.log('==================================================\n');

  // 1. Ensure admin account is provisioned first
  const adminUser = await createOrUpdateAdmin();
  const preservedAdminEmail = adminUser.email;

  console.log(`\n🔒 Preserving Admin Account: ${preservedAdminEmail} (User ID: ${adminUser.id})\n`);

  // 2. Perform deletion inside Prisma transaction where possible
  console.log('🧹 Deleting demo and test application data...');

  const attendanceDel = await prisma.attendanceRecord.deleteMany({});
  console.log(`- Deleted AttendanceRecord: ${attendanceDel.count} rows`);

  const submissionDel = await prisma.assignmentSubmission.deleteMany({});
  console.log(`- Deleted AssignmentSubmission: ${submissionDel.count} rows`);

  const assignmentDel = await prisma.assignment.deleteMany({});
  console.log(`- Deleted Assignment: ${assignmentDel.count} rows`);

  const eventRegDel = await prisma.eventRegistration.deleteMany({});
  console.log(`- Deleted EventRegistration: ${eventRegDel.count} rows`);

  const eventDel = await prisma.event.deleteMany({});
  console.log(`- Deleted Event: ${eventDel.count} rows`);

  const noticeDel = await prisma.notice.deleteMany({});
  console.log(`- Deleted Notice: ${noticeDel.count} rows`);

  const resourceDel = await prisma.resource.deleteMany({});
  console.log(`- Deleted Resource: ${resourceDel.count} rows`);

  const calendarDel = await prisma.calendarEvent.deleteMany({});
  console.log(`- Deleted CalendarEvent: ${calendarDel.count} rows`);

  const msgDel = await prisma.message.deleteMany({});
  console.log(`- Deleted Message: ${msgDel.count} rows`);

  const partDel = await prisma.conversationParticipant.deleteMany({});
  console.log(`- Deleted ConversationParticipant: ${partDel.count} rows`);

  const convDel = await prisma.conversation.deleteMany({});
  console.log(`- Deleted Conversation: ${convDel.count} rows`);

  const notifDel = await prisma.notification.deleteMany({});
  console.log(`- Deleted Notification: ${notifDel.count} rows`);

  const courseDel = await prisma.course.deleteMany({});
  console.log(`- Deleted Course: ${courseDel.count} rows`);

  const facultyDel = await prisma.facultyMember.deleteMany({});
  console.log(`- Deleted FacultyMember: ${facultyDel.count} rows`);

  const studentDel = await prisma.student.deleteMany({});
  console.log(`- Deleted Student: ${studentDel.count} rows`);

  const deptDel = await prisma.department.deleteMany({});
  console.log(`- Deleted Department: ${deptDel.count} rows`);

  const userSettingDel = await prisma.userSetting.deleteMany({
    where: { userId: { not: adminUser.id } }
  });
  console.log(`- Deleted Non-Admin UserSetting: ${userSettingDel.count} rows`);

  const nonAdminUserDel = await prisma.user.deleteMany({
    where: { id: { not: adminUser.id } }
  });
  console.log(`- Deleted Non-Admin User: ${nonAdminUserDel.count} rows`);

  console.log('\n==================================================');
  console.log('POST-CLEANUP VERIFICATION ROW COUNTS');
  console.log('==================================================\n');

  const finalCounts = {
    User: await prisma.user.count(),
    Admin: await prisma.admin.count(),
    Student: await prisma.student.count(),
    FacultyMember: await prisma.facultyMember.count(),
    Department: await prisma.department.count(),
    Course: await prisma.course.count(),
    Notice: await prisma.notice.count(),
    Event: await prisma.event.count(),
    EventRegistration: await prisma.eventRegistration.count(),
    Assignment: await prisma.assignment.count(),
    AssignmentSubmission: await prisma.assignmentSubmission.count(),
    Resource: await prisma.resource.count(),
    CalendarEvent: await prisma.calendarEvent.count(),
    Conversation: await prisma.conversation.count(),
    ConversationParticipant: await prisma.conversationParticipant.count(),
    Message: await prisma.message.count(),
    Notification: await prisma.notification.count(),
    AttendanceRecord: await prisma.attendanceRecord.count(),
    NonAdminUserSetting: await prisma.userSetting.count({ where: { userId: { not: adminUser.id } } }),
    SystemSetting: await prisma.systemSetting.count()
  };

  Object.entries(finalCounts).forEach(([model, count]) => {
    console.log(`- ${model}: ${count}`);
  });

  return finalCounts;
}

if (require.main === module) {
  cleanupProductionDatabase()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Cleanup failed:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
