import React, { useState, useEffect } from 'react';
import { Save, X, Tag, FileText } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

interface SaveAsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SaveAsDialog: React.FC<SaveAsDialogProps> = ({ isOpen, onClose }) => {
  const { currentProject, saveProjectAs } = useEditor();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(currentProject.name || 'Custom Filter Design');
    }
  }, [isOpen, currentProject.name]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await saveProjectAs(name.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cad-modal-backdrop" onClick={onClose}>
      <div
        className="cad-modal-content save-as-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cad-modal-header">
          <div className="header-title-box">
            <Save size={18} className="text-cyan-400" />
            <h3>Save Project As</h3>
          </div>
          <button className="cad-modal-close-btn" onClick={onClose} title="Cancel">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cad-modal-body">
            <div className="form-field-group">
              <label htmlFor="input-save-project-name">
                <Tag size={12} />
                <span>Project Name</span>
              </label>
              <input
                id="input-save-project-name"
                type="text"
                className="cad-text-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 3-Chamber Sump with Bio-Rings"
                autoFocus
                required
              />
            </div>

            <div className="save-dialog-info">
              <FileText size={13} className="text-dim" />
              <span>
                This will create a new independent project record in your local browser IndexedDB storage and preserve all current components, dimensions, and plumbing connections.
              </span>
            </div>
          </div>

          <div className="cad-modal-footer">
            <button
              type="button"
              className="cad-secondary-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              id="btn-confirm-save-as"
              type="submit"
              className="cad-primary-btn"
              disabled={saving || !name.trim()}
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save to Browser Storage'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
