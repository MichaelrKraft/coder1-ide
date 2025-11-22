"""
AI Mastermind Demonstration Script
This script demonstrates the complete workflow with simulated Claude agent responses.
"""

import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_mastermind import (
    Orchestrator,
    IdeaTournament,
    CollaborativeDeepDive,
    ReportGenerator,
    ClaudeAgentResponse,
    get_default_mastermind_group,
    get_persona,
    create_ideation_batch,
    create_voting_batch
)


# Mock responses for demonstration
MOCK_IDEATION_RESPONSES = {
    "master_of_innovation": """What if we created an AI-powered "Code Health Monitor" that continuously analyzes your codebase in real-time, visualizing technical debt as a living, breathing organism? It would show you which parts of your code are "healthy" (well-tested, documented, maintainable) versus "sick" (high complexity, low coverage, outdated dependencies). The visualization could be a 3D interactive map where you can zoom into problem areas and get AI-suggested refactoring plans.""",
    
    "master_of_execution": """We could build an "Instant Code Review Queue" system that automatically pairs developers for peer reviews based on their expertise and availability. When you commit code, the system analyzes the changes, identifies the most qualified reviewer from your team (based on their past work in similar areas), and creates a focused review request with AI-generated context about what changed and why. It would integrate directly into the IDE with a sidebar showing your review queue and estimated time for each review.""",
    
    "master_of_risk": """I propose a "Pre-Commit Risk Analyzer" that runs before every commit and flags potential issues: security vulnerabilities, performance regressions, breaking API changes, or code that violates team standards. Instead of discovering problems after they're merged, developers get immediate feedback with severity scores and suggested fixes. The system would learn from past incidents to improve its risk detection over time.""",
    
    "master_of_empathy": """Let's create a "Developer Wellness Dashboard" that helps teams maintain sustainable work practices. It would track metrics like code churn (how often files are rewritten), late-night commits, PR review times, and meeting load. The dashboard would provide gentle nudges when someone is overworked and celebrate wins when the team maintains healthy practices. The focus is on preventing burnout and fostering a supportive development culture."""
}

MOCK_VOTING_RESPONSES = {
    "master_of_innovation": {
        "vote": "B",
        "justification": "The Instant Code Review Queue addresses a real pain point that every development team faces. While my Code Health Monitor is visionary, the review queue has immediate practical value and could be built quickly."
    },
    "master_of_execution": {
        "vote": "C",
        "justification": "The Pre-Commit Risk Analyzer is technically feasible and provides immense value. It catches problems early when they're cheapest to fix, which is engineering gold."
    },
    "master_of_risk": {
        "vote": "B",
        "justification": "The Instant Code Review Queue solves a coordination problem that causes significant delays. It's a force multiplier for team productivity."
    },
    "master_of_empathy": {
        "vote": "B",
        "justification": "The review queue concept respects developers' time by making reviews more efficient and contextual. It reduces frustration and improves collaboration."
    }
}

