# AI Mastermind: Coder1 IDE Integration Guide

**Author:** Manus AI
**Date:** 2025-11-14
**Version:** 1.0

## 1. Introduction

This document provides a comprehensive guide for integrating the **AI Mastermind** system into the **Coder1 IDE**. The system is designed as a Python package (`ai_mastermind`) that orchestrates parallel Claude Code Agents to facilitate structured brainstorming and project planning sessions.

By following this guide, you can embed the AI Mastermind as a core feature of your IDE, providing immense value to your users by transforming the AI from a simple assistant into a strategic partner.

## 2. Package Overview

The `ai_mastermind` package is structured to be modular and easily integrable. The key components are located in the `/home/ubuntu/ai_mastermind/` directory.

- **`orchestrator.py`**: Contains the main `Orchestrator` class that manages the session.
- **`personas.py`**: Defines the system prompts and configurations for all agent personas.
- **`phase_one.py`**: Implements the "Idea Tournament" logic.
- **`phase_two.py`**: Implements the "Collaborative Deep Dive" logic.
- **`report_generator.py`**: Handles the creation of the final Markdown report.
- **`claude_agent_interface.py`**: Defines the data structures (`ClaudeAgentTask`, `ClaudeAgentResponse`) for communication between the Orchestrator and the IDE's agent execution environment.
- **`demo.py`**: A standalone script that demonstrates the full workflow with mock data.

## 3. Core Integration Workflow

Integrating the Mastermind involves the Coder1 IDE handling the user interface and the parallel execution of agents, while the `Orchestrator` class manages the logic and state of the session.

Here is the recommended step-by-step workflow:

### Step 1: Register the "Start Mastermind" Command

Register a new command in your IDE's command palette.

- **Command ID:** `coder1.startMastermindSession`
- **Title:** `AI Mastermind: Start New Session`

### Step 2: Initiate the Session

When the command is triggered:

1.  **Create a new UI view/tab** for the Mastermind session.
2.  **Prompt the user for the problem statement** (e.g., "How can we refactor our authentication service?").
3.  (Optional) **Perform a project context scan** and pass this information to the Orchestrator.
4.  **Instantiate the Orchestrator**:

    ```python
    from ai_mastermind import Orchestrator

    problem = user_input_problem_statement
    context = ide_project_scan_summary
    orchestrator = Orchestrator(problem_statement=problem, project_context=context)
    ```

### Step 3: Execute Phase 1 - Idea Tournament

1.  **Create the Ideation Batch:** Use the helper function to create a batch of tasks for the initial brainstorming.

    ```python
    from ai_mastermind import create_ideation_batch, get_default_mastermind_group

    persona_keys = get_default_mastermind_group() # Or get from user selection
    ideation_batch = create_ideation_batch(orchestrator, persona_keys)
    ```

2.  **Launch Parallel Agents:** Your IDE's parallel execution engine should now take the `ideation_batch.tasks` and launch a Claude Code Agent for each task. The `ClaudeAgentTask` object contains the `system_prompt` and `user_prompt` for each agent.

3.  **Collect Responses:** Await the `ClaudeAgentResponse` from each agent.

4.  **Process Ideation:** Pass the responses to the `IdeaTournament` instance to process.

    ```python
    from ai_mastermind import IdeaTournament

    phase_one = IdeaTournament(orchestrator)
    concepts = phase_one.process_ideation_responses(list_of_agent_responses)
    # Update your UI to display the generated concepts
    ```

5.  **Execute the Voting Round:** Repeat the process for voting.

    ```python
    from ai_mastermind import create_voting_batch

    voting_batch = create_voting_batch(orchestrator, persona_keys, concepts)
    # Launch agents for voting...
    voting_responses = ide.execute_batch(voting_batch)
    vote_results = phase_one.process_voting_responses(voting_responses)

    # Get user's vote and use phase_one.add_user_vote() if needed
    # Announce the winning concept in the UI
    ```

### Step 4: Execute Phase 2 - Collaborative Deep Dive

This phase is a turn-based loop.

1.  **Instantiate `CollaborativeDeepDive`**:

    ```python
    from ai_mastermind import CollaborativeDeepDive

    winning_concept = phase_one.get_winning_concept()
    phase_two = CollaborativeDeepDive(orchestrator, winning_concept)
    ```

2.  **Loop for each turn** (e.g., for a set number of turns or until the user stops it):
    a. **Determine the next agent:** Use `phase_two.get_next_agent_round_robin()` or allow the user to select the next agent from the UI.
    b. **Create the agent task:**

    ```python
    from ai_mastermind import create_deep_dive_task

    next_agent_key = ...
    deep_dive_task = create_deep_dive_task(orchestrator, next_agent_key)
    ```

    c. **Launch the single agent** and await its response.
    d. **Process the response:**

    ```python
    contribution = phase_two.process_turn_response(agent_response)
    # Update the UI with the new contribution
    ```

