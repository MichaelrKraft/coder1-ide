# AI Mastermind: Collaborative Brainstorming System for Claude Code Agents

**Version:** 1.0.0
**Author:** Manus AI
**Date:** 2025-11-14

## Overview

The **AI Mastermind** is a sophisticated collaborative brainstorming and project planning system designed specifically for integration with the **Coder1 IDE** and its Claude Code Agent infrastructure. It simulates a structured mastermind session where multiple specialized AI agents work together to generate, refine, and plan innovative solutions to complex problems.

## Key Features

### ✨ Two-Phase Innovation Process

1.  **Phase 1: Idea Tournament**
    -   Multiple AI agents generate unique concepts
    -   Democratic voting process (agents + human) to select the best idea
    -   Transparent justification for each vote

2.  **Phase 2: Collaborative Deep Dive**
    -   Turn-based refinement of the winning concept
    -   Structured actions: BUILD, CRITIQUE, QUESTION
    -   Human-in-the-loop participation

### 🎭 Diverse Agent Personas

-   **Master of Innovation:** Visionary thinking and groundbreaking ideas
-   **Master of Execution:** Practical implementation and technical feasibility
-   **Master of Risk:** Critical analysis and vulnerability identification
-   **Master of Empathy:** User-centered design and human experience

### 📊 Comprehensive Final Report

Automatically generated Markdown report with:
-   Executive Summary
-   Detailed Project Plan (MVP features, UX flow, tech stack)
-   Unresolved Risks & Open Questions
-   Future Enhancement Roadmap
-   Full Conversation History

### 🔧 Built for Integration

-   Clean API for IDE integration
-   Parallel agent execution support
-   Context-aware (project scanning)
-   Customizable personas
-   Interactive user controls

## Installation

The package is located in `/home/ubuntu/ai_mastermind/` and can be imported directly:

```python
from ai_mastermind import (
    Orchestrator,
    IdeaTournament,
    CollaborativeDeepDive,
    ReportGenerator,
    get_default_mastermind_group,
    create_ideation_batch,
    create_voting_batch,
    create_deep_dive_task
)
```

## Quick Start

### Running the Demo

To see the AI Mastermind in action with simulated responses:

```bash
cd /home/ubuntu
python3.11 ai_mastermind/demo.py
```

This will run a complete mastermind session and generate a sample report.

### Basic Usage

```python
from ai_mastermind import Orchestrator, IdeaTournament, CollaborativeDeepDive, ReportGenerator
from ai_mastermind import get_default_mastermind_group, create_ideation_batch

# 1. Initialize the orchestrator
problem = "How can we improve code review efficiency?"
orchestrator = Orchestrator(problem_statement=problem)

# 2. Create and execute Phase 1 (Ideation)
persona_keys = get_default_mastermind_group()
ideation_batch = create_ideation_batch(orchestrator, persona_keys)

# Launch your agents here and collect responses
# ideation_responses = your_ide.execute_batch(ideation_batch)

# 3. Process the ideation
phase_one = IdeaTournament(orchestrator)
concepts = phase_one.process_ideation_responses(ideation_responses)

# 4. Execute voting and select winner
# ... (see full integration guide)

# 5. Run Phase 2 (Deep Dive)
winning_concept = phase_one.get_winning_concept()
phase_two = CollaborativeDeepDive(orchestrator, winning_concept)

# 6. Generate final report
report_gen = ReportGenerator(orchestrator, phase_one, phase_two)
report_gen.save_report("mastermind_report.md")
```

## Architecture

### Core Components

| Component                  | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `Orchestrator`             | Session management and conversation history          |
| `IdeaTournament`           | Phase 1 logic (ideation and voting)                 |
| `CollaborativeDeepDive`    | Phase 2 logic (turn-based refinement)               |
| `ReportGenerator`          | Final report synthesis                               |
| `ClaudeAgentTask`          | Data structure for agent requests                    |
| `ClaudeAgentResponse`      | Data structure for agent responses                   |
| `MastermindAgentBatch`     | Container for parallel agent execution               |

### Data Flow

```
User Input (Problem Statement)
    ↓
Orchestrator Initialization
    ↓
Phase 1: Idea Tournament
    ├─ Ideation (Parallel Agents)
    ├─ Voting (Parallel Agents + User)
    └─ Winner Selection
    ↓
Phase 2: Collaborative Deep Dive
    ├─ Turn 1 (Agent or User)
    ├─ Turn 2 (Agent or User)
    └─ ... (8-20 turns)
    ↓
Report Generation
    ├─ Executive Summary
    ├─ Project Plan
    ├─ Risks & Questions
    └─ Future Enhancements
    ↓
Final Markdown Report
```

## Module Reference

### `orchestrator.py`

**Class: `Orchestrator`**

