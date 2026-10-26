import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import DataGrid from '../../components/grid/DataGrid';

const EMPTY = { event_name: '', not_use: false };

const COLUMNS = [
  { key: 'event_name', header: 'Event Name', width: 300, strong: true },
  { key: 'not_use', header: 'Not Use', width: 110, align: 'center', value: r => (r.not_use ? 'Yes' : 'No'),
    cell: r => <span className={`badge ${r.not_use ? 'badge-green' : 'badge-gray'}`}>{r.not_use ? 'Yes' : 'No'}</span> },
];

export default function EventMaster() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'new' | row
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/events');
      setRows(r.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setForm(EMPTY); setErr(''); setModal('new'); };
  const openEdit = (row) => { setForm({ event_name: row.event_name || '', not_use: !!row.not_use }); setErr(''); setModal(row); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.event_name.trim()) return setErr('Event name required');
    setSaving(true); setErr('');
    try {
      if (modal === 'new') await api.post('/events', form);
      else await api.put(`/events/${modal.id}`, form);
      setModal(null); load();
    } catch(ex){ setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete event?')) return;
    await api.delete(`/events/${id}`); load();
  };

  const set   = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Event Master</h1>
          <p className="page-subtitle">{rows.length} events</p>
        </div>
      </div>

      <DataGrid
        id="event-master"
        columns={COLUMNS}
        data={rows}
        loading={loading}
        defaultSort={[{ id: 'event_name', desc: false }]}
        searchPlaceholder="Search event name…"
        emptyText="No events found"
        onRowClick={openEdit}
        rowActions={r => <>
          <button type="button" className="dg-act" title="Edit" onClick={() => openEdit(r)}><Pencil size={15} /></button>
          <button type="button" className="dg-act del" title="Delete" onClick={() => del(r.id)}><Trash2 size={15} /></button>
        </>}
        toolbar={<button type="button" className="btn btn-primary" onClick={openNew}><Plus size={16} /> New Event</button>}
      />

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal==='new' ? 'New Event' : 'Edit Event'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={18}/></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <div className="form-group">
                <label>Event Name *</label>
                <input value={form.event_name} onChange={set('event_name')} required autoFocus />
              </div>
              <label className="checkbox-row" style={{ marginTop: 14 }}>
                <input type="checkbox" checked={form.not_use} onChange={e => setForm(f => ({ ...f, not_use: e.target.checked }))} />
                <span>Not Use</span>
              </label>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
