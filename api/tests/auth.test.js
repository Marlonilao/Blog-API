const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { createUser, logIn, DEFAULT_PASSWORD } = require('./helpers/factories');

describe('POST /auth/login', () => {
  it('gives back a token and the user for the right password', async () => {
    const user = await createUser({ username: 'reader1' });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'reader1', password: DEFAULT_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      id: user.id,
      username: 'reader1',
      role: 'READER',
    });
  });

  it('refuses a wrong password', async () => {
    await createUser({ username: 'reader1' });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'reader1', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Wrong username or password' });
  });

  it('gives the same answer for a username that does not exist', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'nobody', password: DEFAULT_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Wrong username or password' });
  });

  it('asks for both a username and a password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'reader1' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Username and password are required' });
  });
});

describe('GET /auth/me', () => {
  it('gives back the logged-in user', async () => {
    const user = await createUser({ username: 'reader1' });
    const token = await logIn(user);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: user.id,
      username: 'reader1',
      role: 'READER',
    });
  });

  it('refuses a request with no token', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Please log in first' });
  });

  it('refuses a token that is not real', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
  });

  it('refuses a token signed with a different secret', async () => {
    const user = await createUser();
    const token = jwt.sign(
      { id: user.id, role: 'AUTHOR' },
      'some-other-secret',
    );

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('refuses an expired token', async () => {
    const user = await createUser();
    const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;
    const token = jwt.sign(
      { id: user.id, role: user.role, exp: oneMinuteAgo },
      process.env.JWT_SECRET,
    );

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});
