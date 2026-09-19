import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, loginUser, expectSuccessResponse, createTestProject } from '../utils/testApp';

describe('API Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
      expect(body.checks.database.status).toBe('up');
    });
  });

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'test@example.com', password: 'password123' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
    });

    it('should fail login with invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'test@example.com', password: 'wrong' },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTHENTICATION_FAILED');
    });
  });

  describe('Projects CRUD', () => {
    let accessToken: string;

    beforeEach(async () => {
      const auth = await loginUser(app);
      accessToken = auth.accessToken;
    });

    it('should create a project', async () => {
      const project = await createTestProject(app, accessToken, { name: 'Integration Test Project' });
      expect(project.id).toBeDefined();
      expect(project.name).toBe('Integration Test Project');
    });

    it('should list projects', async () => {
      await createTestProject(app, accessToken, { name: 'Project 1' });
      await createTestProject(app, accessToken, { name: 'Project 2' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expectSuccessResponse(response);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });
  });
});