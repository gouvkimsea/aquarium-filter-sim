import React from 'react';
import { AlertTriangle, Save, Trash2, X } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

export const UnsavedChangesDialog: React.FC = () => {
  const {
    currentProject,
    pendingUnsavedAction,
    executePendingUnsavedAction,
    clearPendingUnsavedAction,
    saveProject,
  } = useEditor();

  if (!pendingUnsavedAction) return null;

  const handleSaveAndContinue = async () => {
    await saveProject();
    executePendingUnsavedAction();
  };

  const handleDiscardAndContinue = () => {
    executePendingUnsavedAction();
  };

  return (
    <div className="cad-modal-backdrop" onClick={clearPendingUnsavedAction}>
      <div
        className="cad-modal-content unsaved-warning-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cad-modal-header danger-header">
          <div className="header-title-box">
            <AlertTriangle size={18} className="text-amber-400" />
            <h3>Unsaved Changes</h3>
          </div>
          <button
            className="cad-modal-close-btn"
            onClick={clearPendingUnsavedAction}
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="cad-modal-body">
          <p className="warning-lead-text">
            You have unsaved modifications in{' '}
            <strong>"{currentProject.name}"</strong>.
          </p>
          <p className="warning-sub-text">
            If you continue without saving, your recent container adjustments,
            added components, and plumbing connections will be discarded.
          </p>
        </div>

        <div className="cad-modal-footer">
          <button
            id="btn-unsaved-cancel"
            type="button"
            className="cad-secondary-btn"
            onClick={clearPendingUnsavedAction}
          >
            Cancel
          </button>
          <button
            id="btn-unsaved-discard"
            type="button"
            className="cad-danger-btn"
            onClick={handleDiscardAndContinue}
          >
            <Trash2 size={13} />
            <span>Discard Changes</span>
          </button>
          <button
            id="btn-unsaved-save-continue"
            type="button"
            className="cad-primary-btn"
            onClick={handleSaveAndContinue}
          >
            <Save size={13} />
            <span>Save & Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
