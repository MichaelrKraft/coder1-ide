Sure, I'd be happy to help you with that. Here's an example of a database schema and API endpoints for a web application using Node.js, Express.js, and a relational database (in this case, PostgreSQL).

**Database Schema**

Let's assume we're building a simple blog application. The database schema would look like this:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  post_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);
```

This schema includes three tables: `users`, `posts`, and `comments`. The `users` table stores user information, the `posts` table stores blog posts, and the `comments` table stores comments made on those posts.

**API Endpoints**

Here's an example implementation of the API endpoints using Node.js, Express.js, and a PostgreSQL database:

```javascript
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// Connect to the PostgreSQL database
const pool = new Pool({
  user: 'your_username',
  host: 'your_host',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
});

// User registration
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *';
    const { rows } = await pool.query(query, [username, email, hashedPassword]);

    const user = rows[0];
    const token = jwt.sign({ userId: user.id }, 'your_secret_key');

    res.status(201).json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, 'your_secret_key');
    res.json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new post
app.post('/posts', async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id; // Assuming you have middleware to extract the user ID from the token

    const query = 'INSERT INTO posts (title, content, author_id) VALUES ($1, $2, $3) RETURNING *';
    const { rows } = await pool.query(query, [title, content, userId]);

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all posts
app.get('/posts', async (req, res) => {
  try {
    const query = 'SELECT * FROM posts';
    const { rows } = await pool.query(query);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single post
app.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM posts WHERE id = $1';
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new comment
app.post('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; // Assuming you have middleware to extract the user ID from the token

    const query = 'INSERT INTO comments (content, post_id, author_id) VALUES ($1, $2, $3) RETURNING *';
    const { rows } = await pool.query(query, [content, postId, userId]);

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comments for a post
app.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;

    const query = 'SELECT * FROM comments WHERE post_id = $1';
    const { rows } = await pool.query(query, [postId]);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

This implementation includes the following API endpoints:

1. **User Registration**: `POST /register`
2. **User Login**: `POST /login`
3. **Create a New Post**: `POST /posts`
4. **Get All Posts**: `GET /posts`
5. **Get a Single Post**: `GET /posts/:id`
6. **Create a New Comment**: `POST /posts/:postId/comments`
7. **Get Comments for a Post**: `GET /posts/:postId/comments`

The code includes error handling, security considerations (password hashing and JWT-based authentication), and follows RESTful API best practices. You can further extend this implementation to include features like updating and deleting posts and comments, pagination, and more.

Remember to replace the database connection details (`user`, `host`, `database`, `password`) with your own credentials, and replace `'your_secret_key'` with a secure secret key for JWT signing.