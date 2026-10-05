const request = require('supertest');
const app = require('../src/app');
const {
  createAuthor,
  createPost,
  createUser,
  logIn,
} = require('./helpers/factories');

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

describe('GET /posts with a token', () => {
  it('shows the author every post, unpublished ones first', async () => {
    const author = await createAuthor();
    await createPost(author, {
      title: 'Older published',
      publishedAt: new Date('2026-09-01'),
    });
    await createPost(author, {
      title: 'Newer published',
      publishedAt: new Date('2026-09-20'),
    });
    await createPost(author, { title: 'Unpublished', publishedAt: null });
    const token = await logIn(author);

    const res = await request(app)
      .get('/posts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(
      res.body.map((post) => [post.title, post.publishedAt !== null]),
    ).toEqual([
      ['Unpublished', false],
      ['Newer published', true],
      ['Older published', true],
    ]);
  });

  it("shows a reader only published posts, even with a reader's token", async () => {
    const author = await createAuthor();
    await createPost(author, { title: 'Published', publishedAt: new Date() });
    await createPost(author, { title: 'Unpublished', publishedAt: null });
    const token = await logIn(await createUser());

    const res = await request(app)
      .get('/posts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.map((post) => post.title)).toEqual(['Published']);
  });

  it('treats a bad token like a visitor instead of failing', async () => {
    const author = await createAuthor();
    await createPost(author, { title: 'Published', publishedAt: new Date() });
    await createPost(author, { title: 'Unpublished', publishedAt: null });

    const res = await request(app)
      .get('/posts')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(200);
    expect(res.body.map((post) => post.title)).toEqual(['Published']);
  });
});

describe('GET /posts/:postId', () => {
  it('shows a published post in full', async () => {
    const author = await createAuthor({ username: 'marlon' });
    const post = await createPost(author, {
      title: 'Hello',
      body: 'First paragraph.\n\nSecond paragraph.',
      publishedAt: new Date('2026-09-26T10:00:00Z'),
    });

    const res = await request(app).get(`/posts/${post.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: post.id,
      title: 'Hello',
      body: 'First paragraph.\n\nSecond paragraph.',
      publishedAt: '2026-09-26T10:00:00.000Z',
      createdAt: post.createdAt.toISOString(),
      editedAt: null,
      author: { username: 'marlon' },
    });
  });

  it('hides an unpublished post as if it did not exist', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: null });

    const res = await request(app).get(`/posts/${post.id}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Post not found' });
  });

  it('gives 404 for a post that does not exist', async () => {
    const res = await request(app).get('/posts/999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Post not found' });
  });

  it('gives 404 for an address that is not a plain post id', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: new Date() });
    // Each of these could be read as the number 1 by accident.
    expect(post.id).toBe(1);

    for (const postId of ['abc', '01', '1.0', '1e0']) {
      const res = await request(app).get(`/posts/${postId}`);
      expect(res.status).toBe(404);
    }
  });
});