The central controller for the mastermind session.

**Key Methods:**
-   `__init__(problem_statement, project_context)`: Initialize a new session
-   `add_to_history(speaker, content, action_type)`: Add an entry to the conversation
-   `get_conversation_context()`: Get formatted conversation history
-   `generate_phase_prompt(phase, agent_name, **kwargs)`: Generate prompts for agents

### `personas.py`

**Constants:**
-   `PERSONAS`: Dictionary of default persona configurations
-   `EXTENDED_PERSONAS`: Additional personas for advanced use

**Functions:**
-   `get_persona(persona_key)`: Retrieve a persona configuration
-   `get_default_mastermind_group()`: Get the default 4-agent group
-   `list_all_personas()`: Get all available personas

### `phase_one.py`

**Class: `IdeaTournament`**

Manages the ideation and voting process.

**Key Methods:**
-   `process_ideation_responses(responses)`: Process agent ideation responses
-   `process_voting_responses(responses)`: Process agent voting responses
-   `add_user_vote(concept_id, justification)`: Add a human vote
-   `get_winning_concept()`: Retrieve the winning concept

### `phase_two.py`

**Class: `CollaborativeDeepDive`**

Manages the turn-based collaborative refinement.

**Key Methods:**
-   `process_turn_response(response)`: Process a single turn from an agent
-   `add_user_contribution(content, action)`: Add a human contribution
-   `analyze_conversation_balance()`: Get conversation statistics
-   `get_key_insights()`: Extract key insights by action type

### `report_generator.py`

**Class: `ReportGenerator`**

Generates the final comprehensive report.

**Key Methods:**
-   `generate_full_report()`: Generate the complete Markdown report
-   `save_report(filepath)`: Save the report to a file

### `claude_agent_interface.py`

**Classes:**
-   `ClaudeAgentTask`: Represents a task for a Claude agent
-   `ClaudeAgentResponse`: Represents a response from a Claude agent
-   `MastermindAgentBatch`: Container for batch execution

**Helper Functions:**
-   `create_ideation_batch(orchestrator, persona_keys)`: Create Phase 1 ideation batch
-   `create_voting_batch(orchestrator, persona_keys, concepts)`: Create Phase 1 voting batch
-   `create_deep_dive_task(orchestrator, persona_key)`: Create Phase 2 single task

## Integration with Coder1 IDE

For detailed integration instructions, see the **[IDE Integration Guide](../ide_integration_guide.md)**.

### Key Integration Points

1.  **Command Registration:** Register `coder1.startMastermindSession` command
2.  **UI View:** Create a dedicated Mastermind tab/panel
3.  **Agent Launcher:** Connect to your parallel agent execution system
4.  **Project Context:** Implement project scanning for context awareness
5.  **User Interaction:** Add voting, turn selection, and contribution inputs

## Customization

### Adding Custom Personas

```python
custom_persona = {
    "name": "Master of Security",
    "display_name": "🔒 Master of Security",
    "role": "Security Expert",
    "system_prompt": "You are a security expert focusing on...",
    "color": "#FF0000"
}

# Use in session
from ai_mastermind.personas import PERSONAS
PERSONAS["master_of_security"] = custom_persona
```

### Adjusting Session Parameters

```python
# Change maximum turns in Phase 2
phase_two.max_turns = 15

# Customize report sections
report_gen._generate_custom_section()
```

## Testing

Run the demonstration to validate the system:

```bash
python3.11 ai_mastermind/demo.py
```

Expected output:
-   Phase 1 ideation with 4 concepts
-   Voting results with winner announcement
-   Phase 2 with 8 turns of collaboration
-   Final report saved to `/home/ubuntu/mastermind_report_[timestamp].md`

## Performance

-   **Phase 1 Ideation:** 4 parallel agents (~30-60 seconds total)
-   **Phase 1 Voting:** 4 parallel agents (~20-40 seconds total)
-   **Phase 2 Deep Dive:** 8-20 sequential turns (~5-10 minutes total)
-   **Report Generation:** Instant (<1 second)

## Troubleshooting

### Common Issues

**Issue:** Agents fail to respond
-   **Solution:** Check `ClaudeAgentResponse.success` field and handle errors gracefully

**Issue:** Voting results in a tie
-   **Solution:** User vote serves as tiebreaker

**Issue:** Report generation fails
-   **Solution:** Ensure both Phase 1 and Phase 2 are completed before generating report

## Examples

See the `demo.py` file for a complete working example with mock data.

## License

This system is designed for integration with the Coder1 IDE. All rights reserved.

## Support

For questions or issues:
-   Review the [IDE Integration Guide](../ide_integration_guide.md)
-   Check the [Technical Specification](../ai_mastermind_spec.md)
-   Contact the development team

---

**Built with ❤️ for collaborative innovation**
