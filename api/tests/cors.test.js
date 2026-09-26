const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

afterAll(() => prisma.$disconnect());

// The allowed sites come from CORS_ORIGINS in .env.test.
const allowedOrigins = process.env.CORS_ORIGINS.split(',');

describe('CORS', () => {
  it.each(allowedOrigins)(
    'lets the site at %s call the API',
    async (origin) => {
      const res = await request(app).get('/health').set('Origin', origin);

      expect(res.headers['access-control-allow-origin']).toBe(origin);
    },
  );

  it('does not let other websites call the API', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