### Step 5: Generate the Final Report

1.  When the user ends the session, instantiate the `ReportGenerator`.

    ```python
    from ai_mastermind import ReportGenerator

    report_generator = ReportGenerator(orchestrator, phase_one, phase_two)
    ```

2.  **Generate and save the report:**

    ```python
    report_content = report_generator.generate_full_report()
    ide.files.create("mastermind_report.md", report_content)
    # Automatically open the new report file in the IDE
    ```

## 4. API Specification (Orchestrator <> IDE)

The communication between the `ai_mastermind` package and the Coder1 IDE is primarily handled through the `ClaudeAgentTask` and `ClaudeAgentResponse` data classes.

-   **IDE to Agent (Request):** The IDE must construct a `ClaudeAgentTask` object for each agent it launches. This object provides the necessary context (system prompt, user prompt) for the agent to perform its task.
-   **Agent to IDE (Response):** The Claude Code Agent, upon completion, must return a `ClaudeAgentResponse` object. The `Orchestrator` uses the `content` field of this object to advance the session state.

## 5. UI/UX Recommendations

A rich user interface is key to making this feature intuitive and powerful.

-   **Main View:** Use a multi-pane view. One pane for the live conversation transcript, and another for session status (current phase, participants, winning idea).
-   **Agent Personas:** Display the agent personas with their icons and roles. Show a 
"thinking" indicator when an agent is processing.
-   **Interactive Voting:** When concepts are displayed, allow the user to vote alongside the agents. Use a simple button interface.
-   **Manual Turn Control:** In Phase 2, provide buttons for each agent persona so the user can manually select who speaks next.
-   **User Injection:** Add a text input box where the user can inject their own BUILD, CRITIQUE, or QUESTION at any time.
-   **Real-time Updates:** Stream the conversation as it happens. Each agent's contribution should appear in the transcript immediately.
-   **Report Preview:** After the session, display a preview of the report in the UI before saving it to the project.

## 6. Enhanced Features (Human in the Loop)

The following enhancements dramatically increase the value of the Mastermind feature by giving users control over the process.

### 6.1. Interactive Voting

After the agents vote, present the concepts to the user and allow them to cast the deciding vote. This can be implemented as:

```python
# After agent voting
user_vote = ide.ui.promptUserForVote(concepts)
phase_one.add_user_vote(user_vote['concept_id'], user_vote['justification'])
```

### 6.2. Manual Turn-Taking

Instead of a rigid round-robin, let the user click on an agent to select who speaks next. This allows the user to steer the conversation based on what they need at that moment.

```python
# In the Phase 2 loop
next_agent_key = ide.ui.promptUserToSelectAgent(persona_keys)
```

### 6.3. User Contributions

Allow the user to add their own ideas directly into the conversation.

```python
user_input = ide.ui.getUserContribution()
phase_two.add_user_contribution(user_input['content'], user_input['action'])
```

## 7. Context Awareness (Project Scanning)

To make the Mastermind session aware of the user's current project, implement a project scanning function that summarizes:

-   **File Structure:** Top-level directories and key files.
-   **Dependencies:** Extracted from `package.json`, `requirements.txt`, etc.
-   **Tech Stack:** Inferred from file types and dependencies.
-   **README Content:** A summary of the project's purpose.

Pass this summary to the `Orchestrator` during initialization:

```python
context = ide.project.scan()
orchestrator = Orchestrator(problem_statement=problem, project_context=context)
```

This context will be included in the prompts sent to all agents, ensuring their suggestions are relevant to the user's actual project.

## 8. Persona Library & Customization

Provide a UI for users to:

-   **Select Personas:** Choose which 3-5 agents to include in the session from the full library.
-   **Create Custom Personas:** Allow advanced users to write their own system prompts and define new agent roles.

```python
from ai_mastermind import list_all_personas

all_personas = list_all_personas()
# Display in UI for user selection

# For custom personas:
custom_persona = {
    "name": "Master of Security",
    "display_name": "🔒 Master of Security",
    "system_prompt": "You are a security expert..."
}
# Add to the session
```

## 9. Actionable Output (Code Generation Buttons)

In the generated Markdown report, embed special syntax that the IDE can recognize and convert into interactive buttons.

For example, in the report:

```markdown
1. **API Integration with Gmail**
   - Description: Connect to Gmail API using OAuth
   - [Generate Code Stub](#action:generate_code:gmail_api_integration)
```

The IDE can parse the `#action:generate_code:gmail_api_integration` link and, when clicked, trigger another Claude agent to generate boilerplate code for that specific feature.

## 10. Error Handling & Resilience

