import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { upload } from '../config/multer';

import { getAdminDashboard } from '../controllers/admin/dashboard.controller';
import { getStudents, getStudentById, createStudent, updateStudent, deleteStudent } from '../controllers/admin/students.controller';
import { getFaculty, getFacultyById, createFaculty, updateFaculty, deleteFaculty } from '../controllers/admin/faculty.controller';
import { getDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment } from '../controllers/admin/departments.controller';
import { getCourses, getCourseById, createCourse, updateCourse, deleteCourse } from '../controllers/admin/courses.controller';
import { getAttendance, recordAttendance, updateAttendance } from '../controllers/admin/attendance.controller';
import { getAdminNotices, createNotice, getNoticeById, updateNotice, deleteNotice, publishNotice, scheduleNotice } from '../controllers/admin/notices.controller';
import { getAdminEvents, createAdminEvent, getAdminEventById, updateAdminEvent, deleteAdminEvent } from '../controllers/admin/events.controller';
import { getAdminAssignments, createAdminAssignment, getAdminAssignmentById, updateAdminAssignment, deleteAdminAssignment } from '../controllers/admin/assignments.controller';
import { getAdminResources, createAdminResource, getAdminResourceById, updateAdminResource, deleteAdminResource } from '../controllers/admin/resources.controller';
import { getAdminMessages, getAdminMessagesByConversation, sendAdminMessage, broadcastMessage } from '../controllers/admin/messages.controller';
import { getStudentsReport, getAttendanceReport, getAssignmentsReport, getEventsReport, getResourcesReport, getAdminReportsOverview } from '../controllers/admin/reports.controller';
import { getAnalyticsOverview, getStudentAnalytics, getAttendanceAnalytics, getEventAnalytics, getResourceAnalytics } from '../controllers/admin/analytics.controller';
import { getAdminProfile, updateAdminProfile } from '../controllers/admin/profile.controller';
import { getAdminSettings, updateAdminSettings } from '../controllers/admin/settings.controller';

const router = Router();

// All Admin routes require authentication and ADMIN role
router.use(authenticate, requireAdmin);

// Dashboard
router.get('/dashboard', getAdminDashboard);

// Students
router.get('/students', getStudents);
router.get('/students/:id', getStudentById);
router.post('/students', createStudent);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

// Faculty
router.get('/faculty', getFaculty);
router.get('/faculty/:id', getFacultyById);
router.post('/faculty', createFaculty);
router.put('/faculty/:id', updateFaculty);
router.delete('/faculty/:id', deleteFaculty);

// Departments
router.get('/departments', getDepartments);
router.get('/departments/:id', getDepartmentById);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// Courses
router.get('/courses', getCourses);
router.get('/courses/:id', getCourseById);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

// Attendance
router.get('/attendance', getAttendance);
router.post('/attendance', recordAttendance);
router.put('/attendance/:id', updateAttendance);

// Notices
router.get('/notices', getAdminNotices);
router.post('/notices', createNotice);
router.get('/notices/:id', getNoticeById);
router.put('/notices/:id', updateNotice);
router.delete('/notices/:id', deleteNotice);
router.post('/notices/:id/publish', publishNotice);
router.post('/notices/:id/schedule', scheduleNotice);

// Events
router.get('/events', getAdminEvents);
router.post('/events', createAdminEvent);
router.get('/events/:id', getAdminEventById);
router.put('/events/:id', updateAdminEvent);
router.delete('/events/:id', deleteAdminEvent);

// Assignments
router.get('/assignments', getAdminAssignments);
router.post('/assignments', createAdminAssignment);
router.get('/assignments/:id', getAdminAssignmentById);
router.put('/assignments/:id', updateAdminAssignment);
router.delete('/assignments/:id', deleteAdminAssignment);

// Resources
router.get('/resources', getAdminResources);
router.post('/resources', upload.single('file'), createAdminResource);
router.get('/resources/:id', getAdminResourceById);
router.put('/resources/:id', updateAdminResource);
router.delete('/resources/:id', deleteAdminResource);

// Messages
router.get('/messages', getAdminMessages);
router.get('/messages/:conversationId', getAdminMessagesByConversation);
router.post('/messages', sendAdminMessage);
router.post('/messages/broadcast', broadcastMessage);

// Reports
router.get('/reports', getAdminReportsOverview);
router.get('/reports/students', getStudentsReport);
router.get('/reports/attendance', getAttendanceReport);
router.get('/reports/assignments', getAssignmentsReport);
router.get('/reports/events', getEventsReport);
router.get('/reports/resources', getResourcesReport);

// Analytics
router.get('/analytics/overview', getAnalyticsOverview);
router.get('/analytics/students', getStudentAnalytics);
router.get('/analytics/attendance', getAttendanceAnalytics);
router.get('/analytics/events', getEventAnalytics);
router.get('/analytics/resources', getResourceAnalytics);

// Profile
router.get('/profile', getAdminProfile);
router.put('/profile', updateAdminProfile);

// Settings
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

export default router;
