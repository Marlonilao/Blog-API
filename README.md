# Blog API

The Odin Project's [Blog API](https://www.theodinproject.com/lessons/node-path-nodejs-blog-api) assignment. One repo with three apps, each with its own dependencies:

- `api/`: Express + Prisma + PostgreSQL REST API
- `public-site/`: React (Vite) site for readers
- `author-site/`: React (Vite) site for the author

## Setup

You need Node 22 and PostgreSQL 16.

1. Create two databases, one for development and one for tests:

   ```sh
   createdb blog_api
   createdb blog_api_test
   ```

2. Copy each example environment file and fill it in:

   ```sh
   cp api/.env.example api/.env             # points at blog_api
   cp api/.env.example api/.env.test        # points at blog_api_test
   cp public-site/.env.example public-site/.env
   cp author-site/.env.example author-site/.env
   ```

3. Install everything (this also generates the Prisma client):

   ```sh
   npm run install:all
   ```

## Running the apps

Start each app in its own terminal:

| App         | Command              | Address               |
| ----------- | -------------------- | --------------------- |
| API         | `npm run dev:api`    | http://localhost:3000 |
| Public site | `npm run dev:public` | http://localhost:5173 |
| Author site | `npm run dev:author` | http://localhost:5174 |

Both sites should say "API is connected". `GET /health` on the API returns `{ "ok": true }`.

## Tests

```sh
npm test
```

This runs the API's Jest + Supertest tests against the test database from `api/.env.test`. The sites are checked by hand in the browser.