MOCK_DEEP_DIVE_RESPONSES = [
    {
        "persona": "master_of_execution",
        "response": """Action: BUILD
Content: To build the Instant Code Review Queue, we would need several core components: (1) A Git hook integration that triggers on commits, (2) A machine learning model that analyzes code diffs and matches them to developer expertise profiles, (3) A real-time notification system, and (4) An IDE sidebar widget. We could use Python for the backend with FastAPI, React for the sidebar UI, and integrate with existing Git providers like GitHub or GitLab. The MVP could be built in 4-6 weeks."""
    },
    {
        "persona": "master_of_risk",
        "response": """Action: CRITIQUE
Content: Have we considered the privacy implications of analyzing developer expertise and availability? Some developers might feel uncomfortable with a system that tracks their work patterns. Also, what happens if the AI makes a poor match and assigns a reviewer who isn't actually qualified? We need a manual override option and clear transparency about how the matching algorithm works."""
    },
    {
        "persona": "master_of_empathy",
        "response": """Action: BUILD
Content: Building on the privacy concern, we should make the system opt-in and give developers full control over their profiles. They should be able to specify their areas of expertise, set their availability status (like "deep work mode" or "available for reviews"), and see why they were selected for a review. This transparency builds trust and ensures developers feel empowered, not monitored."""
    },
    {
        "persona": "master_of_innovation",
        "response": """Action: BUILD
Content: What if we added a "learning mode" where junior developers could opt-in to observe code reviews in their areas of interest? They wouldn't be the primary reviewer, but they'd get notifications about relevant reviews happening in real-time. This turns the review queue into a mentorship tool, helping junior devs learn from senior devs' feedback patterns."""
    },
    {
        "persona": "master_of_execution",
        "response": """Action: BUILD
Content: For the AI-generated context, we could analyze the commit message, the files changed, and the actual diff to create a summary like: "This PR refactors the authentication middleware to support OAuth2. Key changes: modified auth.py (45 lines), added new tests (120 lines). Recommended reviewer: Sarah (worked on auth system 3 months ago) or Mike (OAuth expert)." This context saves reviewers 5-10 minutes of orientation time."""
    },
    {
        "persona": "master_of_risk",
        "response": """Action: QUESTION
Content: How do we handle situations where the "best" reviewer is consistently overloaded? The system might always route security-related PRs to the same person, creating a bottleneck. Should we implement load balancing or a fallback to the second-best reviewer?"""
    },
    {
        "persona": "master_of_empathy",
        "response": """Action: BUILD
Content: We should absolutely implement load balancing with a "review capacity" setting. Each developer can set how many reviews they're comfortable taking per day/week. The system respects these limits and distributes work fairly. If someone is at capacity, the system suggests the next best reviewer and optionally notifies the team that a certain expertise area is oversubscribed."""
    },
    {
        "persona": "master_of_innovation",
        "response": """Action: BUILD
Content: Imagine if the system could predict review time based on PR complexity and reviewer familiarity. It could show estimates like "This review will take ~15 minutes" so developers can plan their day. Over time, the AI learns each person's review speed and accuracy, making better predictions."""
    }
]


