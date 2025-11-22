"""
Report Generator for AI Mastermind
This module generates the final comprehensive report after the mastermind session.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import re


class ReportGenerator:
    """
    Generates the final mastermind report with executive summary, project plan,
    risks, and future enhancements.
    """
    
    def __init__(self, orchestrator, phase_one, phase_two):
        """
        Initialize the report generator.
        
        Args:
            orchestrator: The Orchestrator instance
            phase_one: The IdeaTournament instance
            phase_two: The CollaborativeDeepDive instance
        """
        self.orchestrator = orchestrator
        self.phase_one = phase_one
        self.phase_two = phase_two
        
    def generate_full_report(self) -> str:
        """
        Generate the complete mastermind report.
        
        Returns:
            Formatted Markdown string containing the full report
        """
        report = self._generate_header()
        report += self._generate_executive_summary()
        report += self._generate_detailed_project_plan()
        report += self._generate_unresolved_risks()
        report += self._generate_future_enhancements()
        report += self._generate_appendix()
        
        return report
    
    def _generate_header(self) -> str:
        """Generate the report header."""
        winning_concept = self.phase_one.get_winning_concept()
        
        header = f"""# AI Mastermind Session Report

**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Session Duration:** {self._calculate_duration()}
**Problem Statement:** {self.orchestrator.problem_statement}

---

"""
        return header
    
    def _calculate_duration(self) -> str:
        """Calculate session duration."""
        duration = datetime.now() - self.orchestrator.session_start_time
        minutes = int(duration.total_seconds() / 60)
        return f"{minutes} minutes"
    
    def _generate_executive_summary(self) -> str:
        """Generate Section 1: Executive Summary."""
        winning_concept = self.phase_one.get_winning_concept()
        
        summary = f"""## 1. Executive Summary

### The Winning Concept

**Concept ID:** {winning_concept['id']}
**Proposed by:** {winning_concept['author']}

{winning_concept['content']}

### Why This Concept Won

This concept was selected through a democratic voting process by the mastermind group. The key reasons for its selection include:

"""
        
        # Extract voting justifications
        for vote in self.phase_one.votes:
            if vote['choice'] == winning_concept['id']:
                summary += f"- **{vote['voter']}:** {vote['justification']}\n"
        
        summary += "\n### Refined Vision\n\n"
        summary += "After collaborative refinement through the deep dive phase, the concept has evolved to incorporate:\n\n"
        
        # Extract key BUILD contributions
        builds = [c for c in self.phase_two.contributions if c['action'] == 'BUILD']
        for i, build in enumerate(builds[:3]):  # Top 3 builds
            summary += f"{i+1}. {build['content'][:200]}...\n"
        
        summary += "\n---\n\n"
        return summary
    
    def _generate_detailed_project_plan(self) -> str:
        """Generate Section 2: Detailed Project Plan."""
        plan = """## 2. Detailed Project Plan

### 2.1 Core Features (MVP - Minimum Viable Product)

The following features are essential for the initial launch:

