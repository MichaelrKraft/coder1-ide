# Testing Strategy Skill

This skill teaches comprehensive testing strategies for building reliable software.

## Testing Philosophy

**Why Test?**
1. **Confidence**: Know your code works before deploying
2. **Documentation**: Tests show how code should be used
3. **Regression Prevention**: Catch bugs when refactoring
4. **Design Feedback**: Hard to test code is usually poorly designed
5. **Faster Development**: Fix bugs early, save time later

**What to Test:**
- ✅ Business logic and algorithms
- ✅ User interactions and workflows
- ✅ API endpoints and data validation
- ✅ Error handling and edge cases
- ❌ Third-party libraries (assume they work)
- ❌ Trivial getters/setters
- ❌ Framework code

## The Testing Pyramid

```
      /\
     /E2E\          Few (5-10%)
    /______\        - Full user workflows
   /        \       - Slow, expensive
  /Integration\     Moderate (20-30%)
 /______________\   - API and database
/                \  - Module interactions
/   Unit Tests    \ Many (60-75%)
/__________________\- Pure functions
                    - Fast, cheap
```

**Distribute tests based on value and cost:**
- **Unit Tests**: 60-75% (fast, test business logic)
- **Integration Tests**: 20-30% (test module interactions)
- **E2E Tests**: 5-10% (test critical user paths)

## Unit Testing Strategy

### 1. Test Pure Functions First

**Pure functions are easiest to test:**
```typescript
// ✅ Pure function - easy to test
function calculateTotal(items: Item[], taxRate: number): number {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return subtotal * (1 + taxRate);
}

// Test
describe('calculateTotal', () => {
  it('should calculate total with tax', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 1 }
    ];
    expect(calculateTotal(items, 0.1)).toBe(27.5);
  });
});
```

### 2. Test Edge Cases

**Don't just test the happy path:**
```typescript
describe('divide', () => {
  it('should divide positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });
  
  it('should handle zero numerator', () => {
    expect(divide(0, 5)).toBe(0);
  });
  
  it('should throw on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
  
  it('should handle negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
  });
  
  it('should handle decimals', () => {
    expect(divide(5, 2)).toBe(2.5);
  });
});
```

### 3. Use AAA Pattern

**Arrange, Act, Assert:**
```typescript
it('should add item to cart', () => {
  // Arrange - Set up test data
  const cart = new ShoppingCart();
  const item = { id: '1', name: 'Book', price: 20 };
  
  // Act - Perform the action
  cart.addItem(item);
  
  // Assert - Verify the result
  expect(cart.items).toHaveLength(1);
  expect(cart.items[0]).toEqual(item);
  expect(cart.total).toBe(20);
});
```

### 4. Test Error Conditions

**Ensure errors are handled properly:**
```typescript
describe('UserService', () => {
  it('should throw on invalid email', async () => {
    await expect(
      userService.create({ email: 'invalid', password: 'pass' })
    ).rejects.toThrow('Invalid email format');
  });
  
  it('should throw on duplicate user', async () => {
    await userService.create({ email: 'test@example.com', password: 'pass' });
    
    await expect(
      userService.create({ email: 'test@example.com', password: 'pass' })
    ).rejects.toThrow('User already exists');
  });
});
```

## Component Testing Strategy (React)

### 1. Test User Interactions

**Simulate what users do:**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('LoginForm', () => {
  it('should submit form with credentials', async () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    
    // User types email
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@test.com' }
    });
    
    // User types password
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    // User clicks submit
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Form submits with data
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'password123'
      });
    });
  });
});
```

### 2. Test Loading and Error States

**Ensure all states are handled:**
```typescript
describe('UserProfile', () => {
  it('should show loading state initially', () => {
    render(<UserProfile userId="1" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  
  it('should display user data after loading', async () => {
    mockApi.getUser.mockResolvedValue({ name: 'John' });
    render(<UserProfile userId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });
  
  it('should show error message on failure', async () => {
    mockApi.getUser.mockRejectedValue(new Error('Network error'));
    render(<UserProfile userId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading/i)).toBeInTheDocument();
    });
  });
});
```

### 3. Test Accessibility

**Ensure components are accessible:**
```typescript
it('should be keyboard accessible', () => {
  render(<Modal onClose={jest.fn()} />);
  
  const closeButton = screen.getByRole('button', { name: /close/i });
  expect(closeButton).toHaveAttribute('aria-label');
  
  // Test keyboard navigation
  fireEvent.keyDown(closeButton, { key: 'Enter' });
  // ... verify interaction
});
```

## Integration Testing Strategy

### 1. Test API Endpoints

**Test full request/response cycle:**
```typescript
import request from 'supertest';
import { app } from '../app';

describe('POST /api/users', () => {
  beforeEach(async () => {
    await db.user.deleteMany(); // Clean database
  });
  
  it('should create user and return token', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!'
      })
      .expect(201);
    
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.token).toBeDefined();
  });
  
  it('should validate email format', async () => {
    await request(app)
      .post('/api/users')
      .send({
        email: 'invalid-email',
        password: 'password'
      })
      .expect(400);
  });
});
```

### 2. Test Database Operations

**Ensure data persistence works:**
```typescript
describe('User Repository', () => {
  it('should save and retrieve user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'hashed_password'
    };
    
    const created = await userRepo.create(userData);
    const retrieved = await userRepo.findById(created.id);
    
    expect(retrieved).toMatchObject(userData);
  });
  
  it('should enforce unique email constraint', async () => {
    await userRepo.create({ email: 'test@example.com', password: 'pass' });
    
    await expect(
      userRepo.create({ email: 'test@example.com', password: 'pass' })
    ).rejects.toThrow();
  });
});
```

### 3. Test Module Interactions

**Verify modules work together:**
```typescript
describe('Order Processing', () => {
  it('should process order end-to-end', async () => {
    // Arrange
    const user = await userService.create(userData);
    const product = await productService.create(productData);
    
    // Act
    const order = await orderService.create({
      userId: user.id,
      items: [{ productId: product.id, quantity: 2 }]
    });
    
    // Assert
    expect(order.total).toBe(product.price * 2);
    expect(order.status).toBe('pending');
    
    // Verify inventory updated
    const updatedProduct = await productService.findById(product.id);
    expect(updatedProduct.stock).toBe(product.stock - 2);
  });
});
```

## E2E Testing Strategy

### 1. Test Critical User Journeys

**Focus on high-value workflows:**
```typescript
import { test, expect } from '@playwright/test';

