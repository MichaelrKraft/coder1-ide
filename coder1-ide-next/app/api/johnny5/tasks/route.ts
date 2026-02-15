/**
 * Johnny5 Mission Control Tasks API
 *
 * GET /api/johnny5/tasks - Returns REAL list of tasks in the queue
 * POST /api/johnny5/tasks - Create a new task for Johnny5
 *
 * Mission Control is the task management hub showing:
 * - Queued tasks waiting to be processed
 * - In-progress work
 * - Completed tasks with results (PRs, reports, skills)
 * - Failed tasks with error information
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
  Johnny5PaginatedResponse,
  Johnny5Task,
  Johnny5TaskStatus,
  Johnny5TaskType,
  Johnny5TaskTrigger
} from '@/types/johnny5';
import { getTasks, createTask } from '@/services/johnny5/task-tracker';

// Force dynamic rendering - tasks change frequently
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const status = searchParams.get('status') as Johnny5TaskStatus | null;
    const type = searchParams.get('type') as Johnny5TaskType | null;
    const priority = searchParams.get('priority');
    const triggeredBy = searchParams.get('triggeredBy') as Johnny5TaskTrigger | null;

    // Get REAL tasks from task tracker (already sorted)
    const tasks = await getTasks({
      status: status || undefined,
      type: type || undefined,
      priority: priority || undefined,
      triggeredBy: triggeredBy || undefined,
    });

    // Paginate
    const total = tasks.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedTasks = tasks.slice(startIndex, startIndex + pageSize);

    const response: Johnny5APIResponse<Johnny5PaginatedResponse<Johnny5Task>> = {
      success: true,
      data: {
        items: paginatedTasks,
        total,
        page,
        pageSize,
        hasMore: startIndex + pageSize < total
      },
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Tasks API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tasks',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST handler to create a new task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { title, description, type, priority = 'medium', reasoning, triggeredBy } = body;

    if (!title || !description || !type) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Missing required fields: title, description, type',
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate type
    const validTypes: Johnny5TaskType[] = ['build', 'research', 'monitor', 'fix', 'create_pr', 'skill', 'trend'];
    if (!validTypes.includes(type)) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create task using REAL task tracker
    const newTask = createTask({
      title,
      description,
      type,
      priority,
      reasoning: reasoning || `User requested task: ${title}`,
      triggeredBy: triggeredBy || 'user',
    });

    console.log(`[Johnny5 Mission Control] New task created: ${title} (${type})`);

    const response: Johnny5APIResponse<Johnny5Task> = {
      success: true,
      data: newTask,
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('[Johnny5 Tasks API] POST Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create task',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}
