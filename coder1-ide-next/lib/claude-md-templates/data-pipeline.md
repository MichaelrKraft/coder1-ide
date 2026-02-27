---
id: data-pipeline
name: Data Pipeline / ETL
description: Python data pipeline with scheduling, transforms, and monitoring
category: data
tags: [python, etl, pandas, airflow, data-engineering]
---

# Project Overview
[Describe the data sources, transformations, and destination systems.]

## Tech Stack
- Language: Python 3.11+
- Orchestration: Apache Airflow or Prefect
- Transforms: pandas, polars, or dbt
- Storage: S3 / GCS + data warehouse (Snowflake, BigQuery, Redshift)
- Monitoring: Grafana + Prometheus

## Key Directories
- `dags/` - Pipeline DAG definitions
- `transforms/` - Data transformation logic
- `loaders/` - Source connectors and destination writers
- `tests/` - Unit tests for transforms
- `config/` - Environment-specific configuration

## Development Commands
- `python -m pytest` - Run tests
- `airflow dags test <dag_id>` - Test a DAG locally
- `ruff check .` - Lint
- `mypy .` - Type check

## Code Standards
- Each transform should be a pure function with typed inputs/outputs
- Never mutate source data — always produce new DataFrames
- Log row counts and schema at each pipeline stage
- Handle schema drift explicitly (fail fast or map columns)
- Write unit tests for every transform function

## Git Workflow
- Feature branches from `main`
- DAG changes require review from a data engineer
- Tag releases that correspond to schema migrations
