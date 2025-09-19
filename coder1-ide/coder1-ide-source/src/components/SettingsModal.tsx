import React, { useState } from 'react';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'account' | 'editor';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleLogout = () => {
    // TODO: Implement actual logout logic
    console.log('Logout clicked');
    // For now, just show an alert
    alert('Logout functionality will be implemented here');
  };

  const handleLogin = () => {
    // TODO: Implement actual login logic
    console.log('Login clicked');
    // For now, just show an alert
    alert('Login functionality will be implemented here');
  };

  return (
    <div className="settings-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal">
        {/* Header */}
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="settings-content">
          {/* Sidebar Navigation */}
          <div className="settings-sidebar">
            <button
              className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              👤 Account
            </button>
            <button
              className={`settings-tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              💻 Editor
            </button>
          </div>

          {/* Main Content Area */}
          <div className="settings-main">
            {activeTab === 'account' && (
              <div className="settings-panel">
                <h3>Account & Billing</h3>
                
                <div className="settings-section">
                  <h4>Profile</h4>
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      placeholder="Your name"
                      defaultValue="John Doe"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      placeholder="your.email@example.com"
                      defaultValue="john.doe@example.com"
                    />
                  </div>
                </div>

                <div className="settings-section">
                  <h4>Subscription</h4>
                  <div className="subscription-info">
                    <div className="plan-badge">Pro Plan</div>
                    <p>Your subscription is active until March 15, 2025</p>
                    <button className="btn-secondary">Manage Subscription</button>
                  </div>
                </div>

                <div className="settings-section">
                  <h4>Usage</h4>
                  <div className="usage-stats">
                    <div className="usage-item">
                      <span>API Calls This Month</span>
                      <span>1,247 / 10,000</span>
                    </div>
                    <div className="usage-item">
                      <span>Storage Used</span>
                      <span>2.3 GB / 10 GB</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="settings-panel">
                <h3>Development Environment</h3>
                
                <div className="settings-section">
                  <h4>Editor Preferences</h4>
                  <div className="form-group">
                    <label htmlFor="theme">Theme</label>
                    <select id="theme" defaultValue="tokyo-night">
                      <option value="tokyo-night">Tokyo Night</option>
                      <option value="tokyo-night-light">Tokyo Night Light</option>
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="font-size">Font Size</label>
                    <select id="font-size" defaultValue="14">
                      <option value="12">12px</option>
                      <option value="13">13px</option>
                      <option value="14">14px</option>
                      <option value="15">15px</option>
                      <option value="16">16px</option>
                      <option value="18">18px</option>
                    </select>
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input type="checkbox" defaultChecked />
                      Show line numbers
                    </label>
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input type="checkbox" defaultChecked />
                      Show minimap
                    </label>
                  </div>
                </div>

                <div className="settings-section">
                  <h4>Terminal Settings</h4>
                  <div className="form-group">
                    <label htmlFor="shell">Default Shell</label>
                    <select id="shell" defaultValue="bash">
                      <option value="bash">Bash</option>
                      <option value="zsh">Zsh</option>
                      <option value="fish">Fish</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="terminal-font">Terminal Font Size</label>
                    <select id="terminal-font" defaultValue="13">
                      <option value="11">11px</option>
                      <option value="12">12px</option>
                      <option value="13">13px</option>
                      <option value="14">14px</option>
                      <option value="15">15px</option>
                    </select>
                  </div>
                </div>

                <div className="settings-section">
                  <h4>File Management</h4>
                  <div className="form-group checkbox-group">
                    <label>
                      <input type="checkbox" defaultChecked />
                      Auto-save files
                    </label>
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input type="checkbox" />
                      Show hidden files
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <div className="footer-left">
            <button className="btn-tertiary" onClick={handleLogin}>
              🔑 Login
            </button>
            <button className="btn-logout" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
          <div className="footer-right">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;