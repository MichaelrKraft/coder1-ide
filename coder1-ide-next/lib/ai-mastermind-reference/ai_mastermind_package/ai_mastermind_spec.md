# AI Mastermind System: Technical Specification and Architecture

**Author:** Manus AI
**Date:** 2025-11-14
**Version:** 1.0

## 1. Overview

This document outlines the technical specification for the **AI Mastermind**, a collaborative brainstorming and project planning system designed for integration into the Claude Code IDE. The system simulates a structured mastermind session with multiple, specialized AI agents to generate, refine, and plan ideas. It is designed to be interactive, context-aware, customizable, and actionable, transforming it from a simple tool into a core feature of the development environment.

## 2. Core Components

The system is composed of three main components: the Orchestrator Agent, Persona Agents, and a shared communication protocol.

### 2.1. The Orchestrator Agent

The Orchestrator is the central controller of the system. It is not a persona but a process manager responsible for:

- **Session Management:** Initiating, running, and terminating mastermind sessions.
- **User Interaction:** Managing the "Human in the Loop" functionality, prompting the user for input (e.g., topic, voting, turn-taking).
- **Context Scanning:** Analyzing the user's project directory to provide context to the Persona Agents.
- **Process Management:** Launching and coordinating the parallel execution of Persona Agents via the IDE's infrastructure.
- **State Management:** Maintaining the complete conversation history (the "whiteboard").
- **Report Generation:** Synthesizing the final session output into a structured Markdown report.

### 2.2. Persona Agents

Persona Agents are specialized instances of a language model, each primed with a unique system prompt to define its personality, expertise, and communication style. The system will include a default library of personas and allow for user-created custom personas.

**Default Persona Library:**

| Persona                  | Core Function                                       | Key Prompt Phrases                     |
| ------------------------ | --------------------------------------------------- | -------------------------------------- |
| **Master of Innovation** | Generates unconventional, forward-thinking ideas.   | "What if..."                           |
| **Master of Execution**  | Focuses on feasibility, implementation, and tech.   | "To build that...", "How would we..."    |
| **Master of Risk**       | Identifies flaws, weaknesses, and consequences.   | "Have we considered...", "What could go wrong?" |
| **Master of Empathy**    | Champions the end-user's needs and experience.    | "Would a user want...", "How would this feel?" |

**Expanded Library (Examples):**

- **Master of Data:** Fetches and analyzes external data.
- **Master of Design:** Advises on UX/UI and aesthetics.
- **Master of Finance:** Focuses on business models and monetization.

### 2.3. Communication Protocol

Communication between the Orchestrator and Persona Agents will be standardized using JSON objects. The Orchestrator will make requests, and the agents will provide responses in a structured format.

**Agent Action Protocol (Phase 2):**

During the deep dive, each agent's turn will be framed around one of three actions:

- **BUILD:** Expand upon the current idea.
- **CRITIQUE:** Challenge the idea to improve it.
- **QUESTION:** Ask for clarification.

## 3. System Workflow (End-to-End)

The workflow is divided into four distinct phases.

### Phase 0: Initialization & Context Scan

1.  User invokes the "Start New AI Mastermind Session" command in the IDE.
2.  The Orchestrator prompts the user for the **problem statement**.
3.  The Orchestrator performs a **Context Scan** of the project directory, summarizing file structure, dependencies, and READMEs.
4.  The Orchestrator prompts the user to select the Persona Agents for the session from the Persona Library.

### Phase 1: The Idea Tournament

1.  **Ideation:** The Orchestrator tasks each selected agent to generate one unique, standalone concept based on the problem statement and project context.
2.  **Presentation:** The generated concepts are displayed to the user in the IDE's Mastermind UI.
3.  **Voting:** The Orchestrator asks each agent to vote for their preferred concept (cannot be their own) and provide a justification. The user is also prompted to cast their vote, which serves as the tie-breaker or final decision.
4.  **Selection:** The winning concept is announced.

### Phase 2: The Collaborative Deep Dive

1.  The Orchestrator initiates the deep dive on the winning concept.
2.  The system enters an interactive, turn-based loop. The user can either let the Orchestrator manage turn-taking (round-robin) or manually select the next agent to speak.
3.  At each turn, the selected agent receives the full conversation history and performs a **BUILD**, **CRITIQUE**, or **QUESTION** action.
4.  The user can inject their own ideas into the conversation at any point.

### Phase 3: Final Report Generation

1.  The user signals the end of the session via a UI command.
2.  The Orchestrator synthesizes the entire conversation into a multi-section Markdown report.
3.  The report is saved to the project directory and automatically opened in the IDE.
4.  The report will include **"Actionable Output"** buttons to trigger code generation for specific tasks.

## 4. Final Report Structure

The generated `mastermind_report.md` will contain the following sections:

1.  **Executive Summary:** A high-level overview of the final concept.
2.  **Detailed Project Plan:** Including MVP features, UX flow, and proposed tech stack.
3.  **Unresolved Risks & Open Questions:** A checklist of potential failure points.
4.  **Potential Future Enhancements:** A roadmap for post-MVP development.

## 5. IDE Integration API

The Orchestrator will interact with the Claude Code IDE via a defined set of API calls.

- `ide.ui.createMastermindView()`: Creates the dedicated UI tab.
- `ide.ui.updateView(content)`: Updates the UI with new conversation content.
- `ide.ui.promptUser(prompt)`: Asks the user for input.
- `ide.project.getDirectoryScan()`: Returns a summary of the project context.
- `ide.agents.launch(persona_prompt, input)`: Launches a parallel agent process.
- `ide.files.create(path, content)`: Creates a file in the project.
- `ide.commands.register(command, callback)`: Registers a new command in the palette.
