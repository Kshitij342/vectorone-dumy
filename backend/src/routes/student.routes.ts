import { Router } from 'express';
import { authenticate, requireStudent } from '../middleware/auth';
import { upload } from '../config/multer';
import { getDashboard, getDashboardStats, getDashboardActivity } from '../controllers/dashboard.controller';
import { getNotices, getNoticeById } from '../controllers/notices.controller';
import { getEvents, getEventById, registerForEvent, unregisterFromEvent } from '../controllers/events.controller';
import { getAssignments, getAssignmentById, getSubmissions, submitAssignment } from '../controllers/assignments.controller';
import { getResources, getResourceById, downloadResource } from '../controllers/resources.controller';
import { getCalendarEvents } from '../controllers/calendar.controller';
import { getConversations, getMessages, sendMessage, markConversationRead } from '../controllers/messages.controller';
import { getProfile, updateProfile } from '../controllers/profile.controller';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { getNotifications, markRead, markAllRead } from '../controllers/notifications.controller';

const router = Router();

// Notice & Search can also be accessed or shared
router.get('/notices', getNotices);
router.get('/notices/:id', getNoticeById);

// Events public / student view
router.get('/events', getEvents);
router.get('/events/:id', getEventById);

// Resources
router.get('/resources', getResources);
router.get('/resources/:id', getResourceById);
router.get('/resources/:id/download', authenticate, downloadResource);

// Calendar
router.get('/calendar/events', getCalendarEvents);

// Protected Student Routes
router.use(authenticate);

// Dashboard
router.get('/dashboard', requireStudent, getDashboard);
router.get('/dashboard/stats', requireStudent, getDashboardStats);
router.get('/dashboard/activity', requireStudent, getDashboardActivity);

// Event registration
router.post('/events/:id/register', requireStudent, registerForEvent);
router.delete('/events/:id/register', requireStudent, unregisterFromEvent);

// Assignments
router.get('/assignments', requireStudent, getAssignments);
router.get('/assignments/:id', requireStudent, getAssignmentById);
router.get('/assignments/:id/submissions', requireStudent, getSubmissions);
router.post('/assignments/:id/submissions', requireStudent, upload.single('file'), submitAssignment);

// Messages
router.get('/messages', getConversations);
router.get('/messages/:conversationId', getMessages);
router.post('/messages', sendMessage);
router.post('/messages/:conversationId/read', markConversationRead);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Notifications
router.get('/notifications', getNotifications);
router.post('/notifications/read', markRead);
router.post('/notifications/read-all', markAllRead);

export default router;
