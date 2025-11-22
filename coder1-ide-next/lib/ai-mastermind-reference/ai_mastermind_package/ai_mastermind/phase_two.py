"""
Phase 2: Collaborative Deep Dive Implementation
This module handles the turn-based collaborative refinement of the winning concept.
"""

from typing import List, Dict, Any, Optional
import re


class CollaborativeDeepDive:
    """
    Manages Phase 2 of the mastermind session: collaborative refinement through
    BUILD, CRITIQUE, and QUESTION actions.
    """
    
    def __init__(self, orchestrator, winning_concept: Dict[str, Any]):
        """
        Initialize the Collaborative Deep Dive.
        
        Args:
            orchestrator: The Orchestrator instance managing the session
            winning_concept: The concept selected in Phase 1
        """
        self.orchestrator = orchestrator
        self.winning_concept = winning_concept
        self.turn_count = 0
        self.max_turns = 20  # Default maximum turns
        self.contributions: List[Dict[str, Any]] = []
        
        # Add the winning concept to history as the starting point
        self.orchestrator.add_to_history(
            speaker="Orchestrator",
            content=f"We will now begin the deep dive on the winning concept:\n\n{winning_concept['content']}",
            action_type="TRANSITION"
        )
    
    def parse_action_response(self, response_content: str) -> Dict[str, str]:
        """
        Parse an agent's response to extract the action type and content.
        
        Args:
            response_content: The raw response content from the agent
            
        Returns:
            Dictionary with 'action' and 'content'
        """
        # Try to extract structured response
        action_match = re.search(r'Action:\s*(BUILD|CRITIQUE|QUESTION)', response_content, re.IGNORECASE)
        content_match = re.search(r'Content:\s*(.+)', response_content, re.IGNORECASE | re.DOTALL)
        
        if action_match and content_match:
            return {
                'action': action_match.group(1).upper(),
                'content': content_match.group(1).strip()
            }
        
        # Fallback: try to detect action type from content
        content_lower = response_content.lower()
        
        if any(phrase in content_lower for phrase in ['what if', 'we could add', 'building on', 'to expand']):
            action = 'BUILD'
        elif any(phrase in content_lower for phrase in ['however', 'risk', 'concern', 'what about', 'have we considered']):
            action = 'CRITIQUE'
        elif any(phrase in content_lower for phrase in ['?', 'can you explain', 'how would', 'what do you mean']):
            action = 'QUESTION'
        else:
            action = 'BUILD'  # Default to BUILD
        
        return {
            'action': action,
            'content': response_content.strip()
        }
    
    def process_turn_response(self, response: 'ClaudeAgentResponse') -> Dict[str, Any]:
        """
        Process a single turn response from an agent.
        
        Args:
            response: ClaudeAgentResponse object from the agent
            
        Returns:
            Dictionary containing the processed contribution
        """
        if not response.success:
            print(f"Warning: Agent {response.persona_name} failed during deep dive")
            return None
        
        parsed = self.parse_action_response(response.content)
        
        contribution = {
            'turn': self.turn_count + 1,
            'agent': response.persona_name,
            'agent_id': response.agent_id,
            'action': parsed['action'],
            'content': parsed['content']
        }
        
        self.contributions.append(contribution)
        self.turn_count += 1
        
        # Add to conversation history
        self.orchestrator.add_to_history(
            speaker=response.persona_name,
            content=parsed['content'],
            action_type=parsed['action']
        )
        
        return contribution
    
    def add_user_contribution(
        self,
        content: str,
        action: str = "BUILD"
    ) -> Dict[str, Any]:
        """
        Add a contribution from the human user.
        
        Args:
            content: The user's contribution
            action: The action type (BUILD, CRITIQUE, or QUESTION)
            
        Returns:
            Dictionary containing the contribution
        """
        contribution = {
            'turn': self.turn_count + 1,
            'agent': 'User (Human Facilitator)',
            'agent_id': 'user',
            'action': action.upper(),
            'content': content
        }
        
        self.contributions.append(contribution)
        self.turn_count += 1
        
        self.orchestrator.add_to_history(
            speaker='User',
            content=content,
            action_type=action.upper()
        )
        
        return contribution
    
    def should_continue(self) -> bool:
        """
        Determine if the deep dive should continue.
        
        Returns:
            Boolean indicating whether to continue
        """
        return self.turn_count < self.max_turns
    
    def get_next_agent_round_robin(
        self,
        persona_keys: List[str],
        current_turn: int
    ) -> str:
        """
        Get the next agent in round-robin fashion.
        
        Args:
            persona_keys: List of persona keys in the session
            current_turn: The current turn number
            
        Returns:
            The persona key for the next agent
        """
        index = current_turn % len(persona_keys)
        return persona_keys[index]
    
    def analyze_conversation_balance(self) -> Dict[str, Any]:
        """
        Analyze the balance of contributions across agents and action types.
        
        Returns:
            Dictionary containing analysis metrics
        """
        agent_counts = {}
        action_counts = {'BUILD': 0, 'CRITIQUE': 0, 'QUESTION': 0}
        
        for contribution in self.contributions:
            agent = contribution['agent']
            action = contribution['action']
            
            agent_counts[agent] = agent_counts.get(agent, 0) + 1
            action_counts[action] = action_counts.get(action, 0) + 1
        
        return {
            'total_turns': self.turn_count,
            'contributions_by_agent': agent_counts,
            'contributions_by_action': action_counts,
            'balance_score': self._calculate_balance_score(agent_counts)
        }
    
    def _calculate_balance_score(self, agent_counts: Dict[str, int]) -> float:
        """
        Calculate a balance score (0-1) based on how evenly distributed contributions are.
        
        Args:
            agent_counts: Dictionary of agent contribution counts
            
        Returns:
            Balance score between 0 (unbalanced) and 1 (perfectly balanced)
        """
        if not agent_counts:
            return 0.0
        
        values = list(agent_counts.values())
        mean = sum(values) / len(values)
        
        if mean == 0:
            return 0.0
        
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        coefficient_of_variation = (variance ** 0.5) / mean
        
        # Convert to 0-1 score (lower CV = higher balance)
        balance_score = max(0, 1 - coefficient_of_variation)
        
        return balance_score
    
    def generate_phase_summary(self) -> str:
        """
        Generate a summary of Phase 2 for display or logging.
        
        Returns:
            Formatted string summarizing the deep dive
        """
        summary = "=" * 80 + "\n"
        summary += "PHASE 2: COLLABORATIVE DEEP DIVE - SUMMARY\n"
        summary += "=" * 80 + "\n\n"
        
        summary += f"Starting Concept: {self.winning_concept['content']}\n\n"
        summary += "-" * 80 + "\n"
        summary += "Conversation Flow:\n"
        summary += "-" * 80 + "\n\n"
        
        for contribution in self.contributions:
            summary += f"Turn {contribution['turn']} - {contribution['agent']} [{contribution['action']}]:\n"
            summary += f"{contribution['content']}\n\n"
        
        # Add analysis
        analysis = self.analyze_conversation_balance()
        summary += "=" * 80 + "\n"
        summary += "Conversation Analysis:\n"
        summary += "-" * 80 + "\n"
        summary += f"Total Turns: {analysis['total_turns']}\n\n"
        
        summary += "Contributions by Agent:\n"
        for agent, count in analysis['contributions_by_agent'].items():
            summary += f"  - {agent}: {count} turns\n"
        
        summary += "\nContributions by Action Type:\n"
        for action, count in analysis['contributions_by_action'].items():
            summary += f"  - {action}: {count} times\n"
        
        summary += f"\nBalance Score: {analysis['balance_score']:.2f}\n"
        summary += "=" * 80 + "\n"
        
        return summary
    
    def get_key_insights(self) -> Dict[str, List[str]]:
        """
        Extract key insights from the conversation by action type.
        
        Returns:
            Dictionary with lists of insights by action type
        """
        insights = {
            'BUILD': [],
            'CRITIQUE': [],
            'QUESTION': []
        }
        
        for contribution in self.contributions:
            action = contribution['action']
            content = contribution['content']
            
            # Take first sentence or up to 200 characters
            snippet = content.split('.')[0][:200]
            if len(content) > 200:
                snippet += "..."
            
            insights[action].append({
                'agent': contribution['agent'],
                'content': snippet
            })
        
        return insights
