import React, { useState, useMemo } from 'react';
import {
  Library,
  ListTree,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Search,
  Layers,
  Box,
  Droplets,
  Sliders,
  Filter as FilterIcon,
  Check,
  Lock,
  Unlock,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { COMPONENT_TEMPLATES } from '../../data/componentLibrary';
import type { ComponentTemplate } from '../../types/editor';

export const LeftSidebar: React.FC = () => {
  const {
    objects,
    selectedId,
    selectObject,
    toggleVisibility,
    toggleLock,
    deleteObject,
    addComponentFromLibrary,
    layoutSettings,
    setActiveLeftTab,
  } = useEditor();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Filter templates by search and category
  const filteredTemplates = useMemo(() => {
    return COMPONENT_TEMPLATES.filter((tpl) => {
      const matchesSearch =
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.specsSummary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || tpl.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const handleAddComponent = (template: ComponentTemplate) => {
    addComponentFromLibrary(template);
    setRecentlyAddedId(template.templateId);
    setTimeout(() => setRecentlyAddedId(null), 1200);
  };

  if (!layoutSettings.leftSidebarOpen) {
    return null;
  }

  return (
    <aside id="cad-left-sidebar" className="cad-sidebar cad-sidebar-left">
      {/* Tab Switcher */}
      <div className="sidebar-tab-header">
        <button
          id="tab-library"
          className={`sidebar-tab-btn ${layoutSettings.activeLeftTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveLeftTab('library')}
        >
          <Library size={14} />
          <span>Component Library</span>
        </button>

        <button
          id="tab-outliner"
          className={`sidebar-tab-btn ${layoutSettings.activeLeftTab === 'outliner' ? 'active' : ''}`}
          onClick={() => setActiveLeftTab('outliner')}
        >
          <ListTree size={14} />
          <span>Scene Hierarchy ({objects.length})</span>
        </button>
      </div>

      {/* ================================================================ */}
      {/* TAB 1: COMPONENT LIBRARY                                         */}
      {/* ================================================================ */}
      {layoutSettings.activeLeftTab === 'library' && (
        <div className="sidebar-tab-pane">
          {/* Search Bar */}
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              id="input-search-library"
              type="text"
              placeholder="Search components, media, filters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="category-chips">
            {[
              { id: 'all', label: 'All' },
              { id: 'filter', label: 'Filters' },
              { id: 'media', label: 'Media' },
              { id: 'plumbing', label: 'Flow' },
              { id: 'aeration', label: 'Air' },
              { id: 'hardscape', label: 'Scape' },
            ].map((cat) => (
              <button
                key={cat.id}
                id={`cat-chip-${cat.id}`}
                className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Component Card List */}
          <div className="component-card-list">
            {filteredTemplates.map((tpl) => {
              const isAdded = recentlyAddedId === tpl.templateId;
              return (
                <div
                  key={tpl.templateId}
                  id={`card-${tpl.templateId}`}
                  className="component-card"
                >
                  <div className="card-top">
                    <div className="card-glyph-wrapper">
                      {tpl.category === 'filter' && <FilterIcon size={16} />}
                      {tpl.category === 'media' && <Layers size={16} />}
                      {tpl.category === 'plumbing' && <Sliders size={16} />}
                      {tpl.category === 'aeration' && <Droplets size={16} />}
                      {tpl.category === 'hardscape' && <Box size={16} />}
                    </div>
                    <div className="card-title-group">
                      <h4 className="card-name">{tpl.name}</h4>
                      <span className="card-specs">{tpl.specsSummary}</span>
                    </div>
                  </div>

                  <p className="card-description">{tpl.description}</p>

                  <div className="card-footer">
                    <span className="card-category-badge">{tpl.category}</span>
                    <button
                      id={`btn-add-${tpl.templateId}`}
                      className={`add-component-btn ${isAdded ? 'added' : ''}`}
                      onClick={() => handleAddComponent(tpl)}
                      title={`Add ${tpl.name} to Scene`}
                    >
                      {isAdded ? (
                        <>
                          <Check size={13} />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Add to Tank</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredTemplates.length === 0 && (
              <div className="empty-search-state">
                <Search size={24} className="text-dim" />
                <p>No components match your search.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 2: SCENE HIERARCHY / OUTLINER                                */}
      {/* ================================================================ */}
      {layoutSettings.activeLeftTab === 'outliner' && (
        <div className="sidebar-tab-pane">
          <div className="outliner-instructions">
            <span>Click to select & inspect object in 3D.</span>
          </div>

          <div className="outliner-tree">
            {objects.map((obj) => {
              const isSelected = selectedId === obj.id;
              return (
                <div
                  key={obj.id}
                  id={`outliner-node-${obj.id}`}
                  className={`outliner-item ${isSelected ? 'selected' : ''} ${!obj.visible ? 'hidden-item' : ''}`}
                  onClick={() => selectObject(obj.id)}
                >
                  <div className="item-icon-tag">
                    {obj.category === 'structure' && <Box size={14} />}
                    {obj.category === 'water' && <Droplets size={14} className="text-cyan-400" />}
                    {obj.category === 'filter' && <FilterIcon size={14} className="text-sky-400" />}
                    {obj.category === 'media' && <Layers size={14} className="text-amber-400" />}
                    {obj.category === 'plumbing' && <Sliders size={14} className="text-indigo-400" />}
                    {obj.category === 'aeration' && <Droplets size={14} className="text-emerald-400" />}
                    {obj.category === 'hardscape' && <Box size={14} className="text-slate-400" />}
                  </div>

                  <span className="item-label" title={obj.name}>
                    {obj.name}
                  </span>

                  <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                    {/* Lock Toggle */}
                    <button
                      id={`btn-lock-${obj.id}`}
                      className={`item-action-btn ${obj.locked ? 'text-amber-400' : ''}`}
                      onClick={() => toggleLock(obj.id)}
                      title={obj.locked ? 'Unlock Object (Allow selection & editing)' : 'Lock Object (Prevent selection & editing)'}
                    >
                      {obj.locked ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      id={`btn-vis-${obj.id}`}
                      className="item-action-btn"
                      onClick={() => toggleVisibility(obj.id)}
                      title={obj.visible ? 'Hide Object' : 'Show Object'}
                    >
                      {obj.visible ? <Eye size={13} /> : <EyeOff size={13} className="text-rose-400" />}
                    </button>

                    {/* Delete button (except locked tank) */}
                    {!obj.locked && (
                      <button
                        id={`btn-del-${obj.id}`}
                        className="item-action-btn hover-danger"
                        onClick={() => deleteObject(obj.id)}
                        title="Delete from Scene"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
