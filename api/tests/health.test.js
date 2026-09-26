const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

afterAll(() => prisma.$disconnect());

describe('GET /health', () => {
  it('says the API and its database are ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
