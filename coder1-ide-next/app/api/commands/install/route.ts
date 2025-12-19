import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * API route for installing Claude Code slash commands to ~/.claude/commands/
 *
 * Commands are installed as .md files that Claude Code reads when user types /commandName
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commandId, content, name } = body;

    if (!commandId) {
      return NextResponse.json(
        { error: 'commandId is required' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    // Determine installation path (always global ~/.claude/commands/)
    const commandsDir = path.join(os.homedir(), '.claude', 'commands');

    // Create commands directory if it doesn't exist
    await fs.mkdir(commandsDir, { recursive: true });

    // Determine filename (ensure .md extension)
    const filename = commandId.endsWith('.md') ? commandId : `${commandId}.md`;
    const commandPath = path.join(commandsDir, filename);

    // Check if already installed
    try {
      await fs.access(commandPath);
      return NextResponse.json({
        success: true,
        message: 'Command already installed',
        alreadyInstalled: true,
        commandId,
        commandPath
      });
    } catch {
      // File doesn't exist, proceed with installation
    }

    // Write the command file
    await fs.writeFile(commandPath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      message: `Command "/${commandId}" installed successfully`,
      commandId,
      commandPath,
      name: name || commandId,
      restartRequired: false // Commands are loaded dynamically
    });

  } catch (error) {
    console.error('Command installation error:', error);
    return NextResponse.json(
      { error: 'Failed to install command', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check installation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commandId = searchParams.get('commandId');

    const commandsDir = path.join(os.homedir(), '.claude', 'commands');

    if (!commandId) {
      // Return all installed commands
      try {
        const files = await fs.readdir(commandsDir);
        const commands = files
          .filter(f => f.endsWith('.md'))
          .map(f => f.replace('.md', ''));

        return NextResponse.json({
          installedCommands: commands,
          commandsDir
        });
      } catch {
        return NextResponse.json({
          installedCommands: [],
          commandsDir
        });
      }
    }

    // Check installation status for specific command
    const filename = commandId.endsWith('.md') ? commandId : `${commandId}.md`;
    const commandPath = path.join(commandsDir, filename);

    let installed = false;
    let content: string | undefined;

    try {
      await fs.access(commandPath);
      installed = true;
      content = await fs.readFile(commandPath, 'utf-8');
    } catch {
      installed = false;
    }

    return NextResponse.json({
      commandId,
      installed,
      commandPath,
      content: installed ? content : undefined
    });

  } catch (error) {
    console.error('Command status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check command status', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE endpoint to uninstall a command
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commandId = searchParams.get('commandId');

    if (!commandId) {
      return NextResponse.json(
        { error: 'commandId is required' },
        { status: 400 }
      );
    }

    const commandsDir = path.join(os.homedir(), '.claude', 'commands');
    const filename = commandId.endsWith('.md') ? commandId : `${commandId}.md`;
    const commandPath = path.join(commandsDir, filename);

    try {
      await fs.unlink(commandPath);
      return NextResponse.json({
        success: true,
        message: `Command "/${commandId}" uninstalled successfully`,
        commandId
      });
    } catch {
      return NextResponse.json(
        { error: 'Command not found or already uninstalled' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Command uninstall error:', error);
    return NextResponse.json(
      { error: 'Failed to uninstall command', details: String(error) },
      { status: 500 }
    );
  }
}
