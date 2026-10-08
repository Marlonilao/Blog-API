const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const { createUser, logIn, DEFAULT_PASSWORD } = require('./helpers/factories');

describe('POST /auth/signup', () => {
  it('creates a reader with a hashed password and logs them in', async () => {
    const res = await request(app).post('/auth/signup').send({
      username: 'new_reader1',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      token: expect.any(String),
      user: { id: expect.any(Number), username: 'new_reader1', role: 'READER' },
    });
    // The database must never hold the password as typed.
    const saved = await prisma.user.findUnique({
      where: { username: 'new_reader1' },
    });
    expect(saved.password).not.toBe('password123');
  });

  it('gives a token that works', async () => {
    const signupRes = await request(app).post('/auth/signup').send({
      username: 'new_reader1',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${signupRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('new_reader1');
  });

  it('lets the new reader log in later', async () => {
    await request(app).post('/auth/signup').send({
      username: 'new_reader1',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'new_reader1', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.username).toBe('new_reader1');
  });

  it('refuses a username that is taken', async () => {
    await createUser({ username: 'taken' });

    const res = await request(app).post('/auth/signup').send({
      username: 'taken',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'That username is taken' });
  });

  it('lists every rule that was broken', async () => {
    const res = await request(app).post('/auth/signup').send({
      username: 'no spaces!',
      password: 'short',
      confirmPassword: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Please fix the problems below',
      fields: {
        username: 'Username must be 3 to 20 letters, numbers or underscores',
        password: 'Password must be at least 8 characters',
      },
    });
  });

  it('only lists the fields that are wrong', async () => {
    const res = await request(app).post('/auth/signup').send({
      username: 'ab',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(['username']);
  });

  it('refuses a username that is too long', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({
        username: 'a'.repeat(21),
        password: 'password123',
        confirmPassword: 'password123',
      });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(['username']);
  });

  it('refuses a missing username and password', async () => {
    const res = await request(app).post('/auth/signup').send({});

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(['username', 'password']);
  });

  it('refuses passwords that do not match', async () => {
    const res = await request(app).post('/auth/signup').send({
      username: 'new_reader1',
      password: 'password123',
      confirmPassword: 'password124',
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Please fix the problems below',
      fields: { confirmPassword: 'The passwords do not match' },
    });
    // Nobody was created.
    expect(await prisma.user.count()).toBe(0);
  });

  it('refuses a missing confirm password', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ username: 'new_reader1', password: 'password123' });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(['confirmPassword']);
  });

  it('always makes a reader, even when asked for an author', async () => {
    const res = await request(app).post('/auth/signup').send({
      username: 'sneaky',
      password: 'password123',
      confirmPassword: 'password123',
      role: 'AUTHOR',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('READER');
    const saved = await prisma.user.findUnique({
      where: { username: 'sneaky' },
    });
    expect(saved.role).toBe('READER');
  });
});

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
