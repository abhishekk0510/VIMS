import React, { useState, useEffect } from 'react';
import { workflowService } from '../services/invoiceService';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline';

const ROLES = ['OPERATIONS', 'DEPT_HEAD', 'FINANCE', 'CFO', 'ADMIN'];

function LevelRow({ level, index, onChange, onRemove, isOnly }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold mt-1">
        {index + 1}
      </div>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label text-xs">Level Name</label>
          <input
            type="text"
            value={level.levelName}
            onChange={e => onChange(index, 'levelName', e.target.value)}
            placeholder="e.g. Operations Review"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="label text-xs">Approver Role</label>
          <select
            value={level.approverRole}
            onChange={e => onChange(index, 'approverRole', e.target.value)}
            className="input text-sm"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={isOnly}
            className="mb-0.5 p-2 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Remove level"
          >
            <TrashIcon className="h-4 w-4"/>
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkflowForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [levels, setLevels] = useState(
    initial?.levels?.length > 0
      ? initial.levels.map(l => ({ levelName: l.levelName, approverRole: l.approverRole }))
      : [{ levelName: '', approverRole: 'OPERATIONS' }]
  );
  const [saving, setSaving] = useState(false);

  const addLevel = () => setLevels(prev => [...prev, { levelName: '', approverRole: 'FINANCE' }]);

  const updateLevel = (idx, field, val) =>
    setLevels(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));

  const removeLevel = idx =>
    setLevels(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Workflow name is required'); return; }
    if (levels.some(l => !l.levelName.trim())) { toast.error('All level names are required'); return; }

    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), levels });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Workflow Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Standard Approval Flow"/>
        </div>
        <div>
          <label className="label">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} className="input" placeholder="Brief description"/>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Approval Levels (in order)</label>
          <button type="button" onClick={addLevel} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 font-medium">
            <PlusIcon className="h-4 w-4"/> Add Level
          </button>
        </div>
        <div className="space-y-2">
          {levels.map((l, i) => (
            <LevelRow key={i} level={l} index={i}
              onChange={updateLevel}
              onRemove={removeLevel}
              isOnly={levels.length === 1}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : initial ? 'Save Changes' : 'Create Workflow'}
        </button>
      </div>
    </form>
  );
}

export default function WorkflowConfigPage() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = () => {
    setLoading(true);
    workflowService.getAll()
      .then(r => setWorkflows(r.data.data))
      .catch(() => toast.error('Failed to load workflows'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async data => {
    try {
      await workflowService.create(data);
      toast.success('Workflow created');
      setShowCreate(false);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Error creating workflow'); }
  };

  const handleUpdate = async (id, data) => {
    try {
      await workflowService.update(id, data);
      toast.success('Workflow updated');
      setEditingId(null);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Error updating workflow'); }
  };

  const handleActivate = async id => {
    try {
      await workflowService.activate(id);
      toast.success('Workflow activated');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Error activating workflow'); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this workflow?')) return;
    try {
      await workflowService.remove(id);
      toast.success('Workflow deleted');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Cannot delete active workflow'); }
  };

  if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin h-10 w-10 rounded-full border-b-2 border-primary-600"/></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
          <p className="text-sm text-gray-500 mt-1">Configure multi-level approval flows for invoice processing.</p>
        </div>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <PlusIcon className="h-4 w-4"/> New Workflow
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card border-primary-200">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Create New Workflow</h2>
          <WorkflowForm onSave={handleCreate} onCancel={() => setShowCreate(false)}/>
        </div>
      )}

      {/* Workflow list */}
      {workflows.length === 0 && !showCreate ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No workflows configured yet.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">Create First Workflow</button>
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map(wf => (
            <div key={wf.id} className={`card ${wf.isActive ? 'border-green-300 bg-green-50/30' : ''}`}>
              {editingId === wf.id ? (
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Edit Workflow</h2>
                  <WorkflowForm
                    initial={wf}
                    onSave={data => handleUpdate(wf.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{wf.name}</h3>
                        {wf.isActive && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                            <CheckCircleIcon className="h-3 w-3"/> Active
                          </span>
                        )}
                      </div>
                      {wf.description && <p className="text-sm text-gray-500 mt-1">{wf.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!wf.isActive && (
                        <button onClick={() => handleActivate(wf.id)}
                          className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition">
                          Activate
                        </button>
                      )}
                      <button onClick={() => setEditingId(wf.id)} className="p-1.5 text-gray-400 hover:text-gray-600">
                        <PencilIcon className="h-4 w-4"/>
                      </button>
                      {!wf.isActive && (
                        <button onClick={() => handleDelete(wf.id)} className="p-1.5 text-red-400 hover:text-red-600">
                          <TrashIcon className="h-4 w-4"/>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Levels */}
                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      {wf.levels.map((l, i) => (
                        <React.Fragment key={l.id}>
                          <div className="flex-1 text-center">
                            <div className="text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                              <div className="font-semibold text-gray-900">{l.levelName}</div>
                              <div className="text-gray-500 mt-0.5">{l.approverRole}</div>
                            </div>
                          </div>
                          {i < wf.levels.length - 1 && (
                            <div className="text-gray-300 font-bold">→</div>
                          )}
                        </React.Fragment>
                      ))}
                      <div className="text-gray-300 font-bold">→</div>
                      <div className="flex-shrink-0">
                        <div className="text-xs font-medium text-white bg-green-600 rounded-lg px-3 py-2 text-center shadow-sm">
                          <div className="font-semibold">APPROVED</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