def print_section(title: str):
    """Print a formatted section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def simulate_mastermind_session():
    """Simulate a complete mastermind session."""
    
    print_section("AI MASTERMIND DEMONSTRATION")
    print("This demo simulates a complete mastermind session with mock Claude agent responses.\n")
    
    # Initialize
    problem_statement = "How can we improve code review efficiency in our IDE?"
    print(f"Problem Statement: {problem_statement}\n")
    
    orchestrator = Orchestrator(
        problem_statement=problem_statement,
        project_context="A modern IDE for developers with Git integration and collaboration features."
    )
    
    # Phase 1: Ideation
    print_section("PHASE 1: IDEA TOURNAMENT - IDEATION")
    
    persona_keys = get_default_mastermind_group()
    ideation_batch = create_ideation_batch(orchestrator, persona_keys)
    
    print(f"Launching {len(ideation_batch.tasks)} agents in parallel for ideation...\n")
    
    # Simulate agent responses
    ideation_responses = []
    for task in ideation_batch.tasks:
        persona_key = task.agent_id.replace("mastermind_", "")
        mock_content = MOCK_IDEATION_RESPONSES.get(persona_key, "No response")
        
        response = ClaudeAgentResponse(
            agent_id=task.agent_id,
            persona_name=task.persona_name,
            content=mock_content,
            success=True
        )
        ideation_responses.append(response)
        
        print(f"{task.persona_name}:")
        print(f"{mock_content}\n")
    
    # Process ideation
    phase_one = IdeaTournament(orchestrator)
    concepts = phase_one.process_ideation_responses(ideation_responses)
    
    print(f"\n✓ Generated {len(concepts)} concepts\n")
    
    # Phase 1: Voting
    print_section("PHASE 1: IDEA TOURNAMENT - VOTING")
    
    voting_batch = create_voting_batch(orchestrator, persona_keys, concepts)
    
    print(f"Agents are now voting on the best concept...\n")
    
    # Simulate voting responses
    voting_responses = []
    for task in voting_batch.tasks:
        persona_key = task.agent_id.replace("mastermind_", "")
        mock_vote = MOCK_VOTING_RESPONSES.get(persona_key, {"vote": "A", "justification": "Default"})
        
        vote_content = f"Vote: Concept {mock_vote['vote']}\nJustification: {mock_vote['justification']}"
        
        response = ClaudeAgentResponse(
            agent_id=task.agent_id,
            persona_name=task.persona_name,
            content=vote_content,
            success=True
        )
        voting_responses.append(response)
        
        print(f"{task.persona_name} votes for Concept {mock_vote['vote']}")
        print(f"  → {mock_vote['justification']}\n")
    
    # Process votes
    vote_results = phase_one.process_voting_responses(voting_responses)
    
    print(f"\n🏆 WINNING CONCEPT: {vote_results['winning_concept']}")
    print(f"   {vote_results['winning_concept_full']['content'][:150]}...\n")
    
    # Phase 2: Deep Dive
    print_section("PHASE 2: COLLABORATIVE DEEP DIVE")
    
    winning_concept = phase_one.get_winning_concept()
    phase_two = CollaborativeDeepDive(orchestrator, winning_concept)
    
    print(f"Starting collaborative refinement of the winning concept...\n")
    print(f"The agents will now BUILD, CRITIQUE, and QUESTION the concept.\n")
    
    # Simulate deep dive turns
    for i, mock_turn in enumerate(MOCK_DEEP_DIVE_RESPONSES):
        persona_key = mock_turn['persona']
        persona = get_persona(persona_key)
        
        response = ClaudeAgentResponse(
            agent_id=f"mastermind_{persona_key}",
            persona_name=persona['display_name'],
            content=mock_turn['response'],
            success=True
        )
        
        contribution = phase_two.process_turn_response(response)
        
        print(f"Turn {contribution['turn']} - {contribution['agent']} [{contribution['action']}]:")
        print(f"{contribution['content'][:200]}...\n")
    
    print(f"✓ Completed {phase_two.turn_count} turns of collaborative refinement\n")
    
    # Generate Report
    print_section("GENERATING FINAL REPORT")
    
    report_generator = ReportGenerator(orchestrator, phase_one, phase_two)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = f"/home/ubuntu/mastermind_report_{timestamp}.md"
    
    print("Synthesizing conversation into comprehensive report...")
    report_generator.save_report(report_path)
    
    print(f"\n✓ Report saved to: {report_path}\n")
    
    # Display summary
    print_section("SESSION SUMMARY")
    
    analysis = phase_two.analyze_conversation_balance()
    
    print(f"Problem: {problem_statement}")
    print(f"Winning Concept: {winning_concept['content'][:100]}...")
    print(f"\nPhase 1 Statistics:")
    print(f"  - Concepts Generated: {len(concepts)}")
    print(f"  - Votes Cast: {len(phase_one.votes)}")
    print(f"\nPhase 2 Statistics:")
    print(f"  - Total Turns: {analysis['total_turns']}")
    print(f"  - BUILD actions: {analysis['contributions_by_action']['BUILD']}")
    print(f"  - CRITIQUE actions: {analysis['contributions_by_action']['CRITIQUE']}")
    print(f"  - QUESTION actions: {analysis['contributions_by_action']['QUESTION']}")
    print(f"  - Conversation Balance Score: {analysis['balance_score']:.2f}")
    
    print(f"\n✓ Mastermind session complete!")
    print(f"✓ Final report available at: {report_path}\n")
    
    return report_path


if __name__ == "__main__":
    try:
        report_path = simulate_mastermind_session()
        print("\nTo view the report, run:")
        print(f"  cat {report_path}")
    except Exception as e:
        print(f"\n❌ Error during demonstration: {e}")
        import traceback
        traceback.print_exc()
