/**
 * VectorOne — Database Seed
 * Run: npm run seed
 * Creates demo data for development/testing.
 *
 * Demo Credentials:
 *   Admin:   admin@vectorone.edu  / Admin@123
 *   Student: student@vectorone.edu / Student@123
 */

import { PrismaClient, Role, StudentStatus, FacultyStatus, DepartmentStatus,
  CourseStatus, NoticeStatus, NoticePriority, EventStatus, AssignmentStatus,
  ResourceType, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding VectorOne database...');

  // ── 1. Departments ──────────────────────────────────────────────────────
  const deptCS = await prisma.department.upsert({
    where: { deptId: 'DEP-101' },
    update: {},
    create: { deptId: 'DEP-101', name: 'Computer Science', hod: 'Dr. Neha Sharma', status: DepartmentStatus.Active }
  });
  const deptEC = await prisma.department.upsert({
    where: { deptId: 'DEP-102' },
    update: {},
    create: { deptId: 'DEP-102', name: 'Electronics', hod: 'Prof. Rohan Verma', status: DepartmentStatus.Active }
  });
  const deptME = await prisma.department.upsert({
    where: { deptId: 'DEP-103' },
    update: {},
    create: { deptId: 'DEP-103', name: 'Mechanical', hod: 'Dr. Meera Nair', status: DepartmentStatus.UnderReview }
  });
  const deptBA = await prisma.department.upsert({
    where: { deptId: 'DEP-104' },
    update: {},
    create: { deptId: 'DEP-104', name: 'Business Administration', hod: 'Mr. Kavish Joshi', status: DepartmentStatus.Active }
  });
  const deptIT = await prisma.department.upsert({
    where: { deptId: 'DEP-105' },
    update: {},
    create: { deptId: 'DEP-105', name: 'Information Technology', hod: 'Prof. Vikas Malhotra', status: DepartmentStatus.Active }
  });
  const deptCE = await prisma.department.upsert({
    where: { deptId: 'DEP-106' },
    update: {},
    create: { deptId: 'DEP-106', name: 'Civil Engineering', hod: 'Dr. Aisha Khan', status: DepartmentStatus.Inactive }
  });

  console.log('✅ Departments seeded');

  // ── 2. Admin User ────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vectorone.edu' },
    update: {},
    create: {
      email: 'admin@vectorone.edu',
      passwordHash: adminHash,
      role: Role.ADMIN,
    }
  });
  const adminProfile = await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, fullName: 'System Administrator' }
  });

  console.log('✅ Admin user seeded  →  admin@vectorone.edu / Admin@123');

  // ── 3. Faculty Users ─────────────────────────────────────────────────────
  const facultyData = [
    { facultyId: 'FAC-201', email: 'neha.sharma@vectorone.edu', name: 'Dr. Neha Sharma', designation: 'Professor', dept: deptCS, phone: '+91 98765 20321', status: FacultyStatus.Active },
    { facultyId: 'FAC-202', email: 'rohan.verma@vectorone.edu', name: 'Prof. Rohan Verma', designation: 'Associate Professor', dept: deptEC, phone: '+91 98765 20112', status: FacultyStatus.Active },
    { facultyId: 'FAC-203', email: 'meera.nair@vectorone.edu', name: 'Dr. Meera Nair', designation: 'HOD', dept: deptME, phone: '+91 98765 23145', status: FacultyStatus.OnLeave },
    { facultyId: 'FAC-204', email: 'kavish.joshi@vectorone.edu', name: 'Mr. Kavish Joshi', designation: 'Assistant Professor', dept: deptBA, phone: '+91 98765 31458', status: FacultyStatus.Active },
    { facultyId: 'FAC-205', email: 'aisha.khan@vectorone.edu', name: 'Dr. Aisha Khan', designation: 'Professor', dept: deptCE, phone: '+91 98765 28090', status: FacultyStatus.Active },
    { facultyId: 'FAC-206', email: 'vikas.malhotra@vectorone.edu', name: 'Prof. Vikas Malhotra', designation: 'Senior Lecturer', dept: deptIT, phone: '+91 98765 34019', status: FacultyStatus.Suspended },
  ];

  const facultyRecords: Record<string, { id: string }> = {};
  for (const f of facultyData) {
    const fHash = await bcrypt.hash('Faculty@123', 12);
    const fUser = await prisma.user.upsert({ where: { email: f.email }, update: {}, create: { email: f.email, passwordHash: fHash, role: Role.FACULTY } });
    const fRecord = await prisma.facultyMember.upsert({
      where: { userId: fUser.id },
      update: {},
      create: { userId: fUser.id, facultyId: f.facultyId, fullName: f.name, designation: f.designation, departmentId: f.dept.id, phone: f.phone, status: f.status }
    });
    facultyRecords[f.facultyId] = fRecord;
  }
  console.log('✅ Faculty seeded');

  // ── 4. Student User ───────────────────────────────────────────────────────
  const studentHash = await bcrypt.hash('Student@123', 12);
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@vectorone.edu' },
    update: {},
    create: { email: 'student@vectorone.edu', passwordHash: studentHash, role: Role.STUDENT }
  });
  const mainStudent = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: { userId: studentUser.id, studentId: 'VO2024001', fullName: 'Aarav Mehta', year: 2, division: 'A', semester: 3, phone: '+91 98765 10234', departmentId: deptCS.id, status: StudentStatus.Active }
  });

  // Additional demo students
  const extraStudents = [
    { id: 'VO2024002', email: 'diya.sharma@vectorone.edu', name: 'Diya Sharma', year: 3, div: 'B', sem: 5, dept: deptIT },
    { id: 'VO2024003', email: 'rohan.iyer@vectorone.edu', name: 'Rohan Iyer', year: 4, div: 'A', sem: 7, dept: deptME },
    { id: 'VO2024004', email: 'ananya.gupta@vectorone.edu', name: 'Ananya Gupta', year: 1, div: 'C', sem: 1, dept: deptCS },
    { id: 'VO2024005', email: 'kabir.khan@vectorone.edu', name: 'Kabir Khan', year: 2, div: 'B', sem: 3, dept: deptEC },
    { id: 'VO2024006', email: 'meera.nairS@vectorone.edu', name: 'Meera Nair', year: 4, div: 'A', sem: 7, dept: deptBA },
    { id: 'VO2024007', email: 'vivaan.patel@vectorone.edu', name: 'Vivaan Patel', year: 1, div: 'A', sem: 1, dept: deptIT },
    { id: 'VO2024008', email: 'ishita.roy@vectorone.edu', name: 'Ishita Roy', year: 3, div: 'C', sem: 5, dept: deptCS },
  ];
  for (const s of extraStudents) {
    const h = await bcrypt.hash('Student@123', 12);
    const u = await prisma.user.upsert({ where: { email: s.email }, update: {}, create: { email: s.email, passwordHash: h, role: Role.STUDENT } });
    await prisma.student.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id, studentId: s.id, fullName: s.name, year: s.year, division: s.div, semester: s.sem, departmentId: s.dept.id, status: StudentStatus.Active } });
  }
  console.log('✅ Students seeded  →  student@vectorone.edu / Student@123');

  // ── 5. Courses ────────────────────────────────────────────────────────────
  const courseCS201 = await prisma.course.upsert({
    where: { courseCode: 'CS201' },
    update: {},
    create: { courseCode: 'CS201', name: 'Data Structures', semester: 3, credits: 4, departmentId: deptCS.id, facultyId: facultyRecords['FAC-201'].id, status: CourseStatus.Active }
  });
  const courseEC204 = await prisma.course.upsert({
    where: { courseCode: 'EC204' },
    update: {},
    create: { courseCode: 'EC204', name: 'Signals and Systems', semester: 4, credits: 4, departmentId: deptEC.id, facultyId: facultyRecords['FAC-202'].id, status: CourseStatus.Active }
  });
  const courseME303 = await prisma.course.upsert({
    where: { courseCode: 'ME303' },
    update: {},
    create: { courseCode: 'ME303', name: 'Thermodynamics', semester: 5, credits: 3, departmentId: deptME.id, facultyId: facultyRecords['FAC-203'].id, status: CourseStatus.Draft }
  });
  const courseBA110 = await prisma.course.upsert({
    where: { courseCode: 'BA110' },
    update: {},
    create: { courseCode: 'BA110', name: 'Financial Accounting', semester: 2, credits: 3, departmentId: deptBA.id, facultyId: facultyRecords['FAC-204'].id, status: CourseStatus.Active }
  });
  const courseIT410 = await prisma.course.upsert({
    where: { courseCode: 'IT410' },
    update: {},
    create: { courseCode: 'IT410', name: 'Database Management', semester: 6, credits: 4, departmentId: deptIT.id, facultyId: facultyRecords['FAC-206'].id, status: CourseStatus.Archived }
  });

  console.log('✅ Courses seeded');

  // ── 6. Notices ────────────────────────────────────────────────────────────
  await prisma.notice.upsert({
    where: { noticeId: 'NTC-01' },
    update: {},
    create: {
      noticeId: 'NTC-01', title: 'Semester Examination Timetable',
      body: 'The end-semester examination schedule for all departments has been published on the student portal. Review your slots and report clashes to the examination cell within three working days.',
      category: 'Academic', audience: 'All Students', priority: NoticePriority.High,
      status: NoticeStatus.Published, publishedAt: new Date('2026-08-20'), authorId: adminProfile.id
    }
  });
  await prisma.notice.upsert({
    where: { noticeId: 'NTC-02' },
    update: {},
    create: {
      noticeId: 'NTC-02', title: 'Campus Placement Drive — TCS',
      body: 'TCS will conduct a campus recruitment drive for final-year students. Eligible students must register through the placement cell before the deadline.',
      category: 'Placement', audience: 'Final Year', priority: NoticePriority.High,
      status: NoticeStatus.Published, publishedAt: new Date('2026-08-18'), authorId: adminProfile.id
    }
  });
  await prisma.notice.upsert({
    where: { noticeId: 'NTC-03' },
    update: {},
    create: {
      noticeId: 'NTC-03', title: 'Library Working Hours Extended',
      body: 'The central library will remain open until 10 PM during the examination period to support student preparation.',
      category: 'Administrative', audience: 'All Students', priority: NoticePriority.Low,
      status: NoticeStatus.Published, publishedAt: new Date('2026-08-15'), authorId: adminProfile.id
    }
  });
  await prisma.notice.upsert({
    where: { noticeId: 'NTC-04' },
    update: {},
    create: {
      noticeId: 'NTC-04', title: 'Annual Tech Symposium Registration',
      body: 'Registrations for the annual technical symposium are now open. Teams of up to four members may participate across all events.',
      category: 'Events', audience: 'All Students', priority: NoticePriority.Medium,
      status: NoticeStatus.Scheduled, scheduledAt: new Date('2026-09-01'), authorId: adminProfile.id
    }
  });
  await prisma.notice.upsert({
    where: { noticeId: 'NTC-05' },
    update: {},
    create: {
      noticeId: 'NTC-05', title: 'Fee Payment Reminder',
      body: 'Second-installment tuition fees are due by the end of the month. Late payments attract a penalty as per institute policy.',
      category: 'Administrative', audience: 'All Students', priority: NoticePriority.Medium,
      status: NoticeStatus.Draft, authorId: adminProfile.id
    }
  });
  await prisma.notice.upsert({
    where: { noticeId: 'NTC-06' },
    update: {},
    create: {
      noticeId: 'NTC-06', title: 'Scholarship Application Window',
      body: 'Merit-cum-means scholarship applications are open for the current academic year. Submit supporting documents to the accounts office.',
      category: 'Academic', audience: 'Eligible Students', priority: NoticePriority.Medium,
      status: NoticeStatus.Published, publishedAt: new Date('2026-08-08'), authorId: adminProfile.id
    }
  });

  console.log('✅ Notices seeded');

  // ── 7. Events ─────────────────────────────────────────────────────────────
  const event1 = await prisma.event.upsert({
    where: { id: 'event-code-sprint' },
    update: {},
    create: {
      id: 'event-code-sprint',
      title: 'Code Sprint 2026', description: 'A 24-hour competitive programming and hackathon event.',
      category: 'Hackathon', venue: 'Main Auditorium', startDate: new Date('2026-09-15T09:00:00'),
      endDate: new Date('2026-09-16T09:00:00'), maxCapacity: 200, status: EventStatus.Upcoming, organizerId: adminProfile.id
    }
  });
  await prisma.event.upsert({
    where: { id: 'event-uiux-workshop' },
    update: {},
    create: {
      id: 'event-uiux-workshop',
      title: 'Intro to UI/UX Workshop', description: 'Hands-on workshop covering design fundamentals and Figma basics.',
      category: 'Workshop', venue: 'Design Lab 302', startDate: new Date('2026-09-05T10:00:00'),
      endDate: new Date('2026-09-05T16:00:00'), maxCapacity: 60, status: EventStatus.Upcoming, organizerId: adminProfile.id
    }
  });
  await prisma.event.upsert({
    where: { id: 'event-football' },
    update: {},
    create: {
      id: 'event-football',
      title: 'Inter-Dept Football Trials', description: 'Trials for the annual inter-department football tournament.',
      category: 'Sports', venue: 'Sports Ground', startDate: new Date('2026-09-10T15:00:00'),
      status: EventStatus.Upcoming, organizerId: adminProfile.id
    }
  });
  await prisma.event.upsert({
    where: { id: 'event-alumni-talk' },
    update: {},
    create: {
      id: 'event-alumni-talk',
      title: 'Alumni Talk: Careers in Product', description: 'A talk by alumni currently working in product management roles.',
      category: 'Seminar', venue: 'Seminar Hall B', startDate: new Date('2026-09-20T14:00:00'),
      status: EventStatus.Upcoming, organizerId: adminProfile.id
    }
  });

  console.log('✅ Events seeded');

  // ── 8. Assignments ────────────────────────────────────────────────────────
  const assign1 = await prisma.assignment.upsert({
    where: { id: 'assign-dbms-er' },
    update: {},
    create: {
      id: 'assign-dbms-er',
      title: 'DBMS — Normalized ER Diagram', description: 'Create a fully normalized ER diagram for a college management system. Include all entities, relationships, cardinalities, and composite keys.',
      dueDate: new Date('2026-09-01T23:59:00'), totalMarks: 50, status: AssignmentStatus.Active,
      courseId: courseCS201.id, creatorId: adminProfile.id
    }
  });
  await prisma.assignment.upsert({
    where: { id: 'assign-os-quiz' },
    update: {},
    create: {
      id: 'assign-os-quiz',
      title: 'Operating Systems Quiz — Process Scheduling', description: 'Answer the quiz on process scheduling algorithms. Cover FCFS, SJF, Round Robin, and Priority Scheduling.',
      dueDate: new Date('2026-09-05T17:00:00'), totalMarks: 30, status: AssignmentStatus.Active,
      courseId: courseCS201.id, creatorId: adminProfile.id
    }
  });
  await prisma.assignment.upsert({
    where: { id: 'assign-design-case' },
    update: {},
    create: {
      id: 'assign-design-case',
      title: 'Design Thinking Case Study', description: 'Choose any real-world problem and apply the five stages of Design Thinking. Submit a 2000-word case study with wireframes.',
      dueDate: new Date('2026-09-10T23:59:00'), totalMarks: 100, status: AssignmentStatus.Active,
      courseId: courseBA110.id, creatorId: adminProfile.id
    }
  });

  console.log('✅ Assignments seeded');

  // ── 9. Resources ──────────────────────────────────────────────────────────
  await prisma.resource.upsert({
    where: { id: 'res-ds-notes' },
    update: {},
    create: {
      id: 'res-ds-notes',
      title: 'Data Structures — Complete Notes', description: 'Comprehensive lecture notes covering arrays, linked lists, trees, graphs, and sorting algorithms.',
      type: ResourceType.PDF, courseId: courseCS201.id, uploaderId: adminProfile.id
    }
  });
  await prisma.resource.upsert({
    where: { id: 'res-signals-slides' },
    update: {},
    create: {
      id: 'res-signals-slides',
      title: 'Signals and Systems — Lecture Slides', description: 'Full set of slides for all 12 units of Signals and Systems.',
      type: ResourceType.Document, courseId: courseEC204.id, uploaderId: adminProfile.id
    }
  });
  await prisma.resource.upsert({
    where: { id: 'res-dbms-lab' },
    update: {},
    create: {
      id: 'res-dbms-lab',
      title: 'Cloud Computing Lab Manual', description: 'Step-by-step lab manual for cloud computing experiments.',
      type: ResourceType.PDF, courseId: courseIT410.id, uploaderId: adminProfile.id
    }
  });

  console.log('✅ Resources seeded');

  // ── 10. Calendar Events ───────────────────────────────────────────────────
  const calEvents = [
    { title: 'Semester Exams Begin', date: '2026-10-01', type: 'Exam', color: '#e74c3c' },
    { title: 'Code Sprint 2026', date: '2026-09-15', type: 'Event', color: '#3498db' },
    { title: 'Assignment: DBMS ER Diagram Due', date: '2026-09-01', type: 'Assignment', color: '#f39c12' },
    { title: 'Alumni Talk: Careers in Product', date: '2026-09-20', type: 'Event', color: '#3498db' },
    { title: 'Mid-Semester Break', date: '2026-09-25', type: 'Holiday', color: '#2ecc71' },
    { title: 'Faculty Development Workshop', date: '2026-09-08', type: 'Workshop', color: '#9b59b6' },
  ];
  for (const e of calEvents) {
    await prisma.calendarEvent.create({ data: { title: e.title, date: new Date(e.date), type: e.type, color: e.color } }).catch(() => {/* skip duplicates */});
  }
  console.log('✅ Calendar events seeded');

  // ── 11. Conversations + Messages ──────────────────────────────────────────
  // Create a conversation between admin and main student
  const existingConv = await prisma.conversation.findFirst({ where: { isGroup: false } });
  if (!existingConv) {
    const conv1 = await prisma.conversation.create({ data: { isGroup: false } });
    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conv1.id, userId: adminUser.id },
        { conversationId: conv1.id, userId: studentUser.id },
      ]
    });
    await prisma.message.createMany({
      data: [
        { conversationId: conv1.id, senderId: adminUser.id, text: 'Your normalized ER diagram is close. Add the relationship between Student and Enrollment before submission.', createdAt: new Date('2026-08-29T09:12:00') },
        { conversationId: conv1.id, senderId: studentUser.id, text: 'Thanks, I\'ll revise the cardinality and resubmit before 11:59 PM.', createdAt: new Date('2026-08-29T09:14:00') },
        { conversationId: conv1.id, senderId: adminUser.id, text: 'Great. Don\'t forget to include the composite key and the faculty assignment.', createdAt: new Date('2026-08-29T09:15:00') },
      ]
    });
    // Broadcast group conversation
    const broadcast = await prisma.conversation.create({ data: { isGroup: true, name: 'Placement Cell' } });
    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: broadcast.id, userId: adminUser.id },
        { conversationId: broadcast.id, userId: studentUser.id },
      ]
    });
    await prisma.message.create({
      data: { conversationId: broadcast.id, senderId: adminUser.id, text: 'TCS campus drive is confirmed for 2 October. Registration closes on 25 September.', createdAt: new Date('2026-08-28T10:00:00') }
    });
  }
  console.log('✅ Conversations seeded');

  // ── 12. Notifications ─────────────────────────────────────────────────────
  const existingNotif = await prisma.notification.findFirst({ where: { userId: studentUser.id } });
  if (!existingNotif) {
    await prisma.notification.createMany({
      data: [
        { userId: studentUser.id, text: 'New notice: Semester Examination Timetable published', type: 'notice', isRead: false },
        { userId: studentUser.id, text: 'Assignment due tomorrow: DBMS — Normalized ER Diagram', type: 'assignment', isRead: false },
        { userId: studentUser.id, text: 'You have been registered for Code Sprint 2026', type: 'event', isRead: true },
        { userId: adminUser.id, text: '17 student registrations need approval', type: 'admin', isRead: false },
        { userId: adminUser.id, text: 'Attendance report is ready for Computer Science', type: 'report', isRead: false },
      ]
    });
  }
  console.log('✅ Notifications seeded');

  // ── 13. User Settings ─────────────────────────────────────────────────────
  await prisma.userSetting.upsert({ where: { userId: studentUser.id }, update: {}, create: { userId: studentUser.id } });
  await prisma.userSetting.upsert({ where: { userId: adminUser.id }, update: {}, create: { userId: adminUser.id } });
  console.log('✅ User settings seeded');

  // ── 14. System Settings ───────────────────────────────────────────────────
  const sysSettings = [
    { key: 'institution_name', value: 'VectorOne College of Engineering' },
    { key: 'institution_email', value: 'info@vectorone.edu' },
    { key: 'institution_phone', value: '+91 22 1234 5678' },
    { key: 'current_semester', value: '3' },
    { key: 'current_year', value: '2026' },
    { key: 'max_upload_size_mb', value: '10' },
  ];
  for (const s of sysSettings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }
  console.log('✅ System settings seeded');

  // ── 15. Attendance Records ────────────────────────────────────────────────
  const allStudents = await prisma.student.findMany();
  const allCourses = await prisma.course.findMany();
  const attendanceDates = ['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-25', '2026-08-26'];

  for (const st of allStudents) {
    const studentCourse = allCourses.find((c) => c.departmentId === st.departmentId) || allCourses[0];
    const idNum = parseInt(st.studentId.replace(/\D/g, ''), 10) || 1;

    for (let i = 0; i < attendanceDates.length; i++) {
      const dateStr = attendanceDates[i];
      // Kabir Khan (idNum 5) and Ishita Roy (idNum 8) have some absences
      let status: AttendanceStatus = AttendanceStatus.Present;
      if (idNum === 5 && (i === 1 || i === 3)) {
        status = AttendanceStatus.Absent;
      } else if (idNum === 8 && i === 2) {
        status = AttendanceStatus.Absent;
      } else if (idNum === 3 && i === 4) {
        status = AttendanceStatus.Absent;
      }

      await prisma.attendanceRecord.upsert({
        where: { studentId_courseId_date: { studentId: st.id, courseId: studentCourse.id, date: new Date(dateStr) } },
        update: { status },
        create: {
          studentId: st.id,
          courseId: studentCourse.id,
          date: new Date(dateStr),
          status,
          markedById: facultyRecords['FAC-201']?.id || null
        }
      });
    }
  }
  console.log('✅ Attendance records seeded');

  console.log('\n🎉 Seed complete! Demo credentials:');
  console.log('   Admin:   admin@vectorone.edu   / Admin@123');
  console.log('   Student: student@vectorone.edu / Student@123');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
