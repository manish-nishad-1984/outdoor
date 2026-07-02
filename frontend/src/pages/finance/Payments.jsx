import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, CreditCard, X } from 'lucide-react';
import api from '../../api/axios';

const PAYMENT_TYPES = ['Cash','UPI','Cheque','Card','Online','Bank Transfer'];

const EMPTY = { voucher_no:'', party_id:'', amount:'', payment_type:'Cash', payment_date:'', cheque_no:'', remark:'' };

export default function Payments() {
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [stats, setStats]   = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/payments', { params: { search, page, limit: 25 } });
      setRows(r.data.data || []); setTotal(r.data.total || 0); setStats(r.data.stats || {});
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const openModal = async () => {
    setForm({ ...EMPTY, payment_date: new Date().toISOString().slice(0,10) });
    setErr('');
    if (!accounts.length) {
      try { const r = await api.get('/payments/accounts-list'); setAccounts(r.data || []); }
      catch(e){ console.error(e); }
    }
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.amount) return setErr('Amount is required');
    if (!form.payment_date) return setErr('Payment date is required');
    setSaving(true); setErr('');
    try {
      await api.post('/payments', form);
      setModal(false); load();
    } catch(ex){ setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete payment?')) return;
    await api.delete(`/payments/${id}`); load();
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => n != null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '₹0';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">{total} payment vouchers</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={16}/> New Payment
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card-accent">
          <div className="stat-label">TOTAL PAID</div>
          <div className="stat-value">{cur(stats.total)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CASH</div>
          <div className="stat-value" style={{color:'#16a34a'}}>{cur(stats.cash)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">UPI</div>
          <div className="stat-value" style={{color:'#7c3aed'}}>{cur(stats.upi)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CHEQUE</div>
          <div className="stat-value" style={{color:'#2563eb'}}>{cur(stats.cheque)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by party, voucher no..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>VOUCHER NO</th><th>PARTY</th><th>AMOUNT</th>
                  <th>MODE</th><th>DATE</th><th>CHEQUE NO</th><th>REMARK</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={8} className="table-empty"><CreditCard size={32}/><p>No payments found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><span className="badge badge-blue">{r.voucher_no}</span></td>
                      <td>{r.party_name || '-'}</td>
                      <td style={{fontWeight:600}}>{cur(r.amount)}</td>
                      <td><span className="badge badge-gray">{r.payment_type}</span></td>
                      <td>{fmt(r.payment_date)}</td>
                      <td>{r.cheque_no || '-'}</td>
                      <td>{r.remark || '-'}</td>
                      <td><button className="btn-danger-soft" onClick={() => del(r.id)}><Trash2 size={14}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 25 && (
            <div className="pagination">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)}>Prev</button>
              <span>Page {page} of {Math.ceil(total/25)}</span>
              <button disabled={page>=Math.ceil(total/25)} onClick={() => setPage(p=>p+1)}>Next</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Payment Voucher</h2>
              <button className="modal-close" onClick={() => setModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Voucher No <span style={{color:'#9ca3af',fontWeight:400}}>(auto if blank)</span></label>
                  <input value={form.voucher_no} onChange={set('voucher_no')} placeholder="PAY-0001" />
                </div>
                <div className="form-group">
                  <label>Party / Vendor</label>
                  <select value={form.party_id} onChange={set('party_id')}>
                    <option value="">— Select Party —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input type="number" value={form.amount} onChange={set('amount')} placeholder="0" required/>
                </div>
                <div className="form-group">
                  <label>Payment Mode</label>
                  <select value={form.payment_type} onChange={set('payment_type')}>
                    {PAYMENT_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Date *</label>
                  <input type="date" value={form.payment_date} onChange={set('payment_date')} required/>
                </div>
                {form.payment_type === 'Cheque' && (
                  <div className="form-group">
                    <label>Cheque No</label>
                    <input value={form.cheque_no} onChange={set('cheque_no')} placeholder="Cheque number"/>
                  </div>
                )}
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Remark</label>
                  <input value={form.remark} onChange={set('remark')} placeholder="Payment note..."/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
