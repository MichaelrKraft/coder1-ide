import React, { useState, useEffect } from 'react';
import { AdvancedPersonaService, PersonaConsultation, PersonaOpinion } from '../services/AdvancedPersonaService';
import './PersonaConsultationPanel.css';

interface PersonaConsultationPanelProps {
  workspaceId: string;
  personaService: AdvancedPersonaService;
  availablePersonas: string[];
}

export const PersonaConsultationPanel: React.FC<PersonaConsultationPanelProps> = ({
  workspaceId,
  personaService,
  availablePersonas
}) => {
  const [consultations, setConsultations] = useState<PersonaConsultation[]>([]);
  const [isConsulting, setIsConsulting] = useState(false);
  const [newConsultation, setNewConsultation] = useState({
    scenario: '',
    selectedPersonas: [] as string[]
  });
  const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);

  useEffect(() => {
    const history = personaService.getConsultationHistory(workspaceId);
    setConsultations(history);
  }, [workspaceId, personaService]);

  const handleStartConsultation = async () => {
    if (!newConsultation.scenario.trim() || newConsultation.selectedPersonas.length < 2) {
      alert('Please provide a scenario and select at least 2 personas for consultation');
      return;
    }

    setIsConsulting(true);
    try {
      const consultation = await personaService.consultMultiplePersonas(
        workspaceId,
        newConsultation.scenario,
        newConsultation.selectedPersonas
      );

      setConsultations(prev => [consultation, ...prev]);
      setNewConsultation({ scenario: '', selectedPersonas: [] });
    } catch (error) {
      console.error('Failed to start consultation:', error);
      alert('Failed to start consultation. Please try again.');
    } finally {
      setIsConsulting(false);
    }
  };

  const togglePersonaSelection = (personaId: string) => {
    setNewConsultation(prev => ({
      ...prev,
      selectedPersonas: prev.selectedPersonas.includes(personaId)
        ? prev.selectedPersonas.filter(id => id !== personaId)
        : [...prev.selectedPersonas, personaId]
    }));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#22c55e';
    if (confidence >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getVoteIcon = (vote: 'approve' | 'reject' | 'modify') => {
    switch (vote) {
      case 'approve': return '✅';
      case 'reject': return '❌';
      case 'modify': return '🔄';
    }
  };

  return (
    <div className="persona-consultation-panel">
      <div className="consultation-header">
        <h3>🤝 Multi-Persona Consultation</h3>
        <div className="consultation-stats">
          <span className="stat">
            Total Consultations: {consultations.length}
          </span>
          <span className="stat">
            Avg Confidence: {consultations.length > 0 
              ? Math.round(consultations.reduce((sum, c) => sum + c.confidence, 0) / consultations.length)
              : 0}%
          </span>
        </div>
      </div>

      <div className="new-consultation">
        <h4>Start New Consultation</h4>
        <div className="consultation-form">
          <div className="form-group">
            <label>Scenario Description:</label>
            <textarea
              value={newConsultation.scenario}
              onChange={(e) => setNewConsultation(prev => ({ ...prev, scenario: e.target.value }))}
              placeholder="Describe the scenario you need consultation on..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Select Personas (minimum 2):</label>
            <div className="persona-selection">
              {availablePersonas.map(personaId => (
                <label key={personaId} className="persona-checkbox">
                  <input
                    type="checkbox"
                    checked={newConsultation.selectedPersonas.includes(personaId)}
                    onChange={() => togglePersonaSelection(personaId)}
                  />
                  <span className="persona-name">
                    {personaId.charAt(0).toUpperCase() + personaId.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleStartConsultation}
            disabled={isConsulting || newConsultation.selectedPersonas.length < 2}
          >
            {isConsulting ? '🔄 Consulting...' : '🚀 Start Consultation'}
          </button>
        </div>
      </div>

      <div className="consultation-history">
        <h4>Consultation History</h4>
        {consultations.length === 0 ? (
          <div className="empty-state">
            <p>No consultations yet. Start your first multi-persona consultation above!</p>
          </div>
        ) : (
          <div className="consultations-list">
            {consultations.map(consultation => (
              <div key={consultation.id} className="consultation-item">
                <div className="consultation-summary">
                  <div className="consultation-info">
                    <h5>{consultation.scenario}</h5>
                    <div className="consultation-meta">
                      <span className="timestamp">
                        {consultation.timestamp.toLocaleDateString()} {consultation.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="personas-count">
                        {consultation.participatingPersonas.length} personas
                      </span>
                      <span 
                        className="confidence-badge"
                        style={{ backgroundColor: getConfidenceColor(consultation.confidence) }}
                      >
                        {consultation.confidence}% confidence
                      </span>
                    </div>
                  </div>
                  <button
                    className="expand-btn"
                    onClick={() => setExpandedConsultation(
                      expandedConsultation === consultation.id ? null : consultation.id
                    )}
                  >
                    {expandedConsultation === consultation.id ? '▼' : '▶'}
                  </button>
                </div>

                {expandedConsultation === consultation.id && (
                  <div className="consultation-details">
                    <div className="consensus-summary">
                      <h6>Consensus Result</h6>
                      <div className="consensus-info">
                        <div className="consensus-stat">
                          <span className="label">Agreement:</span>
                          <span className="value">{Math.round(consultation.consensus.agreement * 100)}%</span>
                        </div>
                        <div className="consensus-stat">
                          <span className="label">Majority Vote:</span>
                          <span className="value">
                            {getVoteIcon(consultation.consensus.majorityVote)} {consultation.consensus.majorityVote}
                          </span>
                        </div>
                      </div>
                      <div className="final-decision">
                        <strong>Final Decision:</strong> {consultation.finalDecision}
                      </div>
                      {consultation.consensus.synthesizedApproach && (
                        <div className="synthesized-approach">
                          <strong>Synthesized Approach:</strong> {consultation.consensus.synthesizedApproach}
                        </div>
                      )}
                    </div>

                    <div className="persona-opinions">
                      <h6>Individual Opinions</h6>
                      {consultation.opinions.map((opinion, index) => (
                        <div key={index} className="opinion-card">
                          <div className="opinion-header">
                            <span className="persona-name">
                              {opinion.personaId.charAt(0).toUpperCase() + opinion.personaId.slice(1)}
                            </span>
                            <div className="opinion-meta">
                              <span className="vote">
                                {getVoteIcon(opinion.vote)} {opinion.vote}
                              </span>
                              <span 
                                className="confidence"
                                style={{ color: getConfidenceColor(opinion.confidence) }}
                              >
                                {opinion.confidence}%
                              </span>
                            </div>
                          </div>
                          <div className="opinion-content">
                            <p><strong>Opinion:</strong> {opinion.opinion}</p>
                            <p><strong>Reasoning:</strong> {opinion.reasoning}</p>
                            {opinion.suggestions.length > 0 && (
                              <div className="suggestions">
                                <strong>Suggestions:</strong>
                                <ul>
                                  {opinion.suggestions.map((suggestion, idx) => (
                                    <li key={idx}>{suggestion}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {consultation.consensus.conflictAreas.length > 0 && (
                      <div className="conflict-areas">
                        <h6>⚠️ Conflict Areas</h6>
                        <ul>
                          {consultation.consensus.conflictAreas.map((conflict, idx) => (
                            <li key={idx}>{conflict}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
