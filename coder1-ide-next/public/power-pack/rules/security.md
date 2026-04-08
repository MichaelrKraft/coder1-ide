# Security Rules

- Never hardcode API keys, passwords, or tokens
- Use environment variables for secrets
- Validate all user inputs at system boundaries
- Use parameterized queries — never string concatenation for SQL
- Hash passwords with bcrypt/argon2 (never MD5/SHA1)
- Never log secrets, even partially
