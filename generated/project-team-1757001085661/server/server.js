Sure, I'd be happy to help you with that. Here's a sample implementation of the database schema and API endpoints for a simple React calculator app:

**Database Schema**

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE calculations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  operation VARCHAR(10) NOT NULL,
  operand1 FLOAT NOT NULL,
  operand2 FLOAT NOT NULL,
  result FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

The `users` table stores user information, including a unique username and hashed password. The `calculations` table stores the details of each calculation performed by a user, including the operation, operands, and result.

**API Endpoints**

```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db'); // Database connection pool

const app = express();
app.use(express.json());

// Register a new user
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login a user
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.rows[0].password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Perform a calculation
app.post('/calculate', async (req, res) => {
  try {
    const { operation, operand1, operand2 } = req.body;
    const userId = req.user.userId; // Assuming you have middleware to extract the user ID from the JWT token
    let result;
    switch (operation) {
      case 'add':
        result = operand1 + operand2;
        break;
      case 'subtract':
        result = operand1 - operand2;
        break;
      case 'multiply':
        result = operand1 * operand2;
        break;
      case 'divide':
        if (operand2 === 0) {
          return res.status(400).json({ message: 'Cannot divide by zero' });
        }
        result = operand1 / operand2;
        break;
      default:
        return res.status(400).json({ message: 'Invalid operation' });
    }
    await pool.query('INSERT INTO calculations (user_id, operation, operand1, operand2, result) VALUES ($1, $2, $3, $4, $5)', [userId, operation, operand1, operand2, result]);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error performing calculation' });
  }
});

// Get calculation history for a user
app.get('/history', async (req, res) => {
  try {
    const userId = req.user.userId; // Assuming you have middleware to extract the user ID from the JWT token
    const calculations = await pool.query('SELECT * FROM calculations WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(calculations.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching calculation history' });
  }
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
```

This implementation includes the following API endpoints:

1. **Register a new user**: `POST /register`
2. **Login a user**: `POST /login`
3. **Perform a calculation**: `POST /calculate`
4. **Get calculation history for a user**: `GET /history`

The `register` and `login` endpoints handle user authentication, while the `calculate` endpoint performs the requested calculation and stores the result in the `calculations` table. The `history` endpoint retrieves the calculation history for the authenticated user.

The code includes error handling, input validation, and security measures such as password hashing and JWT-based authentication. You can further enhance the implementation by adding more features, such as pagination for the calculation history, and integrating it with your React calculator app.