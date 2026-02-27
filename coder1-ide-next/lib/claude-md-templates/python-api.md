---
id: python-api
name: Python FastAPI
description: REST API with FastAPI, Pydantic, and SQLAlchemy
category: api
tags: [python, fastapi, rest, sqlalchemy, pydantic]
---

# Project Overview
[Describe the API purpose, its consumers, and primary domain.]

## Tech Stack
- Framework: FastAPI
- Validation: Pydantic v2
- ORM: SQLAlchemy 2.x with Alembic migrations
- Database: PostgreSQL
- Auth: JWT (python-jose)

## Key Directories
- `app/routers/` - Route handlers grouped by resource
- `app/models/` - SQLAlchemy ORM models
- `app/schemas/` - Pydantic request/response schemas
- `app/services/` - Business logic layer
- `app/core/` - Config, security, dependencies

## Development Commands
- `uvicorn app.main:app --reload` - Start dev server
- `pytest` - Run tests
- `alembic upgrade head` - Apply migrations
- `ruff check .` - Lint

## Code Standards
- Use Pydantic models for all I/O validation
- Separate routers, services, and models
- Write pytest tests for all endpoints
- Use dependency injection for DB sessions and auth
- Never return raw ORM objects — always use response schemas

## Git Workflow
- Feature branches from `main`
- Run `pytest` before pushing
- Include migration files in feature branches
