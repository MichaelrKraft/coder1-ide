"""
AI Mastermind Orchestrator
This module contains the core Orchestrator class that manages the entire mastermind session.
"""

import json
from typing import List, Dict, Any, Optional
from datetime import datetime


class Orchestrator:
    """
    The Orchestrator manages the AI Mastermind session, coordinating between
    persona agents, managing conversation state, and generating final reports.
    """
    
    def __init__(self, problem_statement: str, project_context: Optional[str] = None):
        """
        Initialize the Orchestrator with a problem statement.
        
        Args:
            problem_statement: The core problem or topic for the mastermind session
            project_context: Optional context about the user's project
        """
        self.problem_statement = problem_statement
        self.project_context = project_context or "No project context provided."
        self.conversation_history: List[Dict[str, Any]] = []
        self.selected_personas: List[str] = []
        self.winning_concept: Optional[Dict[str, Any]] = None
        self.session_start_time = datetime.now()
        
    def add_to_history(self, speaker: str, content: str, action_type: Optional[str] = None):
        """
        Add an entry to the conversation history.
        
        Args:
            speaker: The name of the speaker (agent or user)
            content: The content of the message
            action_type: Optional action type (BUILD, CRITIQUE, QUESTION)
        """
        entry = {
            "timestamp": datetime.now().isoformat(),
            "speaker": speaker,
            "content": content,
            "action_type": action_type
        }
        self.conversation_history.append(entry)
        
    def get_conversation_context(self) -> str:
        """
        Generate a formatted string of the conversation history for agent context.
        
        Returns:
            A formatted string containing the full conversation
        """
        context = f"Problem Statement: {self.problem_statement}\n\n"
        context += f"Project Context: {self.project_context}\n\n"
        context += "Conversation History:\n"
        context += "-" * 80 + "\n"
        
        for entry in self.conversation_history:
            action_tag = f"[{entry['action_type']}] " if entry['action_type'] else ""
            context += f"{entry['speaker']}: {action_tag}{entry['content']}\n\n"
            
        return context
    
    def format_concepts_for_voting(self, concepts: List[Dict[str, Any]]) -> str:
        """
        Format the generated concepts for presentation to agents and users.
        
        Args:
            concepts: List of concept dictionaries
            
        Returns:
            Formatted string of concepts
        """
        formatted = "Generated Concepts:\n\n"
        for i, concept in enumerate(concepts):
            formatted += f"Concept {chr(65 + i)} (by {concept['author']}):\n"
            formatted += f"{concept['content']}\n\n"
        return formatted
    
    def tally_votes(self, votes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Tally votes and determine the winning concept.
        
        Args:
            votes: List of vote dictionaries containing 'voter', 'choice', and 'justification'
            
        Returns:
            Dictionary containing the winning concept and vote breakdown
        """
        vote_counts = {}
        vote_details = {}
        
        for vote in votes:
            choice = vote['choice']
            voter = vote['voter']
            justification = vote['justification']
            
            if choice not in vote_counts:
                vote_counts[choice] = 0
                vote_details[choice] = []
                
            vote_counts[choice] += 1
            vote_details[choice].append({
                'voter': voter,
                'justification': justification
            })
        
        # Find the winner
        winner = max(vote_counts.items(), key=lambda x: x[1])
        
        return {
            'winning_concept': winner[0],
            'vote_count': winner[1],
            'vote_breakdown': vote_counts,
            'vote_details': vote_details
        }
    
    def generate_phase_prompt(self, phase: str, agent_name: str, **kwargs) -> str:
        """
        Generate a prompt for a specific phase and agent.
        
        Args:
            phase: The current phase (ideation, voting, deep_dive)
            agent_name: The name of the agent
            **kwargs: Additional context-specific parameters
            
        Returns:
            A formatted prompt string
        """
        if phase == "ideation":
            return f"""You are participating in an AI Mastermind session.

Problem Statement: {self.problem_statement}

Project Context: {self.project_context}

Your task is to generate ONE unique, standalone concept to address this problem. Be creative and leverage your expertise as the {agent_name}.

Provide your concept in a clear, concise paragraph."""

        elif phase == "voting":
            concepts = kwargs.get('concepts', '')
            return f"""You are participating in an AI Mastermind session.

Problem Statement: {self.problem_statement}

{concepts}

Your task is to vote for the concept you believe is most promising. You CANNOT vote for your own concept.

Provide your response in the following format:
Vote: [Concept Letter]
Justification: [Brief explanation of why you chose this concept]"""

        elif phase == "deep_dive":
            action_type = kwargs.get('action_type', 'any')
            return f"""You are participating in an AI Mastermind session.

{self.get_conversation_context()}

Your task is to contribute to the discussion by choosing ONE of the following actions:
- BUILD: Expand upon the current idea with additional details or features
- CRITIQUE: Challenge the idea to identify weaknesses and improve it
- QUESTION: Ask for clarification or more detail about a specific aspect

Provide your response in the following format:
Action: [BUILD/CRITIQUE/QUESTION]
Content: [Your contribution]"""

        return ""
    
    def __repr__(self):
        return f"Orchestrator(problem='{self.problem_statement[:50]}...', history_length={len(self.conversation_history)})"
