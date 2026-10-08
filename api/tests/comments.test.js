const request = require('supertest');
const app = require('../src/app');
const {
  createAuthor,
  createPost,
  createComment,
  createUser,
  logIn,
} = require('./helpers/factories');

describe('GET /posts/:postId/comments', () => {
  it("lists a published post's comments, newest first", async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: new Date() });
    const reader = await createUser();
    await createComment(post, reader, {
      body: 'Second',
      createdAt: new Date('2026-09-20'),
    });
    await createComment(post, reader, {
      body: 'First',
      createdAt: new Date('2026-09-10'),
    });
    await createComment(post, author, {
      body: 'Third',
      createdAt: new Date('2026-09-30'),
    });

    const res = await request(app).get(`/posts/${post.id}/comments`);

    expect(res.status).toBe(200);
    expect(res.body.map((comment) => comment.body)).toEqual([
      'Third',
      'Second',
      'First',
    ]);
  });

  it("includes each commenter's username but never password data", async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: new Date() });
    const reader = await createUser({
      username: 'jane',
      password: 'secret-hash',
    });
    const comment = await createComment(post, reader, {
      body: 'Nice post!',
      createdAt: new Date('2026-09-26T10:00:00Z'),
      editedAt: new Date('2026-09-27T10:00:00Z'),
    });

    const res = await request(app).get(`/posts/${post.id}/comments`);

    expect(res.body).toEqual([
      {
        id: comment.id,
        body: 'Nice post!',
        createdAt: '2026-09-26T10:00:00.000Z',
        editedAt: '2026-09-27T10:00:00.000Z',
        user: { username: 'jane' },
      },
    ]);
    expect(res.text).not.toContain('password');
    expect(res.text).not.toContain('secret-hash');
  });

  it('only lists comments from the post asked for', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: new Date() });
    const otherPost = await createPost(author, { publishedAt: new Date() });
    await createComment(post, author, { body: 'Here' });
    await createComment(otherPost, author, { body: 'Elsewhere' });

    const res = await request(app).get(`/posts/${post.id}/comments`);

    expect(res.body.map((comment) => comment.body)).toEqual(['Here']);
  });

  it('gives an empty list for a post with no comments', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });

    const res = await request(app).get(`/posts/${post.id}/comments`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('hides the comments of an unpublished post from visitors', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: null });
    await createComment(post, author);

    const res = await request(app).get(`/posts/${post.id}/comments`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Post not found' });
  });

  it('hides the comments of an unpublished post from readers', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: null });
    const reader = await createUser();
    await createComment(post, reader);
    const token = await logIn(reader);

    const res = await request(app)
      .get(`/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('shows the author the comments of an unpublished post', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: null });
    await createComment(post, author, { body: 'Hidden for now' });
    const token = await logIn(author);

    const res = await request(app)
      .get(`/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.map((comment) => comment.body)).toEqual(['Hidden for now']);
  });

  it('gives 404 for a post that does not exist', async () => {
    const res = await request(app).get('/posts/999/comments');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Post not found' });
  });

  it('gives 404 for a post id that is not a number', async () => {
    const res = await request(app).get('/posts/abc/comments');

    expect(res.status).toBe(404);
  });
});