"""
        
        # Extract features from BUILD contributions
        builds = [c for c in self.phase_two.contributions if c['action'] == 'BUILD']
        features = self._extract_features_from_builds(builds)
        
        for i, feature in enumerate(features, 1):
            plan += f"{i}. **{feature['title']}**\n"
            plan += f"   - {feature['description']}\n"
            plan += f"   - *Suggested by: {feature['agent']}*\n\n"
        
        plan += "### 2.2 User Experience (UX) Flow\n\n"
        plan += self._extract_ux_flow()
        
        plan += "\n### 2.3 Proposed Technical Stack\n\n"
        plan += self._extract_technical_stack()
        
        plan += "\n### 2.4 Implementation Phases\n\n"
        plan += self._generate_implementation_phases(features)
        
        plan += "\n---\n\n"
        return plan
    
    def _extract_features_from_builds(self, builds: List[Dict]) -> List[Dict[str, str]]:
        """Extract structured features from BUILD contributions."""
        features = []
        
        for build in builds:
            content = build['content']
            
            # Try to identify feature-like statements
            sentences = content.split('.')
            for sentence in sentences:
                sentence = sentence.strip()
                if len(sentence) > 20 and any(keyword in sentence.lower() for keyword in 
                    ['feature', 'capability', 'function', 'system', 'platform', 'tool', 'integration', 'api']):
                    
                    # Extract title (first few words) and description
                    words = sentence.split()
                    title = ' '.join(words[:5]) if len(words) > 5 else sentence
                    
                    features.append({
                        'title': title,
                        'description': sentence,
                        'agent': build['agent']
                    })
        
        # If no features found, create generic ones from builds
        if not features:
            for i, build in enumerate(builds[:5]):
                features.append({
                    'title': f"Feature {i+1}",
                    'description': build['content'][:150],
                    'agent': build['agent']
                })
        
        return features[:8]  # Limit to 8 features
    
    def _extract_ux_flow(self) -> str:
        """Extract user experience flow from contributions."""
        ux_flow = "The user journey follows these key steps:\n\n"
        
        # Look for empathy-related contributions
        empathy_contributions = [c for c in self.phase_two.contributions 
                                if 'empathy' in c['agent'].lower() or 'user' in c['content'].lower()]
        
        if empathy_contributions:
            for i, contrib in enumerate(empathy_contributions[:3], 1):
                ux_flow += f"{i}. {contrib['content'][:200]}...\n"
        else:
            ux_flow += "1. User onboards and sets up their account\n"
            ux_flow += "2. User configures their preferences and goals\n"
            ux_flow += "3. User engages with the core functionality\n"
            ux_flow += "4. User receives feedback and iterates\n"
        
        return ux_flow + "\n"
    
    def _extract_technical_stack(self) -> str:
        """Extract technical stack recommendations."""
        tech_stack = "Based on the discussion, the recommended technical stack includes:\n\n"
        
        # Look for execution-related contributions
        execution_contributions = [c for c in self.phase_two.contributions 
                                  if 'execution' in c['agent'].lower() or 'engineer' in c['agent'].lower()]
        
        if execution_contributions:
            for contrib in execution_contributions[:2]:
                # Try to extract technology mentions
                tech_keywords = ['python', 'javascript', 'react', 'node', 'api', 'database', 
                               'aws', 'cloud', 'framework', 'library']
                
                content_lower = contrib['content'].lower()
                found_tech = [tech for tech in tech_keywords if tech in content_lower]
                
                if found_tech:
                    tech_stack += f"- Technologies mentioned: {', '.join(found_tech)}\n"
            
            tech_stack += f"\n*Detailed recommendations from {execution_contributions[0]['agent']}:*\n"
            tech_stack += f"{execution_contributions[0]['content'][:300]}...\n"
        else:
            tech_stack += "- **Frontend:** Modern web framework (React, Vue, or similar)\n"
            tech_stack += "- **Backend:** RESTful API (Node.js, Python, or similar)\n"
            tech_stack += "- **Database:** SQL or NoSQL based on data structure needs\n"
            tech_stack += "- **Cloud Services:** AWS, Google Cloud, or Azure\n"
        
        return tech_stack + "\n"
    
    def _generate_implementation_phases(self, features: List[Dict]) -> str:
        """Generate implementation phase breakdown."""
        phases = "**Phase 1: Foundation (Weeks 1-2)**\n"
        phases += "- Set up development environment and infrastructure\n"
        phases += "- Implement core data models and database schema\n"
        phases += f"- Build {features[0]['title'] if features else 'initial feature'}\n\n"
        
        phases += "**Phase 2: Core Features (Weeks 3-4)**\n"
        for feature in features[1:4]:
            phases += f"- Implement {feature['title']}\n"
        phases += "\n"
        
        phases += "**Phase 3: Integration & Testing (Weeks 5-6)**\n"
        phases += "- Integrate all components\n"
        phases += "- Conduct thorough testing (unit, integration, user acceptance)\n"
        phases += "- Address bugs and performance issues\n\n"
        
        phases += "**Phase 4: Launch Preparation (Week 7)**\n"
        phases += "- Finalize documentation\n"
        phases += "- Prepare deployment pipeline\n"
        phases += "- Conduct security audit\n"
        phases += "- Launch MVP\n"
        
        return phases
    
    def _generate_unresolved_risks(self) -> str:
        """Generate Section 3: Unresolved Risks & Open Questions."""
        risks = """## 3. Unresolved Risks & Open Questions

The following concerns and risks were identified during the mastermind session and require further investigation and mitigation strategies:

