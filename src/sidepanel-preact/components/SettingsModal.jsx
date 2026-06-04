import { useState, useEffect } from 'preact/hooks';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { PROVIDERS } from '../config/providers';

export function SettingsModal({ config, onClose }) {
  const [activeTab, setActiveTab] = useState('providers');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [localKeys, setLocalKeys] = useState({ ...config.providerKeys });
  const [newCustomModel, setNewCustomModel] = useState({ name: '', baseUrl: '', modelId: '', apiKey: '' });
  const [skillForm, setSkillForm] = useState({ domain: '', skill: '', isOpen: false, editIndex: -1 });
  const [formError, setFormError] = useState('');
  const trapRef = useFocusTrap(true);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSave = async () => {
    for (const [provider, key] of Object.entries(localKeys)) {
      if (key !== config.providerKeys[provider]) {
        config.setProviderKey(provider, key);
      }
    }
    await config.saveConfig();
    onClose();
  };

  const handleAddCustomModel = () => {
    if (!newCustomModel.name || !newCustomModel.baseUrl || !newCustomModel.modelId) {
      setFormError('Please fill in name, base URL, and model ID');
      return;
    }
    setFormError('');
    config.addCustomModel({ ...newCustomModel });
    setNewCustomModel({ name: '', baseUrl: '', modelId: '', apiKey: '' });
  };

  const handleAddSkill = () => {
    if (!skillForm.domain || !skillForm.skill) {
      setFormError('Please fill in both domain and tips/guidance');
      return;
    }
    setFormError('');
    config.addUserSkill({ domain: skillForm.domain.toLowerCase(), skill: skillForm.skill });
    setSkillForm({ domain: '', skill: '', isOpen: false, editIndex: -1 });
  };

  const handleEditSkill = (index) => {
    const skill = config.userSkills[index];
    setSkillForm({ domain: skill.domain, skill: skill.skill, isOpen: true, editIndex: index });
  };

  return (
    <div class="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="modal settings-modal" role="dialog" aria-modal="true" aria-label="Settings" ref={trapRef}>
        <div class="modal-header">
          <span>Settings</span>
          <button class="close-btn" onClick={onClose} aria-label="Close settings">&times;</button>
        </div>

        <div class="tabs">
          <button
            class={`tab ${activeTab === 'providers' ? 'active' : ''}`}
            onClick={() => setActiveTab('providers')}
          >
            Connections
          </button>
          <button
            class={`tab ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            Site Tips
          </button>
        </div>

        <div class="modal-body">
          {activeTab === 'providers' && (
            <ConnectionsTab
              localKeys={localKeys}
              setLocalKeys={setLocalKeys}
              selectedProvider={selectedProvider}
              setSelectedProvider={setSelectedProvider}
              config={config}
              newCustomModel={newCustomModel}
              setNewCustomModel={setNewCustomModel}
              onAddCustomModel={handleAddCustomModel}
              formError={formError}
            />
          )}

          {activeTab === 'skills' && (
            <SkillsTab
              userSkills={config.userSkills}
              builtInSkills={config.builtInSkills}
              skillForm={skillForm}
              setSkillForm={setSkillForm}
              onAdd={handleAddSkill}
              onEdit={handleEditSkill}
              onRemove={config.removeUserSkill}
              formError={formError}
            />
          )}
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" onClick={onClose}>Close</button>
          <button class="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ConnectionsTab({
  localKeys,
  setLocalKeys,
  selectedProvider,
  setSelectedProvider,
  config,
  newCustomModel,
  setNewCustomModel,
  onAddCustomModel,
  formError,
}) {
  return (
    <div class="tab-content">
      {/* BYOM section */}
      <div class="provider-section">
        <h4>Bring your own model</h4>
        <p class="provider-desc">Use your existing AI subscription. Free forever.</p>
      </div>

      {/* Import Claude credentials */}
      <div class="provider-section">
        <h4>Claude</h4>
        <p class="provider-desc">Use your Claude Pro/Max subscription via <code>claude login</code></p>
        {config.oauthStatus.isAuthenticated ? (
          <div class="connected-status">
            <span class="status-badge connected">Connected</span>
            <button class="btn btn-secondary btn-sm" onClick={config.logoutCLI}>Disconnect</button>
          </div>
        ) : (
          <button class="btn btn-primary" onClick={config.importCLI}>Import from claude login</button>
        )}
      </div>

      {/* Import Codex credentials */}
      <div class="provider-section">
        <h4>Codex</h4>
        <p class="provider-desc">Use your ChatGPT Pro/Plus subscription via <code>codex login</code></p>
        {config.codexStatus.isAuthenticated ? (
          <div class="connected-status">
            <span class="status-badge connected">Connected</span>
            <button class="btn btn-secondary btn-sm" onClick={config.logoutCodex}>Disconnect</button>
          </div>
        ) : (
          <button class="btn btn-primary" onClick={config.importCodex}>Import from codex login</button>
        )}
      </div>

      <hr />

      {/* API Keys */}
      <h4>API Keys</h4>
      <div class="provider-cards">
        {Object.entries(PROVIDERS).map(([id, provider]) => (
          <div
            key={id}
            class={`provider-card ${selectedProvider === id ? 'selected' : ''} ${localKeys[id] ? 'configured' : ''}`}
            onClick={() => setSelectedProvider(selectedProvider === id ? null : id)}
          >
            <div class="provider-name">{provider.name}</div>
            {localKeys[id] && <span class="check-badge">✓</span>}
          </div>
        ))}
      </div>

      {selectedProvider && (
        <div class="api-key-input">
          <label>{PROVIDERS[selectedProvider].name} {selectedProvider === 'vertex' ? 'Service Account JSON' : 'API Key'}</label>
          {selectedProvider === 'vertex' ? (
            <textarea
              value={localKeys[selectedProvider] || ''}
              onInput={(e) => setLocalKeys({ ...localKeys, [selectedProvider]: e.target.value })}
              placeholder="Paste the entire service account JSON file contents here..."
              rows={4}
              style={{ fontFamily: 'monospace', fontSize: '0.8em' }}
            />
          ) : (
            <input
              type="password"
              value={localKeys[selectedProvider] || ''}
              onInput={(e) => setLocalKeys({ ...localKeys, [selectedProvider]: e.target.value })}
              placeholder="Enter API key..."
            />
          )}
        </div>
      )}

      {/* Custom endpoints — collapsed */}
      <details class="advanced-section" style={{ marginTop: '16px' }}>
        <summary>Custom endpoint (Ollama, LM Studio, etc.)</summary>
        <div class="custom-model-form" style={{ marginTop: '12px' }}>
          <input type="text" placeholder="Display Name" value={newCustomModel.name}
            onInput={(e) => setNewCustomModel({ ...newCustomModel, name: e.target.value })} />
          <input type="text" placeholder="Base URL (e.g. http://localhost:11434/v1)" value={newCustomModel.baseUrl}
            onInput={(e) => setNewCustomModel({ ...newCustomModel, baseUrl: e.target.value })} />
          <input type="text" placeholder="Model ID" value={newCustomModel.modelId}
            onInput={(e) => setNewCustomModel({ ...newCustomModel, modelId: e.target.value })} />
          <input type="password" placeholder="API Key (optional)" value={newCustomModel.apiKey}
            onInput={(e) => setNewCustomModel({ ...newCustomModel, apiKey: e.target.value })} />
          {formError && <p class="provider-desc" style={{ color: 'var(--color-error)', marginBottom: '8px' }}>{formError}</p>}
          <button class="btn btn-primary" onClick={onAddCustomModel}
            disabled={!newCustomModel.name || !newCustomModel.baseUrl || !newCustomModel.modelId}>
            Add
          </button>
        </div>
        {config.customModels.length > 0 && (
          <div class="custom-models-list">
            {config.customModels.map((model, i) => (
              <div key={i} class="custom-model-item">
                <div class="model-info">
                  <span class="model-name">{model.name}</span>
                  <span class="model-url">{model.baseUrl}</span>
                </div>
                <button class="btn btn-danger btn-sm" onClick={() => config.removeCustomModel(i)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </details>

    </div>
  );
}

function SkillsTab({ userSkills, builtInSkills, skillForm, setSkillForm, onAdd, onEdit, onRemove, formError }) {
  return (
    <div class="tab-content">
      <p class="tab-desc">Teach Hanzi how to navigate specific websites better</p>

      <button
        class="btn btn-secondary"
        onClick={() => setSkillForm({ ...skillForm, isOpen: true, editIndex: -1, domain: '', skill: '' })}
      >
        + Add Skill
      </button>

      {skillForm.isOpen && (
        <div class="skill-form">
          <input
            type="text"
            placeholder="Domain (e.g., github.com)"
            value={skillForm.domain}
            onInput={(e) => setSkillForm({ ...skillForm, domain: e.target.value })}
          />
          <textarea
            placeholder="Tips and guidance for this domain..."
            value={skillForm.skill}
            onInput={(e) => setSkillForm({ ...skillForm, skill: e.target.value })}
            rows={4}
          />
          {formError && <p class="provider-desc" style={{ color: 'var(--color-error)', marginBottom: '8px' }}>{formError}</p>}
          <div class="skill-form-actions">
            <button class="btn btn-secondary" onClick={() => setSkillForm({ ...skillForm, isOpen: false })}>
              Cancel
            </button>
            <button class="btn btn-primary" onClick={onAdd}>
              {skillForm.editIndex >= 0 ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div class="skills-list">
        {userSkills.length > 0 && (
          <>
            <h4>Your Skills</h4>
            {userSkills.map((skill, i) => (
              <div key={i} class="skill-item">
                <div class="skill-domain">{skill.domain}</div>
                <div class="skill-preview">{skill.skill.substring(0, 100)}...</div>
                <div class="skill-actions">
                  <button class="btn btn-sm" onClick={() => onEdit(i)}>Edit</button>
                  <button class="btn btn-sm btn-danger" onClick={() => onRemove(i)}>Delete</button>
                </div>
              </div>
            ))}
          </>
        )}

        {builtInSkills.length > 0 && (
          <>
            <h4>Built-in Skills</h4>
            {builtInSkills.map((skill, i) => (
              <div key={i} class="skill-item builtin">
                <div class="skill-domain">{skill.domain}</div>
                <div class="skill-preview">{skill.skill.substring(0, 100)}...</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

