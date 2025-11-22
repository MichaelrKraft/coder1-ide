"""
AI Mastermind - Collaborative Brainstorming System for Claude Code Agents
"""

__version__ = "1.0.0"
__author__ = "Manus AI"

from .orchestrator import Orchestrator
from .personas import PERSONAS, get_persona, get_default_mastermind_group, list_all_personas
from .phase_one import IdeaTournament
from .phase_two import CollaborativeDeepDive
from .report_generator import ReportGenerator
from .claude_agent_interface import (
    ClaudeAgentTask,
    ClaudeAgentResponse,
    MastermindAgentBatch,
    create_ideation_batch,
    create_voting_batch,
    create_deep_dive_task
)

__all__ = [
    'Orchestrator',
    'IdeaTournament',
    'CollaborativeDeepDive',
    'ReportGenerator',
    'ClaudeAgentTask',
    'ClaudeAgentResponse',
    'MastermindAgentBatch',
    'PERSONAS',
    'get_persona',
    'get_default_mastermind_group',
    'list_all_personas',
    'create_ideation_batch',
    'create_voting_batch',
    'create_deep_dive_task'
]
