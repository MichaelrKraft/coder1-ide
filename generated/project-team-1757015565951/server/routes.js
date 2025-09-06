Sure, here's an example of a simple Todo app with a database schema and API endpoints implemented using Node.js, Express.js, and a database (in this case, MongoDB).

**Database Schema**

We'll use MongoDB as the database, and the schema for the Todo model will look like this:

```javascript
const mongoose = require('mongoose');

const TodoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Todo = mongoose.model('Todo', TodoSchema);
module.exports = Todo;
```

The `Todo` model has the following fields:
- `title`: The title of the todo item (required)
- `description`: The description of the todo item (optional)
- `completed`: The status of the todo item (default is `false`)
- `createdAt`: The date and time when the todo item was created (default is the current time)
- `updatedAt`: The date and time when the todo item was last updated (default is the current time)

**API Endpoints**

Here's an example implementation of the API endpoints for the Todo app:

```javascript
const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');

// Get all todos
router.get('/todos', async (req, res) => {
  try {
    const todos = await Todo.find();
    res.json(todos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific todo
router.get('/todos/:id', getTodo, (req, res) => {
  res.json(res.todo);
});

// Create a new todo
router.post('/todos', async (req, res) => {
  const todo = new Todo({
    title: req.body.title,
    description: req.body.description
  });

  try {
    const newTodo = await todo.save();
    res.status(201).json(newTodo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a todo
router.patch('/todos/:id', getTodo, async (req, res) => {
  if (req.body.title != null) {
    res.todo.title = req.body.title;
  }
  if (req.body.description != null) {
    res.todo.description = req.body.description;
  }
  if (req.body.completed != null) {
    res.todo.completed = req.body.completed;
  }
  res.todo.updatedAt = Date.now();

  try {
    const updatedTodo = await res.todo.save();
    res.json(updatedTodo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a todo
router.delete('/todos/:id', getTodo, async (req, res) => {
  try {
    await res.todo.remove();
    res.json({ message: 'Deleted Todo' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getTodo(req, res, next) {
  let todo;
  try {
    todo = await Todo.findById(req.params.id);
    if (todo == null) {
      return res.status(404).json({ message: 'Cannot find todo' });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.todo = todo;
  next();
}

module.exports = router;
```

The API endpoints are:

1. `GET /todos`: Retrieves all todo items.
2. `GET /todos/:id`: Retrieves a specific todo item by its ID.
3. `POST /todos`: Creates a new todo item.
4. `PATCH /todos/:id`: Updates a specific todo item by its ID.
5. `DELETE /todos/:id`: Deletes a specific todo item by its ID.

The `getTodo` middleware function is used to fetch a specific todo item by its ID and attach it to the `res.todo` property, which is then used in the update and delete endpoints.

The API follows RESTful best practices, with proper HTTP methods, status codes, and error handling. The code is also well-documented, making it easy to understand and maintain.

To use this API, you would need to set up a MongoDB database, connect to it in your Node.js application, and mount the router on the appropriate route.