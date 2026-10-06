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

  it('shows the author an unpublished post too', async () => {
    const author = await createAuthor();
    const post = await createPost(author, {
      title: 'Unpublished',
      publishedAt: null,
    });
    const token = await logIn(author);

    const res = await request(app)
      .get(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Unpublished');
    expect(res.body.publishedAt).toBeNull();
  });

  it("hides an unpublished post from a reader, even with a reader's token", async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: null });
    const token = await logIn(await createUser());

    const res = await request(app)
      .get(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
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

describe('POST /posts', () => {
  it('lets the author create a post, which starts unpublished', async () => {
    const author = await createAuthor({ username: 'marlon' });
    const token = await logIn(author);

    const res = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New post', body: 'Some words.' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      title: 'New post',
      body: 'Some words.',
      publishedAt: null,
      createdAt: expect.any(String),
      editedAt: null,
      author: { username: 'marlon' },
    });
  });

  it('refuses a post with a missing or blank title or body', async () => {
    const token = await logIn(await createAuthor());

    for (const post of [
      { body: 'Some words.' },
      { title: 'New post' },
      { title: '   ', body: 'Some words.' },
      { title: 'New post', body: '' },
    ]) {
      const res = await request(app)
        .post('/posts')
        .set('Authorization', `Bearer ${token}`)
        .send(post);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'A post needs a title and a body' });
    }

    const list = await request(app)
      .get('/posts')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body).toEqual([]);
  });
});

describe('PUT /posts/:postId', () => {
  it('lets the author edit a post, which keeps its published date', async () => {
    const author = await createAuthor({ username: 'marlon' });
    const post = await createPost(author, {
      title: 'Old title',
      body: 'Old words.',
      publishedAt: new Date('2026-09-26T10:00:00Z'),
    });
    const token = await logIn(author);

    const res = await request(app)
      .put(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New title', body: 'New words.' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: post.id,
      title: 'New title',
      body: 'New words.',
      publishedAt: '2026-09-26T10:00:00.000Z',
      createdAt: post.createdAt.toISOString(),
      editedAt: expect.any(String),
      author: { username: 'marlon' },
    });

    // Visitors see the new version too, marked as edited.
    const visitorView = await request(app).get(`/posts/${post.id}`);
    expect(visitorView.body.title).toBe('New title');
    expect(visitorView.body.editedAt).not.toBeNull();
  });

  it('does not mark a post edited when nothing changed', async () => {
    const author = await createAuthor();
    const post = await createPost(author, {
      title: 'Same title',
      body: 'Same words.',
    });
    const token = await logIn(author);

    const res = await request(app)
      .put(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Same title', body: 'Same words.' });

    expect(res.status).toBe(200);
    expect(res.body.editedAt).toBeNull();
  });

  it('keeps an unpublished post unpublished', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: null });
    const token = await logIn(author);

    const res = await request(app)
      .put(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New title', body: 'New words.' });

    expect(res.status).toBe(200);
    expect(res.body.publishedAt).toBeNull();
  });

  it('refuses a blank title and leaves the post as it was', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { title: 'Old title' });
    const token = await logIn(author);

    const res = await request(app)
      .put(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', body: 'New words.' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'A post needs a title and a body' });

    const after = await request(app)
      .get(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.title).toBe('Old title');
    expect(after.body.editedAt).toBeNull();
  });

  it('gives 404 for a post that does not exist', async () => {
    const token = await logIn(await createAuthor());

    const res = await request(app)
      .put('/posts/999')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New title', body: 'New words.' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Post not found' });
  });
});

describe('DELETE /posts/:postId', () => {
  it('lets the author delete a post', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: new Date() });
    const token = await logIn(author);

    const res = await request(app)
      .delete(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    const after = await request(app).get(`/posts/${post.id}`);
    expect(after.status).toBe(404);
  });

  it('gives 404 for a post that does not exist', async () => {
    const token = await logIn(await createAuthor());

    const res = await request(app)
      .delete('/posts/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Post not found' });
  });
});

