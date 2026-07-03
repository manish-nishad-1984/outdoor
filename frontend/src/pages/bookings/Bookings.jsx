import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, CalendarCheck, X } from 'lucide-react';
import api from '../../api/axios';

const EVENT_TYPES = ['Wedding', 'Engagement', 'Birthday', 'Corporate', 'Pre-Wedding', 'Baby Shower', 'Anniversary', 'Other'];
const STATUS_LIST = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
const PAYMENT_MODES = ['Cash', 'UPI', 'Cheque', 'Card', 'Online'];

const EMPTY = {
  customer_name: '', customer_contact: '', event_type: '',
  event_date: '', venue: '', photo_by: '',
  gross_total: '', advance: '', payment_mode: 'Cash',
  status: 'Pending', remark: ''
};

const STATUS_BADGE = {
  Pending:     'badge-yellow',
  Confirmed:   'badge-blue',
  'In Progress': 'badge-orange',
  Completed:   'badge-green',
  Cancelled:   'badge-red',
};

export default function Bookings() {
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [stats, setStats]   = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]   = useState(null); // null | 'new' | row-object
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/bookings', { params: { search, page, limit: 25, status: statusFilter } });
      setRows(r.data.data || []);
      setTotal(r.data.total || 0);
      setStats(r.data.stats || {});
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setForm({ ...EMPTY, event_date: new Date().toISOString().slice(0,10) });
    setErr(''); setModal('new');
  };

  const openEdit = (row) => {
    setForm({
      customer_name: row.customer_name || '',
      customer_contact: row.customer_contact || '',
      event_type: row.event_type || '',
      event_date: row.event_date ? row.event_date.slice(0,10) : '',
      venue: row.venue || '',
      photo_by: row.photo_by || '',
      gross_total: row.gross_total || '',
      advance: row.advance || '',
      payment_mode: row.payment_mode || 'Cash',
      status: row.status || 'Pending',
      remark: row.remark || ''
    });
    setErr(''); setModal(row);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.customer_name) return setErr('Customer name is required');
    setSaving(true); setErr('');
    try {
      if (modal === 'new') await api.post('/bookings', form);
      else await api.put(`/bookings/${modal.id}`, form);
      setModal(null); load();
    } catch(ex) { setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this booking?')) return;
    try { await api.delete(`/bookings/${id}`); load(); }
    catch(e) { alert(e.response?.data?.error || 'Delete failed'); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const cur = n => n != null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '₹0';
  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

  const pending = (parseFloat(form.gross_total)||0) - (parseFloat(form.advance)||0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">{total} total bookings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card-accent">
          <div className="stat-label">TOTAL BOOKINGS</div>
          <div className="stat-value">{stats.total || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CONFIRMED</div>
          <div className="stat-value" style={{color:'#2563eb'}}>{stats.confirmed || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">PENDING</div>
          <div className="stat-value" style={{color:'#d97706'}}>{stats.pending || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">AMOUNT DUE</div>
          <div className="stat-value" style={{color:'#dc2626'}}>{cur(stats.due)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon" />
              <input placeholder="Search by customer, booking no, contact..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openNew}><Plus size={16} /> New Booking</button>
            <select className="filter-select" value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>BOOKING NO</th>
                  <th>CUSTOMER</th>
                  <th>CONTACT</th>
                  <th>EVENT TYPE</th>
                  <th>EVENT DATE</th>
                  <th>PHOTOGRAPHER</th>
                  <th>AMOUNT</th>
                  <th>ADVANCE</th>
                  <th>PENDING</th>
                  <th>STATUS</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={11} className="table-empty">
                      <CalendarCheck size={36} />
                      <p>No bookings found. Click "New Booking" to add one.</p>
                    </td></tr>
                  )}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><span className="badge badge-blue">{r.booking_no}</span></td>
                      <td><strong>{r.customer_name}</strong></td>
                      <td>{r.customer_contact || '—'}</td>
                      <td>{r.event_type || '—'}</td>
                      <td>{fmt(r.event_date)}</td>
                      <td>{r.photo_by || '—'}</td>
                      <td>{cur(r.gross_total)}</td>
                      <td style={{color:'#16a34a',fontWeight:600}}>{cur(r.advance)}</td>
                      <td style={{color: r.total_pending > 0 ? '#dc2626' : '#16a34a', fontWeight:600}}>
                        {cur(r.total_pending)}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>
                          {r.status}
                        </span>
                      </td>
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

          {total > 25 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p-1)}>Prev</button>
              <span>Page {page} of {Math.ceil(total/25)}</span>
              <button disabled={page >= Math.ceil(total/25)} onClick={() => setPage(p => p+1)}>Next</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{maxWidth:640}} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'new' ? 'New Booking' : `Edit Booking — ${modal.booking_no}`}</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={18}/></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input value={form.customer_name} onChange={set('customer_name')} required placeholder="e.g. Rahul Sharma" />
                </div>
                <div className="form-group">
                  <label>Contact No</label>
                  <input value={form.customer_contact} onChange={set('customer_contact')} placeholder="9876543210" />
                </div>
                <div className="form-group">
                  <label>Event Type</label>
                  <select value={form.event_type} onChange={set('event_type')}>
                    <option value="">— Select —</option>
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Event Date</label>
                  <input type="date" value={form.event_date} onChange={set('event_date')} />
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Venue</label>
                  <input value={form.venue} onChange={set('venue')} placeholder="Event venue / location" />
                </div>
                <div className="form-group">
                  <label>Photographer</label>
                  <input value={form.photo_by} onChange={set('photo_by')} placeholder="Photographer name" />
                </div>
                <div className="form-group">
                  <label>Payment Mode</label>
                  <select value={form.payment_mode} onChange={set('payment_mode')}>
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Gross Total (₹)</label>
                  <input type="number" value={form.gross_total} onChange={set('gross_total')} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Advance (₹)</label>
                  <input type="number" value={form.advance} onChange={set('advance')} placeholder="0" />
                </div>

                {/* Pending preview */}
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:6,padding:'10px 14px',display:'flex',gap:24}}>
                    <div>
                      <div style={{fontSize:11,color:'#6b7280',fontWeight:700,textTransform:'uppercase'}}>Total</div>
                      <div style={{fontSize:15,fontWeight:700,color:'#111827'}}>{cur(form.gross_total)}</div>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:'#6b7280',fontWeight:700,textTransform:'uppercase'}}>Advance</div>
                      <div style={{fontSize:15,fontWeight:700,color:'#16a34a'}}>{cur(form.advance)}</div>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:'#6b7280',fontWeight:700,textTransform:'uppercase'}}>Pending</div>
                      <div style={{fontSize:15,fontWeight:700,color: pending > 0 ? '#dc2626' : '#16a34a'}}>{cur(pending)}</div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={set('status')}>
                    {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Remark</label>
                  <input value={form.remark} onChange={set('remark')} placeholder="Any note..." />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : modal === 'new' ? 'Create Booking' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
