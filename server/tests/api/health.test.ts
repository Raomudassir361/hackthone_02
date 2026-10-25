import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('API Health Check', () => {
  const app = createApp();

  it('GET /api/health returns 200 with ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('timestamp');
  });
});
