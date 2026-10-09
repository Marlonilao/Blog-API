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

describe('POST /posts/:postId/comments', () => {
  it('lets a reader comment on a published post', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const reader = await createUser({ username: 'jane' });
    const token = await logIn(reader);

    const res = await request(app)
      .post(`/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Nice post!' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      body: 'Nice post!',
      createdAt: expect.any(String),
      editedAt: null,
      user: { username: 'jane' },
    });
  });

  it('lets the author comment on a published post', async () => {
    const author = await createAuthor({ username: 'boss' });
    const post = await createPost(author, { publishedAt: new Date() });
    const token = await logIn(author);

    const res = await request(app)
      .post(`/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Thanks for reading!' });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ username: 'boss' });
  });

  it("shows the new comment in the post's comment list", async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const token = await logIn(await createUser());

    await request(app)
      .post(`/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Saved for good' });
    const res = await request(app).get(`/posts/${post.id}/comments`);

    expect(res.body.map((comment) => comment.body)).toEqual(['Saved for good']);
  });

  it('refuses a visitor who is not logged in', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });

    const res = await request(app)
      .post(`/posts/${post.id}/comments`)
      .send({ body: 'Hello' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Please log in first' });
  });

  it('rejects an empty comment', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const token = await logIn(await createUser());

    for (const body of [{ body: '' }, { body: '   ' }, {}, { body: 42 }]) {
      const res = await request(app)
        .post(`/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'A comment cannot be empty' });
    }
  });

  it('refuses comments on an unpublished post, even from the author', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: null });

    for (const user of [await createUser(), author]) {
      const token = await logIn(user);
      const res = await request(app)
        .post(`/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Sneaky' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Post not found' });
    }
  });

  it('gives 404 for a post that does not exist', async () => {
    const token = await logIn(await createUser());

    const res = await request(app)
      .post('/posts/999/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Hello?' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Post not found' });
  });
});

describe('PUT /posts/:postId/comments/:commentId', () => {
  it("lets the comment's writer change it and sets the edited date", async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const reader = await createUser({ username: 'jane' });
    const comment = await createComment(post, reader, { body: 'Typo hree' });
    const token = await logIn(reader);

    const res = await request(app)
      .put(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Typo here' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: comment.id,
      body: 'Typo here',
      createdAt: comment.createdAt.toISOString(),
      editedAt: expect.any(String),
      user: { username: 'jane' },
    });
  });

  it('saves the change for good', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const reader = await createUser();
    const comment = await createComment(post, reader);
    const token = await logIn(reader);

    await request(app)
      .put(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Changed my mind' });
    const res = await request(app).get(`/posts/${post.id}/comments`);

    expect(res.body.map((c) => c.body)).toEqual(['Changed my mind']);
    expect(res.body[0].editedAt).not.toBeNull();
  });

  it('leaves the edited date empty when the body is the same', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const reader = await createUser();
    const comment = await createComment(post, reader, { body: 'Same' });
    const token = await logIn(reader);

    const res = await request(app)
      .put(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Same' });

    expect(res.status).toBe(200);
    expect(res.body.editedAt).toBeNull();
  });

  it('refuses another reader, and leaves the comment as it was', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const comment = await createComment(post, await createUser(), {
      body: 'My words',
    });
    const token = await logIn(await createUser());

    const res = await request(app)
      .put(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Your words now' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'You can only edit your own comments',
    });
    const list = await request(app).get(`/posts/${post.id}/comments`);
    expect(list.body.map((c) => c.body)).toEqual(['My words']);
  });

  it('refuses another reader even when the body is empty', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const comment = await createComment(post, await createUser());
    const token = await logIn(await createUser());

    const res = await request(app)
      .put(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: '' });

    expect(res.status).toBe(403);
  });

  it("refuses the author editing a reader's comment", async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: new Date() });
    const comment = await createComment(post, await createUser());
    const token = await logIn(author);

    const res = await request(app)
      .put(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Edited by the author' });

    expect(res.status).toBe(403);
  });

  it('refuses a visitor who is not logged in', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const comment = await createComment(post, await createUser());

    const res = await request(app)
      .put(`/posts/${post.id}/comments/${comment.id}`)
      .send({ body: 'Hello' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Please log in first' });
  });

  it('rejects an empty body', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const reader = await createUser();
    const comment = await createComment(post, reader);
    const token = await logIn(reader);

    for (const body of [{ body: '' }, { body: '   ' }, {}, { body: 42 }]) {
      const res = await request(app)
        .put(`/posts/${post.id}/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'A comment cannot be empty' });
    }
  });

  it('gives 404 for a comment that does not exist', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const token = await logIn(await createUser());

    for (const commentId of ['999', 'abc']) {
      const res = await request(app)
        .put(`/posts/${post.id}/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Hello?' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Comment not found' });
    }
  });

  it('gives 404 when the comment belongs to a different post', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: new Date() });
    const otherPost = await createPost(author, { publishedAt: new Date() });
    const reader = await createUser();
    const comment = await createComment(otherPost, reader);
    const token = await logIn(reader);

    const res = await request(app)
      .put(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Wrong post' });

    expect(res.status).toBe(404);
  });

  it('gives 404 when the post is unpublished', async () => {
    const post = await createPost(await createAuthor(), { publishedAt: null });
    const reader = await createUser();
    const comment = await createComment(post, reader);
    const token = await logIn(reader);

    const res = await request(app)
      .put(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Still here?' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Comment not found' });
  });

  it('lets the author change their own comment on an unpublished post', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: null });
    const comment = await createComment(post, author, { body: 'Typo hree' });
    const token = await logIn(author);

    const res = await request(app)
      .put(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Typo here' });

    expect(res.status).toBe(200);
    expect(res.body.body).toBe('Typo here');
  });
});

describe('DELETE /posts/:postId/comments/:commentId', () => {
  it("lets the comment's writer remove it", async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const reader = await createUser();
    const comment = await createComment(post, reader);
    const token = await logIn(reader);

    const res = await request(app)
      .delete(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    const list = await request(app).get(`/posts/${post.id}/comments`);
    expect(list.body).toEqual([]);
  });

  it("lets the author remove a reader's comment", async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: new Date() });
    const comment = await createComment(post, await createUser());
    const token = await logIn(author);

    const res = await request(app)
      .delete(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    const list = await request(app).get(`/posts/${post.id}/comments`);
    expect(list.body).toEqual([]);
  });

  it('lets the author remove a comment on an unpublished post', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: null });
    const comment = await createComment(post, await createUser());
    const token = await logIn(author);

    const res = await request(app)
      .delete(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    const list = await request(app)
      .get(`/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${token}`);
    expect(list.body).toEqual([]);
  });

  it('refuses another reader, and keeps the comment', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const comment = await createComment(post, await createUser(), {
      body: 'Still here',
    });
    const token = await logIn(await createUser());

    const res = await request(app)
      .delete(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'You can only delete your own comments',
    });
    const list = await request(app).get(`/posts/${post.id}/comments`);
    expect(list.body.map((c) => c.body)).toEqual(['Still here']);
  });

  it('refuses a visitor who is not logged in', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const comment = await createComment(post, await createUser());

    const res = await request(app).delete(
      `/posts/${post.id}/comments/${comment.id}`,
    );

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Please log in first' });
  });

  it('gives 404 for a comment that does not exist', async () => {
    const post = await createPost(await createAuthor(), {
      publishedAt: new Date(),
    });
    const token = await logIn(await createUser());

    for (const commentId of ['999', 'abc']) {
      const res = await request(app)
        .delete(`/posts/${post.id}/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Comment not found' });
    }
  });

  it('gives 404 when the comment belongs to a different post', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: new Date() });
    const otherPost = await createPost(author, { publishedAt: new Date() });
    const reader = await createUser();
    const comment = await createComment(otherPost, reader);
    const token = await logIn(reader);

    const res = await request(app)
      .delete(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('gives 404 when the post is unpublished', async () => {
    const post = await createPost(await createAuthor(), { publishedAt: null });
    const reader = await createUser();
    const comment = await createComment(post, reader);
    const token = await logIn(reader);

    const res = await request(app)
      .delete(`/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Comment not found' });
  });
});
