Sure, here's an example of a simple Todo app with a database schema and API endpoints implemented using Node.js, Express.js, and a database (in this case, MongoDB).

**Database Schema**

We'll be using MongoDB as the database for this Todo app. The schema for the `todos` collection will be as follows:

```javascript
const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
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

const Todo = mongoose.model('Todo', todoSchema);
```

The `Todo` model has the following fields:
- `title`: The title of the todo item (required)
- `description`: The description of the todo item (optional)
- `completed`: The status of the todo item (default is `false`)
- `createdAt`: The date and time when the todo item was created (default is the current time)
- `updatedAt`: The date and time when the todo item was last updated (default is the current time)

**API Endpoints**

Here are the API endpoints for the Todo app:

1. **Get all todos**
   - Endpoint: `GET /api/todos`
   - Description: Retrieves all the todo items.
   - Response: An array of todo items.

2. **Get a specific todo**
   - Endpoint: `GET /api/todos/:id`
   - Description: Retrieves a specific todo item by its ID.
   - Response: The todo item.

3. **Create a new todo**
   - Endpoint: `POST /api/todos`
   - Description: Creates a new todo item.
   - Request body: The title and description of the new todo item.
   - Response: The newly created todo item.

4. **Update a todo**
   - Endpoint: `PUT /api/todos/:id`
   - Description: Updates a specific todo item by its ID.
   - Request body: The updated title, description, and/or completed status of the todo item.
   - Response: The updated todo item.

5. **Delete a todo**
   - Endpoint: `DELETE /api/todos/:id`
   - Description: Deletes a specific todo item by its ID.
   - Response: A success message.

Here's the implementation of the API endpoints using Express.js:

```javascript
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost/todo-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Todo model
const Todo = require('./models/Todo');

// Get all todos
app.get('/api/todos', async (req, res) => {
  try {
    const todos = await Todo.find();
    res.json(todos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific todo
app.get('/api/todos/:id', getTodo, (req, res) => {
  res.json(res.todo);
});

// Create a new todo
app.post('/api/todos', async (req, res) => {
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
app.put('/api/todos/:id', getTodo, async (req, res) => {
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
app.delete('/api/todos/:id', getTodo, async (req, res) => {
  try {
    await res.todo.remove();
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Middleware function to get a todo by ID
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

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
```

This implementation follows RESTful API best practices, with proper error handling and security considerations. The code is well-documented, and the database schema is designed to meet the requirements of the Todo app.