import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, CalendarCheck, X, Check } from 'lucide-react';
import api from '../../api/axios';

const EMPTY = { event_name: '', not_use: false };

export default function EventMaster() {
  const [rows, setRows]       = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(null); // null | 'new' | row
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/events', { params: { search } });
      setRows(r.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search]);

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
  const flag  = v => v ? <Check size={15} className="flag-yes" /> : <span className="flag-no">–</span>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Event Master</h1>
          <p className="page-subtitle">{rows.length} events</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search event name..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openNew}><Plus size={16}/> New Event</button>
          </div>
          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>EVENT NAME</th>
                  <th style={{textAlign:'center'}}>NOT USE</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={3} className="table-empty"><CalendarCheck size={32}/><p>No events found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.event_name}</strong></td>
                      <td style={{textAlign:'center'}}>{flag(r.not_use)}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-edit" onClick={() => openEdit(r)}><Pencil size={14}/></button>
                          <button className="btn-danger-soft" onClick={() => del(r.id)}><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