describe('PATCH /posts/:postId', () => {
  it("publishes a post with today's date, so visitors can see it", async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: null });
    const token = await logIn(author);

    const before = new Date();
    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ published: true });

    expect(res.status).toBe(200);
    expect(new Date(res.body.publishedAt) >= before).toBe(true);
    // Publishing isn't editing.
    expect(res.body.editedAt).toBeNull();

    const visitorView = await request(app).get(`/posts/${post.id}`);
    expect(visitorView.status).toBe(200);
  });

  it('unpublishes a post, hiding it from visitors again', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: new Date() });
    const token = await logIn(author);

    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ published: false });

    expect(res.status).toBe(200);
    expect(res.body.publishedAt).toBeNull();
    expect(res.body.editedAt).toBeNull();

    const visitorView = await request(app).get(`/posts/${post.id}`);
    expect(visitorView.status).toBe(404);
  });

  it('keeps the edited date of an edited post as it was', async () => {
    const author = await createAuthor();
    const editedAt = new Date('2026-09-20T10:00:00Z');
    const post = await createPost(author, { publishedAt: null, editedAt });
    const token = await logIn(author);

    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ published: true });

    expect(res.body.editedAt).toBe(editedAt.toISOString());
  });

  it('keeps the date of a post that is already published', async () => {
    const author = await createAuthor();
    const publishedAt = new Date('2026-09-01T10:00:00Z');
    const post = await createPost(author, { publishedAt });
    const token = await logIn(author);

    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ published: true });

    expect(res.body.publishedAt).toBe(publishedAt.toISOString());
  });

  it('refuses anything but true or false', async () => {
    const author = await createAuthor();
    const post = await createPost(author, { publishedAt: null });
    const token = await logIn(author);

    for (const body of [{}, { published: 'true' }, { published: 1 }]) {
      const res = await request(app)
        .patch(`/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Published must be true or false' });
    }
  });

  it('gives 404 for a post that does not exist', async () => {
    const token = await logIn(await createAuthor());

    const res = await request(app)
      .patch('/posts/999')
      .set('Authorization', `Bearer ${token}`)
      .send({ published: true });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Post not found' });
  });
});

describe('Writing, editing, publishing and deleting posts', () => {
  // These are author-only. Each test tries all four and then checks that
  // the post is still there, still titled 'Original' and still published.

  it('turns away visitors with 401 and changes nothing', async () => {
    const author = await createAuthor();
    const post = await createPost(author, {
      title: 'Original',
      publishedAt: new Date(),
    });

    const createRes = await request(app)
      .post('/posts')
      .send({ title: 'New post', body: 'New words.' });
    expect(createRes.status).toBe(401);

    const editRes = await request(app)
      .put(`/posts/${post.id}`)
      .send({ title: 'Changed', body: 'Changed words.' });
    expect(editRes.status).toBe(401);

    const unpublishRes = await request(app)
      .patch(`/posts/${post.id}`)
      .send({ published: false });
    expect(unpublishRes.status).toBe(401);

    const deleteRes = await request(app).delete(`/posts/${post.id}`);
    expect(deleteRes.status).toBe(401);

    // Looked at with the author's token, so a wrongly created post would
    // show up even though new posts start unpublished.
    const authorToken = await logIn(author);
    const list = await request(app)
      .get('/posts')
      .set('Authorization', `Bearer ${authorToken}`);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].title).toBe('Original');
    expect(list.body[0].publishedAt).not.toBeNull();
  });

  it('turns away readers with 403 and changes nothing', async () => {
    const author = await createAuthor();
    const post = await createPost(author, {
      title: 'Original',
      publishedAt: new Date(),
    });
    const readerToken = await logIn(await createUser());

    const createRes = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${readerToken}`)
      .send({ title: 'New post', body: 'New words.' });
    expect(createRes.status).toBe(403);

    const editRes = await request(app)
      .put(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${readerToken}`)
      .send({ title: 'Changed', body: 'Changed words.' });
    expect(editRes.status).toBe(403);

    const unpublishRes = await request(app)
      .patch(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${readerToken}`)
      .send({ published: false });
    expect(unpublishRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${readerToken}`);
    expect(deleteRes.status).toBe(403);

    // Looked at with the author's token, so a wrongly created post would
    // show up even though new posts start unpublished.
    const authorToken = await logIn(author);
    const list = await request(app)
      .get('/posts')
      .set('Authorization', `Bearer ${authorToken}`);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].title).toBe('Original');
    expect(list.body[0].publishedAt).not.toBeNull();
  });
});