"""
        
        # Extract CRITIQUE contributions
        critiques = [c for c in self.phase_two.contributions if c['action'] == 'CRITIQUE']
        
        if critiques:
            # Categorize risks
            risk_categories = {
                'Technical & Feasibility Risks': [],
                'User Adoption & Behavioral Risks': [],
                'Security & Privacy Risks': [],
                'Business & Operational Risks': []
            }
            
            for critique in critiques:
                content = critique['content']
                agent = critique['agent']
                
                # Categorize based on keywords
                if any(word in content.lower() for word in ['security', 'privacy', 'data', 'breach']):
                    risk_categories['Security & Privacy Risks'].append((agent, content))
                elif any(word in content.lower() for word in ['user', 'adoption', 'behavior', 'trust']):
                    risk_categories['User Adoption & Behavioral Risks'].append((agent, content))
                elif any(word in content.lower() for word in ['technical', 'feasibility', 'complexity', 'scale']):
                    risk_categories['Technical & Feasibility Risks'].append((agent, content))
                else:
                    risk_categories['Business & Operational Risks'].append((agent, content))
            
            for category, items in risk_categories.items():
                if items:
                    risks += f"### {category}\n\n"
                    for agent, content in items:
                        risks += f"**Raised by {agent}:**\n"
                        risks += f"{content}\n\n"
        else:
            risks += "No specific risks were identified during the session. However, standard project risks apply:\n\n"
            risks += "- **Technical Complexity:** Ensure the solution is technically feasible within constraints\n"
            risks += "- **User Adoption:** Validate that users will actually use the solution\n"
            risks += "- **Security:** Conduct thorough security audits before launch\n"
        
        # Add QUESTION contributions as open questions
        questions = [c for c in self.phase_two.contributions if c['action'] == 'QUESTION']
        
        if questions:
            risks += "\n### Open Questions Requiring Resolution\n\n"
            for i, question in enumerate(questions, 1):
                risks += f"{i}. **{question['agent']} asks:** {question['content']}\n\n"
        
        risks += "---\n\n"
        return risks
    
    def _generate_future_enhancements(self) -> str:
        """Generate Section 4: Potential Future Enhancements."""
        enhancements = """## 4. Potential Future Enhancements (Post-MVP)

The following features and ideas were discussed but deemed non-essential for the initial launch. They provide a roadmap for version 2.0 and beyond:

"""
        
        # Extract visionary/innovative contributions
        innovations = [c for c in self.phase_two.contributions 
                      if 'innovation' in c['agent'].lower() or 'visionary' in c['agent'].lower()]
        
        if innovations:
            for i, innovation in enumerate(innovations, 1):
                enhancements += f"### Enhancement {i}: {innovation['agent']}'s Vision\n\n"
                enhancements += f"{innovation['content']}\n\n"
        
        # Add generic future enhancements
        enhancements += "### Additional Considerations for Future Versions\n\n"
        enhancements += "- **Advanced Analytics:** Implement comprehensive analytics and reporting\n"
        enhancements += "- **AI/ML Integration:** Leverage machine learning for personalization\n"
        enhancements += "- **Mobile Applications:** Develop native iOS and Android apps\n"
        enhancements += "- **API Ecosystem:** Create public APIs for third-party integrations\n"
        enhancements += "- **Enterprise Features:** Add team collaboration and admin controls\n"
        enhancements += "- **Internationalization:** Support multiple languages and regions\n\n"
        
        enhancements += "---\n\n"
        return enhancements
    
    def _generate_appendix(self) -> str:
        """Generate appendix with full conversation history."""
        appendix = """## Appendix: Full Conversation History

### Phase 1: Idea Tournament

#### Generated Concepts

"""
        
        for concept in self.phase_one.concepts:
            appendix += f"**Concept {concept['id']} (by {concept['author']}):**\n"
            appendix += f"{concept['content']}\n\n"
        
        appendix += "#### Voting Results\n\n"
        
        for vote in self.phase_one.votes:
            appendix += f"- **{vote['voter']}** voted for Concept {vote['choice']}\n"
            appendix += f"  - Justification: {vote['justification']}\n\n"
        
        appendix += "### Phase 2: Collaborative Deep Dive\n\n"
        
        for contribution in self.phase_two.contributions:
            appendix += f"**Turn {contribution['turn']} - {contribution['agent']} [{contribution['action']}]:**\n"
            appendix += f"{contribution['content']}\n\n"
        
        appendix += "---\n\n"
        appendix += "*End of Report*\n"
        
        return appendix
    
    def save_report(self, filepath: str) -> str:
        """
        Generate and save the report to a file.
        
        Args:
            filepath: Path where the report should be saved
            
        Returns:
            The filepath where the report was saved
        """
        report_content = self.generate_full_report()
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return filepath
