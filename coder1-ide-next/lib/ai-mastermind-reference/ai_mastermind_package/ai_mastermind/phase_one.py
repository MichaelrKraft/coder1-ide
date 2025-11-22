"""
Phase 1: Idea Tournament Implementation
This module handles the ideation and voting process where agents generate
initial concepts and democratically select the best one.
"""

from typing import List, Dict, Any, Optional
import re


class IdeaTournament:
    """
    Manages Phase 1 of the mastermind session: ideation and democratic voting.
    """
    
    def __init__(self, orchestrator):
        """
        Initialize the Idea Tournament.
        
        Args:
            orchestrator: The Orchestrator instance managing the session
        """
        self.orchestrator = orchestrator
        self.concepts: List[Dict[str, Any]] = []
        self.votes: List[Dict[str, Any]] = []
        self.winning_concept: Optional[Dict[str, Any]] = None
        
    def process_ideation_responses(
        self,
        responses: List['ClaudeAgentResponse']
    ) -> List[Dict[str, Any]]:
        """
        Process the ideation responses from all agents.
        
        Args:
            responses: List of ClaudeAgentResponse objects from ideation phase
            
        Returns:
            List of concept dictionaries
        """
        self.concepts = []
        
        for i, response in enumerate(responses):
            if not response.success:
                print(f"Warning: Agent {response.persona_name} failed during ideation")
                continue
                
            concept = {
                'id': chr(65 + i),  # A, B, C, D, etc.
                'author': response.persona_name,
                'author_id': response.agent_id,
                'content': response.content.strip()
            }
            
            self.concepts.append(concept)
            
            # Add to conversation history
            self.orchestrator.add_to_history(
                speaker=response.persona_name,
                content=response.content,
                action_type="IDEATION"
            )
        
        return self.concepts
    
    def parse_vote_response(self, response_content: str) -> Dict[str, str]:
        """
        Parse a voting response to extract the vote and justification.
        
        Args:
            response_content: The raw response content from the agent
            
        Returns:
            Dictionary with 'choice' and 'justification'
        """
        # Try to extract structured vote
        vote_match = re.search(r'Vote:\s*(?:Concept\s*)?([A-Z])', response_content, re.IGNORECASE)
        justification_match = re.search(r'Justification:\s*(.+)', response_content, re.IGNORECASE | re.DOTALL)
        
        if vote_match and justification_match:
            return {
                'choice': vote_match.group(1).upper(),
                'justification': justification_match.group(1).strip()
            }
        
        # Fallback: try to find any mention of "Concept X"
        concept_match = re.search(r'Concept\s*([A-Z])', response_content, re.IGNORECASE)
        if concept_match:
            return {
                'choice': concept_match.group(1).upper(),
                'justification': response_content
            }
        
        # If all else fails, return the first concept
        return {
            'choice': 'A',
            'justification': response_content
        }
    
    def process_voting_responses(
        self,
        responses: List['ClaudeAgentResponse']
    ) -> Dict[str, Any]:
        """
        Process the voting responses from all agents.
        
        Args:
            responses: List of ClaudeAgentResponse objects from voting phase
            
        Returns:
            Dictionary containing vote results and winning concept
        """
        self.votes = []
        
        for response in responses:
            if not response.success:
                print(f"Warning: Agent {response.persona_name} failed during voting")
                continue
            
            parsed_vote = self.parse_vote_response(response.content)
            
            # Validate that agent didn't vote for their own concept
            voter_concept_id = None
            for concept in self.concepts:
                if concept['author_id'] == response.agent_id:
                    voter_concept_id = concept['id']
                    break
            
            # If they voted for themselves, assign to first alternative
            if parsed_vote['choice'] == voter_concept_id:
                for concept in self.concepts:
                    if concept['id'] != voter_concept_id:
                        parsed_vote['choice'] = concept['id']
                        parsed_vote['justification'] += " (Vote reassigned - cannot vote for own concept)"
                        break
            
            vote = {
                'voter': response.persona_name,
                'voter_id': response.agent_id,
                'choice': parsed_vote['choice'],
                'justification': parsed_vote['justification']
            }
            
            self.votes.append(vote)
            
            # Add to conversation history
            self.orchestrator.add_to_history(
                speaker=response.persona_name,
                content=f"Vote: Concept {vote['choice']}\nJustification: {vote['justification']}",
                action_type="VOTING"
            )
        
        # Tally votes
        vote_results = self.orchestrator.tally_votes(self.votes)
        
        # Find the winning concept
        winning_id = vote_results['winning_concept']
        for concept in self.concepts:
            if concept['id'] == winning_id:
                self.winning_concept = concept
                break
        
        vote_results['winning_concept_full'] = self.winning_concept
        
        return vote_results
    
    def add_user_vote(self, concept_id: str, justification: str = "User selection"):
        """
        Add a vote from the human user.
        
        Args:
            concept_id: The ID of the concept (A, B, C, etc.)
            justification: Optional justification for the vote
        """
        vote = {
            'voter': 'User (Human Facilitator)',
            'voter_id': 'user',
            'choice': concept_id.upper(),
            'justification': justification
        }
        
        self.votes.append(vote)
        
        self.orchestrator.add_to_history(
            speaker='User',
            content=f"Vote: Concept {vote['choice']}\nJustification: {vote['justification']}",
            action_type="VOTING"
        )
    
    def generate_phase_summary(self) -> str:
        """
        Generate a summary of Phase 1 for display or logging.
        
        Returns:
            Formatted string summarizing the ideation and voting
        """
        summary = "=" * 80 + "\n"
        summary += "PHASE 1: IDEA TOURNAMENT - SUMMARY\n"
        summary += "=" * 80 + "\n\n"
        
        summary += "Generated Concepts:\n"
        summary += "-" * 80 + "\n"
        for concept in self.concepts:
            summary += f"\nConcept {concept['id']} (by {concept['author']}):\n"
            summary += f"{concept['content']}\n"
        
        summary += "\n" + "=" * 80 + "\n"
        summary += "Voting Results:\n"
        summary += "-" * 80 + "\n"
        
        for vote in self.votes:
            summary += f"\n{vote['voter']} voted for Concept {vote['choice']}\n"
            summary += f"Justification: {vote['justification']}\n"
        
        if self.winning_concept:
            summary += "\n" + "=" * 80 + "\n"
            summary += f"🏆 WINNING CONCEPT: {self.winning_concept['id']}\n"
            summary += f"Author: {self.winning_concept['author']}\n"
            summary += f"Content: {self.winning_concept['content']}\n"
            summary += "=" * 80 + "\n"
        
        return summary
    
    def get_winning_concept(self) -> Optional[Dict[str, Any]]:
        """
        Get the winning concept.
        
        Returns:
            Dictionary containing the winning concept, or None if not yet determined
        """
        return self.winning_concept
