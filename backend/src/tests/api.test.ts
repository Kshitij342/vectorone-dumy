import request from 'supertest';
import { createApp } from '../app';
import { signToken } from '../config/jwt';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';

const app = createApp();

describe('VectorOne API Core Endpoints', () => {
  it('GET /api/health returns healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.service).toBe('VectorOne API');
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api/docs returns documentation index', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.body.service).toBeDefined();
    expect(res.body.endpoints).toBeDefined();
  });

  it('POST /api/auth/login with invalid body returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-an-email',
      password: '',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/google without credential returns 400', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/credential/i);
  });

  it('POST /api/auth/forgot-password with non-existent email returns 200 without user enumeration', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({
      email: 'nonexistent_test_user@vectorone.edu',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/If that email exists/i);
  });

  it('POST /api/auth/reset-password with invalid token returns 400', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({
      email: 'student@vectorone.edu',
      token: 'invalid_token_123',
      newPassword: 'newpassword123',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/admin/dashboard without token returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/dashboard without token returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Student token accessing /api/admin/dashboard returns 403 Forbidden', async () => {
    const studentToken = signToken({
      userId: 'test-student-id',
      email: 'student@vectorone.edu',
      role: Role.STUDENT,
    });
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Admin access required|Forbidden/i);
  });

  it('GET /api/events returns public events list', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/events/test-id/register without token returns 401', async () => {
    const res = await request(app).post('/api/events/test-id/register');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/assignments/test-id/submissions without token returns 401', async () => {
    const res = await request(app).post('/api/assignments/test-id/submissions');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/admin/attendance with admin token returns formatted student attendance', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .get('/api/admin/attendance')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/admin/students with admin token returns student list', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .get('/api/admin/students')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('DELETE /api/admin/students/test-id without token returns 401', async () => {
    const res = await request(app).delete('/api/admin/students/test-id');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/admin/students/test-id with student token returns 403', async () => {
    const studentToken = signToken({
      userId: 'test-student-id',
      email: 'student@vectorone.edu',
      role: Role.STUDENT,
    });
    const res = await request(app)
      .delete('/api/admin/students/test-id')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Admin access required|Forbidden/i);
  });

  it('DELETE /api/admin/students/non-existent-id with admin token returns 404', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .delete('/api/admin/students/non-existent-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Student not found/i);
  });

  it('DELETE /api/admin/courses/test-code without token returns 401', async () => {
    const res = await request(app).delete('/api/admin/courses/test-code');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/admin/courses/test-code with student token returns 403', async () => {
    const studentToken = signToken({
      userId: 'test-student-id',
      email: 'student@vectorone.edu',
      role: Role.STUDENT,
    });
    const res = await request(app)
      .delete('/api/admin/courses/test-code')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Admin access required|Forbidden/i);
  });

  it('DELETE /api/admin/courses/non-existent-code with admin token returns 404', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .delete('/api/admin/courses/non-existent-code')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Course not found/i);
  });

  /* ---------- Departments Tests ---------- */
  it('GET /api/admin/departments without token returns 401', async () => {
    const res = await request(app).get('/api/admin/departments');
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/departments without name returns 400', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .post('/api/admin/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/name is required/i);
  });

  it('DELETE /api/admin/departments/non-existent-dept with admin token returns 404', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .delete('/api/admin/departments/non-existent-dept')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Department not found/i);
  });

  /* ---------- Reports Tests ---------- */
  it('GET /api/admin/reports without token returns 401', async () => {
    const res = await request(app).get('/api/admin/reports');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/reports with admin token returns 200 and list of reports', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  /* ---------- Assignments Tests ---------- */
  it('DELETE /api/admin/assignments/non-existent-asg with admin token returns 404', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .delete('/api/admin/assignments/non-existent-asg')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Assignment not found/i);
  });

  /* ---------- Resources Tests ---------- */
  it('DELETE /api/admin/resources/non-existent-res with admin token returns 404', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .delete('/api/admin/resources/non-existent-res')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Resource not found/i);
  });

  /* ---------- Settings Tests ---------- */
  it('GET /api/admin/settings without token returns 401', async () => {
    const res = await request(app).get('/api/admin/settings');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/settings with admin token returns 200 and settings object', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data).toBe('object');
  });

  it('PUT /api/admin/settings with admin token saves settings successfully', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ compactDashboard: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  /* ---------- Messaging Tests ---------- */
  it('GET /api/messages without token returns 401', async () => {
    const res = await request(app).get('/api/messages');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/messages without token returns 401', async () => {
    const res = await request(app).get('/api/admin/messages');
    expect(res.status).toBe(401);
  });

  it('POST /api/messages without text returns 400', async () => {
    const token = signToken({
      userId: 'test-user-id',
      email: 'student@vectorone.edu',
      role: Role.STUDENT,
    });
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientId: 'some-user-id' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/messages with valid user token returns 200', async () => {
    const token = signToken({
      userId: 'test-user-id',
      email: 'student@vectorone.edu',
      role: Role.STUDENT,
    });
    const res = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/admin/messages with valid admin token returns 200', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .get('/api/admin/messages')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  /* ---------- Notices Tests ---------- */
  it('GET /api/admin/notices without token returns 401', async () => {
    const res = await request(app).get('/api/admin/notices');
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/notices with student token returns 403', async () => {
    const studentToken = signToken({
      userId: 'test-student-id',
      email: 'student@vectorone.edu',
      role: Role.STUDENT,
    });
    const res = await request(app)
      .post('/api/admin/notices')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Unauthorized Notice' });
    expect(res.status).toBe(403);
  });

  it('POST /api/admin/notices without title returns 400', async () => {
    const adminToken = signToken({
      userId: 'test-admin-id',
      email: 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .post('/api/admin/notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('Admin can create, update, publish, and delete a notice', async () => {
    const adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!adminUser) return;

    const adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    // Create
    const createRes = await request(app)
      .post('/api/admin/notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Jest Test Notice',
        body: 'Testing notice creation via Jest',
        category: 'Academic',
        audience: 'All Students',
        status: 'Draft',
        priority: 'High',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const noticeId = createRes.body.data.id;

    // Update
    const updateRes = await request(app)
      .put(`/api/admin/notices/${noticeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Updated Jest Test Notice' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);

    // Publish
    const pubRes = await request(app)
      .post(`/api/admin/notices/${noticeId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.success).toBe(true);

    // Delete
    const delRes = await request(app)
      .delete(`/api/admin/notices/${noticeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  /* ---------- Events Admin Tests ---------- */
  it('POST /api/admin/events without token returns 401', async () => {
    const res = await request(app).post('/api/admin/events').send({ title: 'Test Event' });
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/events with student token returns 403', async () => {
    const studentToken = signToken({
      userId: 'test-student-id',
      email: 'student@vectorone.edu',
      role: Role.STUDENT,
    });
    const res = await request(app)
      .post('/api/admin/events')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Test Event' });
    expect(res.status).toBe(403);
  });

  it('POST /api/admin/events without title returns 400', async () => {
    const adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    const adminToken = signToken({
      userId: adminUser?.id || 'test-admin-id',
      email: adminUser?.email || 'admin@vectorone.edu',
      role: Role.ADMIN,
    });
    const res = await request(app)
      .post('/api/admin/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('Admin can create, update, list, and delete an event', async () => {
    const adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!adminUser) return;

    const adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    // Create
    const createRes = await request(app)
      .post('/api/admin/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Jest Test Event',
        summary: 'Testing event creation',
        category: 'Workshop',
        venue: 'Lab 1',
        date: new Date().toISOString(),
        status: 'Open',
        capacity: 50,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const eventId = createRes.body.data.id;

    // Update
    const updateRes = await request(app)
      .put(`/api/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Updated Jest Test Event',
        status: 'Closed',
        capacity: 100,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);

    // List
    const listRes = await request(app)
      .get('/api/admin/events')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);

    // Delete
    const delRes = await request(app)
      .delete(`/api/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  /* ---------- Admin Profile Tests ---------- */
  it('GET /api/admin/profile without token returns 401', async () => {
    const res = await request(app).get('/api/admin/profile');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/profile with student token returns 403', async () => {
    const studentToken = signToken({
      userId: 'test-student-id',
      email: 'student@vectorone.edu',
      role: Role.STUDENT,
    });
    const res = await request(app)
      .get('/api/admin/profile')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it('Admin can fetch and update profile', async () => {
    const adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!adminUser) return;

    const adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    // Get
    const getRes = await request(app)
      .get('/api/admin/profile')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    const originalName = getRes.body.data.fullName || 'System Administrator';

    // Update
    const putRes = await request(app)
      .put('/api/admin/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Jest Updated Admin' });

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.data.fullName).toBe('Jest Updated Admin');

    // Revert
    await request(app)
      .put('/api/admin/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: originalName });
  });

  /* ---------- Event Status & Statistics Tests ---------- */
  it('GET /api/admin/events computes status dynamically based on date and returns stats array', async () => {
    const adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!adminUser) return;

    const adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    // Create past event (e.g. 5 days ago)
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const createRes = await request(app)
      .post('/api/admin/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Past Test Event',
        startDate: pastDate,
        venue: 'Main Hall',
      });

    expect(createRes.status).toBe(201);
    const pastEventId = createRes.body.data.id;

    // Fetch events list
    const listRes = await request(app)
      .get('/api/admin/events')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.stats)).toBe(true);
    expect(listRes.body.stats.length).toBe(4);

    const pastEvent = listRes.body.data.find((e: any) => e.id === pastEventId);
    expect(pastEvent).toBeDefined();
    expect(pastEvent.status).toBe('Completed');

    // Clean up
    await request(app)
      .delete(`/api/admin/events/${pastEventId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  it('GET /api/admin/notices returns dynamic stats array', async () => {
    const adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!adminUser) return;

    const adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    const res = await request(app)
      .get('/api/admin/notices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.stats)).toBe(true);
    expect(res.body.stats.length).toBe(4);
  });

  it('GET /api/admin/reports returns reports list and dynamic stats array', async () => {
    const adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!adminUser) return;

    const adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(Array.isArray(res.body.stats)).toBe(true);
    expect(res.body.stats.find((s: any) => s.label === 'System Reports')).toBeDefined();
  });

  /* ---------- Security Hardening Tests ---------- */
  describe('Security Hardening Tests', () => {
    it('rejects requests from unknown CORS origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://malicious-unauthorized-domain.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('blocks unauthenticated access to /uploads static files', async () => {
      const res = await request(app).get('/uploads/non-existent-test-file.pdf');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Authentication required');
    });

    it('blocks unauthenticated access to resource downloads', async () => {
      const res = await request(app).get('/api/resources/test-id/download');
      expect(res.status).toBe(401);
    });

    it('requires JWT token for accessing /api/messages', async () => {
      const res = await request(app).get('/api/messages');
      expect(res.status).toBe(401);
    });

    it('registration with existing email returns unified error message', async () => {
      const student = await prisma.user.findFirst({ where: { role: Role.STUDENT } });
      if (!student) return;

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Duplicate Test',
          email: student.email,
          studentId: 'VO999999',
          year: 1,
          department: 'Computer Science',
          password: 'Password@123',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Registration failed. An account with these credentials already exists.');
    });

    it('forgot-password does not leak debugToken in response', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@vectorone.edu' });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
      expect(res.body.debugToken).toBeUndefined();
    });
  });
});


