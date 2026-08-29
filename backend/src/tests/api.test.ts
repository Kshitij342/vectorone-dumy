import request from 'supertest';
import { createApp } from '../app';
import { signToken } from '../config/jwt';
import { Role } from '@prisma/client';

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
    if (res.body.data.length > 0) {
      const first = res.body.data[0];
      expect(first.id).toMatch(/^VO\d+/);
      expect(first.studentId).toMatch(/^VO\d+/);
      expect(typeof first.name).toBe('string');
      expect(first.name.length).toBeGreaterThan(0);
      expect(first.name).not.toBe('undefined');
      expect(first.department).toBeDefined();
      expect(first.year).toBeDefined();
      expect(first.division).toBeDefined();
      expect(typeof first.present).toBe('number');
      expect(typeof first.absent).toBe('number');
      expect(typeof first.percentage).toBe('number');
      expect(['Excellent', 'Good', 'Warning', 'Critical']).toContain(first.status);
    }
  });
});