test('user can register and complete purchase', async ({ page }) => {
  // Registration
  await page.goto('/register');
  await page.fill('input[name="email"]', 'buyer@test.com');
  await page.fill('input[name="password"]', 'SecurePass123!');
  await page.click('button:has-text("Sign Up")');
  
  // Browse products
  await expect(page).toHaveURL('/dashboard');
  await page.click('text=Shop');
  await page.click('text=Add to Cart >> nth=0');
  
  // Checkout
  await page.click('[aria-label="Shopping Cart"]');
  await page.click('text=Checkout');
  await page.fill('input[name="cardNumber"]', '4242424242424242');
  await page.click('button:has-text("Complete Purchase")');
  
  // Verify success
  await expect(page.locator('text=Order confirmed')).toBeVisible();
});
```

### 2. Test Across Browsers

**Ensure cross-browser compatibility:**
```typescript
test.describe('Login', () => {
  test.use({ browserName: 'chromium' });
  test('should work in Chrome', async ({ page }) => {
    // test logic
  });
  
  test.use({ browserName: 'firefox' });
  test('should work in Firefox', async ({ page }) => {
    // test logic
  });
  
  test.use({ browserName: 'webkit' });
  test('should work in Safari', async ({ page }) => {
    // test logic
  });
});
```

## Mocking Strategy

### 1. Mock External APIs

**Don't call real APIs in tests:**
```typescript
// Using Mock Service Worker (MSW)
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/users/:id', (req, res, ctx) => {
    return res(ctx.json({ id: req.params.id, name: 'Mock User' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 2. Mock Database for Unit Tests

**Use in-memory database:**
```typescript
// sqlite in-memory for fast tests
const testDb = new Database(':memory:');
```

### 3. Spy on Dependencies

**Verify function calls without mocking implementation:**
```typescript
it('should log errors', () => {
  const consoleSpy = jest.spyOn(console, 'error');
  
  performOperationThatErrors();
  
  expect(consoleSpy).toHaveBeenCalledWith('Error:', expect.any(Error));
  
  consoleSpy.mockRestore();
});
```

## Test Organization

### 1. Describe Blocks for Grouping

```typescript
describe('ShoppingCart', () => {
  describe('addItem', () => {
    it('should add item to empty cart', () => {});
    it('should increment quantity for existing item', () => {});
    it('should throw for invalid item', () => {});
  });
  
  describe('removeItem', () => {
    it('should remove item from cart', () => {});
    it('should throw if item not in cart', () => {});
  });
  
  describe('calculateTotal', () => {
    it('should sum all item prices', () => {});
    it('should apply discount if applicable', () => {});
  });
});
```

### 2. Setup and Teardown

```typescript
describe('Database Tests', () => {
  beforeAll(async () => {
    // Setup - runs once before all tests
    await db.connect();
  });
  
  afterAll(async () => {
    // Teardown - runs once after all tests
    await db.disconnect();
  });
  
  beforeEach(async () => {
    // Runs before each test
    await db.user.deleteMany();
  });
  
  afterEach(() => {
    // Runs after each test
    jest.clearAllMocks();
  });
});
```

## Coverage Strategy

### 1. Measure Coverage

```bash
# Run tests with coverage
npm test -- --coverage

# Set coverage thresholds
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 75,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### 2. Focus on Important Code

**Prioritize testing:**
1. Business logic (highest value)
2. Security-critical code
3. Complex algorithms
4. Bug-prone areas
5. Public APIs

**Don't waste time testing:**
1. Third-party code
2. Trivial code
3. UI layout (use visual regression instead)

## Testing Best Practices

1. **Test Behavior, Not Implementation**
   - Test what code does, not how it does it
   - Tests should survive refactoring

2. **Keep Tests Fast**
   - Unit tests should run in milliseconds
   - Use in-memory databases
   - Mock slow dependencies

3. **Make Tests Independent**
   - Each test should run in isolation
   - No shared state between tests
   - Tests should pass in any order

4. **Use Descriptive Names**
   - `it('should throw error for negative quantity', ...)`
   - Not `it('works', ...)`

5. **One Assertion Per Test** (When Possible)
   - Easier to identify failures
   - More granular feedback

6. **Avoid Test Logic**
   - No if/else, loops, or complex logic in tests
   - Tests should be simple and obvious

7. **Keep Tests Maintainable**
   - DRY - Extract common setup
   - Clear and readable
   - Update tests when code changes

## TDD Workflow (Optional)

**Test-Driven Development:**
```
1. Write failing test (RED)
2. Write minimal code to pass (GREEN)
3. Refactor while keeping tests passing (REFACTOR)
4. Repeat
```

**Benefits:**
- Forces you to think about design
- Ensures code is testable
- High coverage by default
- Tests document requirements

Remember: Tests are an investment. Write tests that give you confidence without wasting time on low-value tests.
