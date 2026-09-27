import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('==================================================');
  console.log('INSPECTING CURRENT NEON DATABASE ROW COUNTS');
  console.log('==================================================\n');

  const userCount = await prisma.user.count();
  const studentCount = await prisma.student.count();
  const facultyCount = await prisma.facultyMember.count();
  const adminCount = await prisma.admin.count();
  const deptCount = await prisma.department.count();
  const courseCount = await prisma.course.count();
  const noticeCount = await prisma.notice.count();
  const eventCount = await prisma.event.count();
  const eventRegCount = await prisma.eventRegistration.count();
  const assignmentCount = await prisma.assignment.count();
  const submissionCount = await prisma.assignmentSubmission.count();
  const resourceCount = await prisma.resource.count();
  const calendarCount = await prisma.calendarEvent.count();
  const convCount = await prisma.conversation.count();
  const convPartCount = await prisma.conversationParticipant.count();
  const messageCount = await prisma.message.count();
  const notifCount = await prisma.notification.count();
  const attendanceCount = await prisma.attendanceRecord.count();
  const userSettingCount = await prisma.userSetting.count();
  const systemSettingCount = await prisma.systemSetting.count();

  console.log(`- User: ${userCount}`);
  console.log(`- Student: ${studentCount}`);
  console.log(`- Faculty: ${facultyCount}`);
  console.log(`- Admin: ${adminCount}`);
  console.log(`- Department: ${deptCount}`);
  console.log(`- Course: ${courseCount}`);
  console.log(`- Notice: ${noticeCount}`);
  console.log(`- Event: ${eventCount}`);
  console.log(`- EventRegistration: ${eventRegCount}`);
  console.log(`- Assignment: ${assignmentCount}`);
  console.log(`- AssignmentSubmission: ${submissionCount}`);
  console.log(`- Resource: ${resourceCount}`);
  console.log(`- CalendarEvent: ${calendarCount}`);
  console.log(`- Conversation: ${convCount}`);
  console.log(`- ConversationParticipant: ${convPartCount}`);
  console.log(`- Message: ${messageCount}`);
  console.log(`- Notification: ${notifCount}`);
  console.log(`- AttendanceRecord: ${attendanceCount}`);
  console.log(`- UserSetting: ${userSettingCount}`);
  console.log(`- SystemSetting: ${systemSettingCount}\n`);

  console.log('--- USER ACCOUNTS LIST ---');
  const users = await prisma.user.findMany({
    include: { admin: true, student: true, faculty: true }
  });
  users.forEach((u) => {
    console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | AdminName: ${u.admin?.fullName || 'N/A'} | StudentName: ${u.student?.fullName || 'N/A'} | FacultyName: ${u.faculty?.fullName || 'N/A'}`);
  });

  console.log('\n--- DEPARTMENTS LIST ---');
  const depts = await prisma.department.findMany();
  depts.forEach((d) => console.log(`Code: ${d.deptId} | Name: ${d.name}`));

  console.log('\n--- COURSES LIST ---');
  const courses = await prisma.course.findMany();
  courses.forEach((c) => console.log(`Code: ${c.courseCode} | Name: ${c.name}`));
}

main()
  .catch((e) => {
    console.error('Error inspecting database:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
