const request = require('supertest');
const app = require('../src/app');
const { createAuthor, createPost } = require('./helpers/factories');

describe('GET /posts', () => {
  it('shows visitors only published posts', async () => {
    const author = await createAuthor();
    await createPost(author, {
      title: 'Published',
      publishedAt: new Date('2026-09-01'),
    });
    await createPost(author, { title: 'Unpublished', publishedAt: null });

    const res = await request(app).get('/posts');

    expect(res.status).toBe(200);
    expect(res.body.map((post) => post.title)).toEqual(['Published']);
  });

  it('puts the newest published post first', async () => {
    const author = await createAuthor();
    await createPost(author, {
      title: 'Middle',
      publishedAt: new Date('2026-09-10'),
    });
    await createPost(author, {
      title: 'Oldest',
      publishedAt: new Date('2026-09-01'),
    });
    await createPost(author, {
      title: 'Newest',
      publishedAt: new Date('2026-09-20'),
    });

    const res = await request(app).get('/posts');

    expect(res.body.map((post) => post.title)).toEqual([
      'Newest',
      'Middle',
      'Oldest',
    ]);
  });

  it("includes each post's author username but never password data", async () => {
    const author = await createAuthor({
      username: 'marlon',
      password: 'secret-hash',
    });
    const post = await createPost(author, {
      title: 'Hello',
      publishedAt: new Date('2026-09-26T10:00:00Z'),
    });

    const res = await request(app).get('/posts');

    expect(res.body).toEqual([
      {
        id: post.id,
        title: 'Hello',
        publishedAt: '2026-09-26T10:00:00.000Z',
        createdAt: post.createdAt.toISOString(),
        editedAt: null,
        author: { username: 'marlon' },
      },
    ]);
    expect(res.text).not.toContain('password');
    expect(res.text).not.toContain('secret-hash');
  });
});