-   **Agent Failures:** If an agent fails to respond, log the error and continue with the remaining agents. The `ClaudeAgentResponse` object has a `success` field for this purpose.
-   **Partial Sessions:** Allow users to save and resume sessions. Serialize the `Orchestrator`, `IdeaTournament`, and `CollaborativeDeepDive` objects to JSON.
-   **Timeout Handling:** Set reasonable timeouts for agent execution (e.g., 30-60 seconds per turn).

## 11. Performance Considerations

-   **Parallel Execution:** Phase 1 (ideation and voting) is highly parallelizable. Ensure your IDE's agent launcher can handle 4-7 simultaneous agents.
-   **Caching:** If the same problem statement is used multiple times, consider caching the ideation results.
-   **Rate Limiting:** Be mindful of API rate limits when launching multiple agents in quick succession.

## 12. Testing & Validation

Before releasing this feature, thoroughly test:

-   **End-to-End Flow:** Run the full workflow from initiation to report generation.
-   **Edge Cases:** Test with very short or very long problem statements, single-agent sessions, and sessions with custom personas.
-   **UI Responsiveness:** Ensure the UI remains responsive during agent execution.
-   **Report Quality:** Validate that the generated reports are coherent and actionable.

## 13. Example Code: Complete Integration

Here is a simplified example of how the Coder1 IDE would orchestrate a complete session:

```python
from ai_mastermind import (
    Orchestrator, IdeaTournament, CollaborativeDeepDive, ReportGenerator,
    get_default_mastermind_group, create_ideation_batch, create_voting_batch,
    create_deep_dive_task
)

# Step 1: Initialize
problem = ide.ui.promptUser("Enter the problem statement:")
context = ide.project.scan()
orchestrator = Orchestrator(problem, context)

# Step 2: Phase 1 - Ideation
persona_keys = get_default_mastermind_group()
ideation_batch = create_ideation_batch(orchestrator, persona_keys)
ideation_responses = ide.agents.executeBatch(ideation_batch)

phase_one = IdeaTournament(orchestrator)
concepts = phase_one.process_ideation_responses(ideation_responses)
ide.ui.displayConcepts(concepts)

# Step 3: Phase 1 - Voting
voting_batch = create_voting_batch(orchestrator, persona_keys, concepts)
voting_responses = ide.agents.executeBatch(voting_batch)
vote_results = phase_one.process_voting_responses(voting_responses)

user_vote = ide.ui.promptUserForVote(concepts)
phase_one.add_user_vote(user_vote['id'], user_vote['justification'])

winning_concept = phase_one.get_winning_concept()
ide.ui.announceWinner(winning_concept)

# Step 4: Phase 2 - Deep Dive
phase_two = CollaborativeDeepDive(orchestrator, winning_concept)

for turn in range(8):  # 8 turns
    next_agent = ide.ui.selectNextAgent(persona_keys)  # User selects or round-robin
    task = create_deep_dive_task(orchestrator, next_agent)
    response = ide.agents.executeSingle(task)
    contribution = phase_two.process_turn_response(response)
    ide.ui.displayContribution(contribution)

# Step 5: Generate Report
report_gen = ReportGenerator(orchestrator, phase_one, phase_two)
report_path = ide.project.path + "/mastermind_report.md"
report_gen.save_report(report_path)
ide.files.open(report_path)

ide.ui.showSuccess("Mastermind session complete!")
```

## 14. Deployment Checklist

Before deploying the AI Mastermind feature to your users:

- [ ] Package `ai_mastermind` as a Python module within the IDE's environment
- [ ] Implement the command registration (`coder1.startMastermindSession`)
- [ ] Build the Mastermind UI view/tab
- [ ] Integrate with your parallel agent execution system
- [ ] Add project context scanning functionality
- [ ] Implement interactive voting and manual turn-taking
- [ ] Add support for user contributions during Phase 2
- [ ] Test with multiple problem statements and project types
- [ ] Create user documentation and tutorials
- [ ] Set up error logging and monitoring
- [ ] Conduct beta testing with select users
- [ ] Prepare marketing materials showcasing the feature

## 15. Future Enhancements

Consider these additional features for future versions:

-   **Session History:** Store past mastermind sessions and allow users to browse and learn from them.
-   **Collaborative Sessions:** Allow multiple human users to participate in the same mastermind session.
-   **Export Options:** Export reports to PDF, DOCX, or directly to project management tools like Jira or Notion.
-   **Analytics:** Track which types of problems benefit most from the mastermind approach and surface insights to users.
-   **Agent Learning:** Allow agents to learn from past sessions to provide better suggestions over time.

## 16. Support & Contact

For questions, issues, or feature requests related to the AI Mastermind system, please contact the development team or submit feedback through the IDE's support channels.

---

**End of Integration Guide**
