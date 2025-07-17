import React, { useState, useEffect } from 'react';
import { MCPIntegrationService, MCPServer, MCPRequest } from '../services/MCPIntegrationService';
import './MCPServerPanel.css';

interface MCPServerPanelProps {
  workspaceId: string;
  mcpService: MCPIntegrationService;
}

export const MCPServerPanel: React.FC<MCPServerPanelProps> = ({
  workspaceId,
  mcpService
}) => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [requestHistory, setRequestHistory] = useState<MCPRequest[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [testCommand, setTestCommand] = useState('');
  const [testParameters, setTestParameters] = useState('{}');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  useEffect(() => {
    const updateServerStatus = () => {
      const currentServers = mcpService.getServerStatus();
      setServers(currentServers);
      
      const history = mcpService.getRequestHistory(workspaceId);
      setRequestHistory(history.slice(-10)); // Show last 10 requests
    };

    updateServerStatus();
    const interval = setInterval(updateServerStatus, 2000);
    
    return () => clearInterval(interval);
  }, [workspaceId, mcpService]);

  const handleConnectServer = async (serverId: string) => {
    setIsLoading(true);
    try {
      await mcpService.connectToServer(serverId);
      const updatedServers = mcpService.getServerStatus();
      setServers(updatedServers);
    } catch (error) {
      console.error('Failed to connect to server:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectServer = async (serverId: string) => {
    setIsLoading(true);
    try {
      await mcpService.disconnectFromServer(serverId);
      const updatedServers = mcpService.getServerStatus();
      setServers(updatedServers);
    } catch (error) {
      console.error('Failed to disconnect from server:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCommand = async () => {
    if (!selectedServer || !testCommand.trim()) {
      alert('Please select a server and enter a command');
      return;
    }

    setIsLoading(true);
    try {
      let parameters;
      try {
        parameters = JSON.parse(testParameters);
      } catch {
        parameters = {};
      }

      const response = await mcpService.sendMCPRequest(
        selectedServer,
        testCommand,
        parameters,
        workspaceId
      );

      setLastResponse(response);
      
      const updatedHistory = mcpService.getRequestHistory(workspaceId);
      setRequestHistory(updatedHistory.slice(-10));
    } catch (error) {
      console.error('Failed to send test command:', error);
      setLastResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconnectAll = async () => {
    setIsLoading(true);
    try {
      await mcpService.reconnectAllServers();
      const updatedServers = mcpService.getServerStatus();
      setServers(updatedServers);
    } catch (error) {
      console.error('Failed to reconnect servers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async (serverId?: string) => {
    try {
      await mcpService.clearCache(serverId);
      alert(serverId ? `Cache cleared for ${serverId}` : 'All cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'inactive': return '#6b7280';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'inactive': return '⚫';
      case 'error': return '🔴';
      default: return '⚫';
    }
  };

  return (
    <div className="mcp-server-panel">
      <div className="panel-header">
        <h3>🔌 MCP Server Management</h3>
        <div className="panel-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleReconnectAll}
            disabled={isLoading}
          >
            🔄 Reconnect All
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => handleClearCache()}
          >
            🗑️ Clear Cache
          </button>
        </div>
      </div>

      <div className="servers-grid">
        {servers.map(server => (
          <div key={server.id} className="server-card">
            <div className="server-header">
              <div className="server-info">
                <h4>{server.name}</h4>
                <span className="server-type">{server.type}</span>
              </div>
              <div className="server-status">
                <span 
                  className="status-indicator"
                  style={{ color: getStatusColor(server.status) }}
                >
                  {getStatusIcon(server.status)} {server.status}
                </span>
              </div>
            </div>

            <div className="server-details">
              <div className="server-stat">
                <span className="stat-label">Endpoint:</span>
                <span className="stat-value">{server.endpoint}</span>
              </div>
              <div className="server-stat">
                <span className="stat-label">Response Time:</span>
                <span className="stat-value">{Math.round(server.responseTime)}ms</span>
              </div>
              <div className="server-stat">
                <span className="stat-label">Last Used:</span>
                <span className="stat-value">
                  {server.lastUsed.toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="server-capabilities">
              <span className="capabilities-label">Capabilities:</span>
              <div className="capabilities-list">
                {server.capabilities.map(capability => (
                  <span key={capability} className="capability-tag">
                    {capability}
                  </span>
                ))}
              </div>
            </div>

            <div className="server-actions">
              {server.status === 'active' ? (
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDisconnectServer(server.id)}
                  disabled={isLoading}
                >
                  Disconnect
                </button>
              ) : (
                <button 
                  className="btn btn-success btn-sm"
                  onClick={() => handleConnectServer(server.id)}
                  disabled={isLoading}
                >
                  Connect
                </button>
              )}
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => handleClearCache(server.id)}
              >
                Clear Cache
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="test-section">
        <h4>🧪 Test MCP Commands</h4>
        <div className="test-form">
          <div className="form-row">
            <div className="form-group">
              <label>Server:</label>
              <select 
                value={selectedServer || ''}
                onChange={(e) => setSelectedServer(e.target.value || null)}
              >
                <option value="">Select a server...</option>
                {servers.filter(s => s.status === 'active').map(server => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Command:</label>
              <input
                type="text"
                value={testCommand}
                onChange={(e) => setTestCommand(e.target.value)}
                placeholder="e.g., analyze_code"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Parameters (JSON):</label>
            <textarea
              value={testParameters}
              onChange={(e) => setTestParameters(e.target.value)}
              placeholder='{"code": "console.log(\"hello\")", "context": {}}'
              rows={3}
            />
          </div>
          <button 
            className="btn btn-primary"
            onClick={handleTestCommand}
            disabled={isLoading || !selectedServer}
          >
            {isLoading ? '⏳ Sending...' : '🚀 Send Command'}
          </button>
        </div>

        {lastResponse && (
          <div className="response-section">
            <h5>Last Response:</h5>
            <pre className="response-content">
              {JSON.stringify(lastResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="request-history">
        <h4>📋 Recent Requests</h4>
        {requestHistory.length === 0 ? (
          <div className="empty-state">
            <p>No recent MCP requests</p>
          </div>
        ) : (
          <div className="history-list">
            {requestHistory.map(request => (
              <div key={request.id} className="history-item">
                <div className="history-header">
                  <span className="server-name">
                    {servers.find(s => s.id === request.serverId)?.name || request.serverId}
                  </span>
                  <span className="command">{request.command}</span>
                  <span className="timestamp">
                    {request.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="history-details">
                  <span className="workspace">Workspace: {request.workspaceId}</span>
                  {request.personaId && (
                    <span className="persona">Persona: {request.personaId}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
