import React from 'react';
import {
  Keyboard,
  X,
  Navigation,
  Move,
  Save,
  Play,
  Eye,
  Sliders,
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  category: string;
  icon: React.ReactNode;
  items: ShortcutItem[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: '3D Viewport Navigation',
    icon: <Navigation size={15} className="text-cyan-400" />,
    items: [
      { keys: ['Left Click', 'Drag'], description: 'Orbit 3D camera around target' },
      { keys: ['Right Click', 'Drag'], description: 'Pan camera across plane' },
      { keys: ['Shift', 'Left Drag'], description: 'Alternative camera pan' },
      { keys: ['Scroll Wheel'], description: 'Zoom camera in / out' },
      { keys: ['F'], description: 'Frame / Focus camera on selected object' },
      { keys: ['Double Click'], description: 'Select component and inspect properties' },
    ],
  },
  {
    category: 'CAD Transformation Tools',
    icon: <Move size={15} className="text-sky-400" />,
    items: [
      { keys: ['W'], description: 'Activate Move / Translation mode' },
      { keys: ['E'], description: 'Activate Rotate mode' },
      { keys: ['R'], description: 'Activate Scale / Resize mode' },
      { keys: ['X'], description: 'Toggle Grid & Angle Snapping ON / OFF' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate currently selected object' },
      { keys: ['Delete'], description: 'Delete selected object' },
      { keys: ['Esc'], description: 'Deselect active object or cancel connection' },
    ],
  },
  {
    category: 'Project & Document Actions',
    icon: <Save size={15} className="text-emerald-400" />,
    items: [
      { keys: ['Ctrl', 'S'], description: 'Save project directly to browser storage' },
      { keys: ['Ctrl', 'Z'], description: 'Undo last action (creation, transform, delete)' },
      { keys: ['Ctrl', 'Y'], description: 'Redo previously undone action' },
      { keys: ['Ctrl', '['], description: 'Toggle Component Library sidebar' },
      { keys: ['Ctrl', ']'], description: 'Toggle Properties Inspector sidebar' },
    ],
  },
  {
    category: 'Simulation Controls',
    icon: <Play size={15} className="text-amber-400" />,
    items: [
      { keys: ['Space'], description: 'Start / Pause fluid simulation' },
      { keys: ['1'], description: 'Set simulation speed to 0.5x' },
      { keys: ['2'], description: 'Set simulation speed to 1.0x (Normal)' },
      { keys: ['3'], description: 'Set simulation speed to 2.0x' },
      { keys: ['4'], description: 'Set simulation speed to 5.0x' },
    ],
  },
  {
    category: 'View & Shading Modes',
    icon: <Eye size={15} className="text-purple-400" />,
    items: [
      { keys: ['Alt', '1'], description: 'Clear Acrylic (Transparent container mode)' },
      { keys: ['Alt', '2'], description: 'Solid Technical Polymer (Opaque mode)' },
      { keys: ['Alt', '3'], description: 'Cross-Section Inspection (Cutaway mode)' },
      { keys: ['Alt', '4'], description: 'Exploded Assembly View (Disassemble baffles & media)' },
      { keys: ['G'], description: 'Toggle 3D coordinate floor grid' },
      { keys: ['M'], description: 'Toggle 3D dimension and chamber measurement tags' },
    ],
  },
  {
    category: 'Plumbing & Hydraulic Connections',
    icon: <Sliders size={15} className="text-teal-400" />,
    items: [
      { keys: ['Click Port'], description: 'Start magnetic plumbing connection pipe' },
      { keys: ['Click Target Port'], description: 'Snap and complete hydraulic conduit link' },
      { keys: ['Esc'], description: 'Cancel active connection gesture' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="cad-modal-backdrop" onClick={onClose}>
      <div
        className="cad-modal-content shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="cad-modal-header">
          <div className="header-title-box">
            <Keyboard size={18} className="text-cyan-400" />
            <h3>Keyboard Shortcuts & Navigation</h3>
            <span className="cad-storage-badge">Quick Reference</span>
          </div>
          <button className="cad-modal-close-btn" onClick={onClose} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="cad-modal-body shortcuts-grid-container">
          <div className="shortcuts-grid">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.category} className="shortcut-group-card">
                <div className="shortcut-group-header">
                  {group.icon}
                  <h4>{group.category}</h4>
                </div>

                <div className="shortcut-items-list">
                  {group.items.map((item, idx) => (
                    <div key={idx} className="shortcut-row">
                      <div className="shortcut-keys">
                        {item.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="cad-kbd">{k}</kbd>
                            {kIdx < item.keys.length - 1 && <span className="key-plus">+</span>}
                          </React.Fragment>
                        ))}
                      </div>
                      <span className="shortcut-desc">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="cad-modal-footer">
          <span className="footer-hint">
            * Press <kbd className="cad-kbd">?</kbd> anywhere in the application to toggle this shortcut reference.
          </span>
          <button className="cad-secondary-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
