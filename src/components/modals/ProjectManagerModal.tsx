import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Upload,
  Download,
  Trash2,
  X,
  Clock,
  Layers,
  GitBranch,
  AlertCircle,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import type { ProjectStorageItem } from '../../types/project';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentProject,
    listSavedProjects,
    openProject,
    deleteSavedProject,
    importProjectFile,
  } = useEditor();

  const [projects, setProjects] = useState<ProjectStorageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshList = async () => {
    setLoading(true);
    try {
      const items = await listSavedProjects();
      setProjects(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      setImportStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpen = async (id: string) => {
    const success = await openProject(id);
    if (success) {
      onClose();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from your local browser storage?`)) {
      await deleteSavedProject(id);
      await refreshList();
    }
  };

  const handleExportItem = (item: ProjectStorageItem) => {
    const blob = new Blob([JSON.stringify(item.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = item.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.download = `${safeName}.aquasim`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importProjectFile(file);
    if (result.success) {
      setImportStatus({
        type: 'success',
        message: `Project imported successfully! ${result.warnings?.length ? `(${result.warnings.length} warning(s))` : ''}`,
      });
      await refreshList();
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setImportStatus({
        type: 'error',
        message: result.errors?.join(' ') || 'Failed to import project file.',
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="cad-modal-backdrop" onClick={onClose}>
      <div
        className="cad-modal-content project-manager-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="cad-modal-header">
          <div className="header-title-box">
            <FolderOpen size={18} className="text-cyan-400" />
            <h3>Project Library & Storage</h3>
            <span className="cad-storage-badge">IndexedDB Local</span>
          </div>
          <button className="cad-modal-close-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Feedback Banner */}
        {importStatus && (
          <div className={`cad-feedback-banner ${importStatus.type}`}>
            {importStatus.type === 'success' ? (
              <CheckCircle2 size={14} className="text-emerald-400" />
            ) : (
              <AlertCircle size={14} className="text-amber-400" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="cad-modal-body">
          <div className="project-list-header">
            <span className="list-title">Saved Designs ({projects.length})</span>
            <div className="header-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".aquasim,.json"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
              <button
                id="btn-import-project-file"
                className="cad-secondary-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Import .aquasim or .json project file from disk"
              >
                <Upload size={13} />
                <span>Import File</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="cad-loading-box">
              <span className="cad-spinner" />
              <span>Accessing local storage...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="cad-empty-projects-box">
              <FileCode size={36} className="text-dim" />
              <h4>No Saved Projects in Browser</h4>
              <p>
                Save your current design to browser storage using <strong>Project → Save</strong> or import an existing <code>.aquasim</code> project file.
              </p>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((proj) => {
                const isCurrent = currentProject.id === proj.id;
                const formattedDate = new Date(proj.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={proj.id}
                    className={`project-card ${isCurrent ? 'active-project' : ''}`}
                  >
                    <div className="card-top-row">
                      <div className="project-title-area">
                        <strong className="proj-name" title={proj.name}>
                          {proj.name}
                        </strong>
                        {isCurrent && <span className="active-chip">CURRENT ACTIVE</span>}
                      </div>
                      <div className="card-quick-actions">
                        <button
                          className="icon-action-btn"
                          onClick={() => handleExportItem(proj)}
                          title="Export this project to .aquasim file"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          className="icon-action-btn hover-danger"
                          onClick={() => handleDelete(proj.id, proj.name)}
                          title="Delete project from local storage"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="project-meta-row">
                      <div className="meta-item">
                        <Clock size={11} />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="meta-item">
                        <Layers size={11} />
                        <span>{proj.objectCount} objects</span>
                      </div>
                      <div className="meta-item">
                        <GitBranch size={11} />
                        <span>{proj.connectionCount} links</span>
                      </div>
                    </div>

                    <div className="card-bottom-row">
                      <button
                        id={`btn-open-project-${proj.id}`}
                        className="cad-primary-btn open-btn"
                        onClick={() => handleOpen(proj.id)}
                      >
                        <FolderOpen size={13} />
                        <span>Open Design</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="cad-modal-footer">
          <span className="footer-hint">
            * Projects are saved locally in this browser using IndexedDB. Export to <code>.aquasim</code> for external backup.
          </span>
          <button className="cad-secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
