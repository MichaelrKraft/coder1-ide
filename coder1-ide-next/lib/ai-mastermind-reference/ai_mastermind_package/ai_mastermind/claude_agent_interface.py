"""
Claude Agent Interface for Coder1 IDE
This module provides the interface for launching and managing Claude Code Agents
in the Coder1 IDE's parallel execution environment.
"""

from typing import Dict, Any, List, Optional
import json


class ClaudeAgentTask:
    """
    Represents a task to be executed by a Claude Code Agent.
    This is the format that Coder1 IDE expects for parallel agent execution.
    """
    
    def __init__(
        self,
        agent_id: str,
        persona_name: str,
        system_prompt: str,
        user_prompt: str,
        context: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize a Claude agent task.
        
        Args:
            agent_id: Unique identifier for this agent instance
            persona_name: Display name of the persona
            system_prompt: The system prompt defining the agent's role
            user_prompt: The specific task/question for this turn
            context: Additional context data
        """
        self.agent_id = agent_id
        self.persona_name = persona_name
        self.system_prompt = system_prompt
        self.user_prompt = user_prompt
        self.context = context or {}
        
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the task to a dictionary format for the IDE.
        
        Returns:
            Dictionary representation of the task
        """
        return {
            "agent_id": self.agent_id,
            "persona_name": self.persona_name,
            "system_prompt": self.system_prompt,
            "user_prompt": self.user_prompt,
            "context": self.context
        }
    
    def to_json(self) -> str:
        """
        Convert the task to JSON format.
        
        Returns:
            JSON string representation
        """
        return json.dumps(self.to_dict(), indent=2)


class ClaudeAgentResponse:
    """
    Represents a response from a Claude Code Agent.
    This is the format that Coder1 IDE returns after agent execution.
    """
    
    def __init__(
        self,
        agent_id: str,
        persona_name: str,
        content: str,
        success: bool = True,
        error: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize an agent response.
        
        Args:
            agent_id: The agent's unique identifier
            persona_name: The persona's display name
            content: The agent's response content
            success: Whether the execution was successful
            error: Error message if execution failed
            metadata: Additional metadata about the execution
        """
        self.agent_id = agent_id
        self.persona_name = persona_name
        self.content = content
        self.success = success
        self.error = error
        self.metadata = metadata or {}
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ClaudeAgentResponse':
        """
        Create a response object from a dictionary.
        
        Args:
            data: Dictionary containing response data
            
        Returns:
            ClaudeAgentResponse instance
        """
        return cls(
            agent_id=data.get("agent_id", ""),
            persona_name=data.get("persona_name", ""),
            content=data.get("content", ""),
            success=data.get("success", True),
            error=data.get("error"),
            metadata=data.get("metadata", {})
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the response to a dictionary.
        
        Returns:
            Dictionary representation
        """
        return {
            "agent_id": self.agent_id,
            "persona_name": self.persona_name,
            "content": self.content,
            "success": self.success,
            "error": self.error,
            "metadata": self.metadata
        }


class MastermindAgentBatch:
    """
    Represents a batch of agents to be executed in parallel.
    This is used for Phase 1 (ideation and voting) where all agents
    need to respond simultaneously.
    """
    
    def __init__(self, phase: str, tasks: List[ClaudeAgentTask]):
        """
        Initialize a batch of agent tasks.
        
        Args:
            phase: The current phase (ideation, voting, deep_dive)
            tasks: List of ClaudeAgentTask objects
        """
        self.phase = phase
        self.tasks = tasks
        self.responses: List[ClaudeAgentResponse] = []
        
    def add_task(self, task: ClaudeAgentTask):
        """Add a task to the batch."""
        self.tasks.append(task)
        
    def add_response(self, response: ClaudeAgentResponse):
        """Add a response to the batch."""
        self.responses.append(response)
        
    def is_complete(self) -> bool:
        """Check if all tasks have received responses."""
        return len(self.responses) == len(self.tasks)
    
    def get_failed_tasks(self) -> List[ClaudeAgentResponse]:
        """Get all failed task responses."""
        return [r for r in self.responses if not r.success]
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the batch to a dictionary format for the IDE.
        
        Returns:
            Dictionary representation
        """
        return {
            "phase": self.phase,
            "task_count": len(self.tasks),
            "tasks": [task.to_dict() for task in self.tasks],
            "responses": [resp.to_dict() for resp in self.responses]
        }


# Example usage and integration guide for Coder1 IDE developers
INTEGRATION_EXAMPLE = """
# Integration Example for Coder1 IDE

## How to Launch a Mastermind Session

```python
from ai_mastermind.claude_agent_interface import ClaudeAgentTask, MastermindAgentBatch
from ai_mastermind.personas import get_persona, get_default_mastermind_group
from ai_mastermind.orchestrator import Orchestrator

# 1. Initialize the orchestrator
problem = "How can we improve code review efficiency in our IDE?"
orchestrator = Orchestrator(problem_statement=problem)

# 2. Create Phase 1 - Ideation batch
ideation_batch = MastermindAgentBatch(phase="ideation", tasks=[])

for persona_key in get_default_mastermind_group():
    persona = get_persona(persona_key)
    
    task = ClaudeAgentTask(
        agent_id=f"mastermind_{persona_key}",
        persona_name=persona["display_name"],
        system_prompt=persona["system_prompt"],
        user_prompt=orchestrator.generate_phase_prompt("ideation", persona["name"])
    )
    
    ideation_batch.add_task(task)

# 3. Execute the batch in parallel using Coder1's agent launcher
# This is where your IDE's parallel execution system takes over
responses = coder1_ide.execute_agent_batch(ideation_batch)

# 4. Process responses
for response in responses:
    orchestrator.add_to_history(
        speaker=response.persona_name,
        content=response.content,
        action_type="IDEATION"
    )
```

## Expected Input Format for Coder1 IDE

When launching agents, Coder1 IDE should expect:
- `agent_id`: Unique identifier (string)
- `persona_name`: Display name for UI (string)
- `system_prompt`: Full system prompt defining the agent's role (string)
- `user_prompt`: The specific task for this turn (string)
- `context`: Optional metadata (dict)

## Expected Output Format from Claude Agents

Claude agents should return:
- `agent_id`: The same identifier passed in (string)
- `persona_name`: The same display name (string)
- `content`: The agent's response (string)
- `success`: Whether execution succeeded (boolean)
- `error`: Error message if failed (string or null)
- `metadata`: Optional execution metadata (dict)
"""


def create_ideation_batch(
    orchestrator,
    persona_keys: List[str]
) -> MastermindAgentBatch:
    """
    Helper function to create an ideation batch for Phase 1.
    
    Args:
        orchestrator: The Orchestrator instance
        persona_keys: List of persona keys to include
        
    Returns:
        MastermindAgentBatch ready for execution
    """
    from .personas import get_persona
    
    batch = MastermindAgentBatch(phase="ideation", tasks=[])
    
    for persona_key in persona_keys:
        persona = get_persona(persona_key)
        if not persona:
            continue
            
        task = ClaudeAgentTask(
            agent_id=f"mastermind_{persona_key}",
            persona_name=persona["display_name"],
            system_prompt=persona["system_prompt"],
            user_prompt=orchestrator.generate_phase_prompt("ideation", persona["name"])
        )
        
        batch.add_task(task)
    
    return batch


def create_voting_batch(
    orchestrator,
    persona_keys: List[str],
    concepts: List[Dict[str, Any]]
) -> MastermindAgentBatch:
    """
    Helper function to create a voting batch for Phase 1.
    
    Args:
        orchestrator: The Orchestrator instance
        persona_keys: List of persona keys to include
        concepts: List of concepts to vote on
        
    Returns:
        MastermindAgentBatch ready for execution
    """
    from .personas import get_persona
    
    batch = MastermindAgentBatch(phase="voting", tasks=[])
    concepts_formatted = orchestrator.format_concepts_for_voting(concepts)
    
    for persona_key in persona_keys:
        persona = get_persona(persona_key)
        if not persona:
            continue
            
        task = ClaudeAgentTask(
            agent_id=f"mastermind_{persona_key}",
            persona_name=persona["display_name"],
            system_prompt=persona["system_prompt"],
            user_prompt=orchestrator.generate_phase_prompt(
                "voting",
                persona["name"],
                concepts=concepts_formatted
            )
        )
        
        batch.add_task(task)
    
    return batch


def create_deep_dive_task(
    orchestrator,
    persona_key: str
) -> ClaudeAgentTask:
    """
    Helper function to create a single deep dive task for Phase 2.
    
    Args:
        orchestrator: The Orchestrator instance
        persona_key: The persona key for this turn
        
    Returns:
        ClaudeAgentTask ready for execution
    """
    from .personas import get_persona
    
    persona = get_persona(persona_key)
    
    return ClaudeAgentTask(
        agent_id=f"mastermind_{persona_key}",
        persona_name=persona["display_name"],
        system_prompt=persona["system_prompt"],
        user_prompt=orchestrator.generate_phase_prompt("deep_dive", persona["name"])
    )
