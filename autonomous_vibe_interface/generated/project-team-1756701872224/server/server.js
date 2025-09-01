const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
let todos = [
  {
    id: '1',
    text: 'Welcome to your AI-generated Todo App!',
    completed: false,
    createdAt: new Date().toISOString()
  }
];

// Routes
app.get('/api/todos', (req, res) => {
  res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const todo = {
    id: Date.now().toString(),
    text,
    completed: false,
    createdAt: new Date().toISOString()
  };

  todos.push(todo);
  res.status(201).json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { completed, text } = req.body;
  
  const todo = todos.find(t => t.id === id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  if (completed !== undefined) todo.completed = completed;
  if (text !== undefined) todo.text = text;
  todo.updatedAt = new Date().toISOString();

  res.json(todo);
});

app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  todos = todos.filter(t => t.id !== id);
  res.status(204).send();
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Todo API server running on port ${PORT}`);
});
