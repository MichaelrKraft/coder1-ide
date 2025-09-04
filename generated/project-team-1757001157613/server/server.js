Sure, I'd be happy to help you with that. Here's a sample implementation of the database schema and API endpoints for a todo list app using Node.js, Express.js, and TypeScript.

**Database Schema**

We'll be using a relational database, such as PostgreSQL or MySQL, to store the todo items. The database schema will consist of a single table called `todos` with the following columns:

```
id: integer, primary key, auto-increment
title: varchar, not null
description: text, nullable
completed: boolean, default false
created_at: timestamp, default current_timestamp
updated_at: timestamp, default current_timestamp
```

**API Endpoints**

Here's a list of the API endpoints we'll be implementing:

1. **GET /todos**: Retrieve a list of all todo items.
2. **GET /todos/:id**: Retrieve a specific todo item by its ID.
3. **POST /todos**: Create a new todo item.
4. **PUT /todos/:id**: Update an existing todo item.
5. **DELETE /todos/:id**: Delete a todo item.

**Code Implementation**

Here's the code implementation for the API endpoints:

```typescript
import express, { Request, Response } from 'express';
import { Pool } from 'pg'; // or any other database client library

const app = express();
app.use(express.json());

// Database connection
const pool = new Pool({
  // Database connection details
});

// GET /todos
app.get('/todos', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM todos');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /todos/:id
app.get('/todos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM todos WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Todo not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /todos
app.post('/todos', async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO todos (title, description) VALUES ($1, $2) RETURNING *',
      [title, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /todos/:id
app.put('/todos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;
    const { rows } = await pool.query(
      'UPDATE todos SET title = $1, description = $2, completed = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [title, description, completed, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Todo not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /todos/:id
app.delete('/todos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Todo not found' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

This implementation follows RESTful API best practices, including proper error handling and response formats. The code is written in TypeScript to ensure type safety and better maintainability.

Here's a breakdown of the code:

1. We import the necessary modules, including `express` and `pg` (for PostgreSQL).
2. We create an Express app and configure it to use JSON as the request body parser.
3. We establish a connection to the database using the `Pool` class from the `pg` library.
4. We define the API endpoints and their corresponding handlers:
   - `GET /todos`: Retrieves all todo items from the database.
   - `GET /todos/:id`: Retrieves a specific todo item by its ID.
   - `POST /todos`: Creates a new todo item.
   - `PUT /todos/:id`: Updates an existing todo item.
   - `DELETE /todos/:id`: Deletes a todo item.
5. Each endpoint handler uses the `pool.query()` method to interact with the database and perform the necessary CRUD operations.
6. The handlers include proper error handling, returning appropriate HTTP status codes and error messages.
7. Finally, we start the server and listen for incoming requests on port 3000.

This implementation can be easily integrated with a React and TypeScript frontend to create a complete todo list application.