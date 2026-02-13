// Second Brain Database Schema
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const memories = sqliteTable('memories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  category: text('category'), // auto-detected: idea, book, link, task, note
  source: text('source'), // 'chat', 'telegram', 'ui'
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  tags: text('tags'), // JSON array of tags
  metadata: text('metadata'), // JSON for extensibility
});

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
