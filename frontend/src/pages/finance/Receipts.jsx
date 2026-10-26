import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import DataGrid, { formatCurrency } from '../../components/grid/DataGrid';

// Backend aliases voucher_no/payment_type/payment_date/cheque_no; fall back to the raw names.
const COLUMNS = [
  { key: 'receipt_no', header: 'Receipt #', width: 110, value: r => r.receipt_no || r.voucher_no,
    cell: r => <span className="dg-link">{r.receipt_no || r.voucher_no}</span> },
  { key: 'receipt_date', header: 'Date', width: 110, format: 'date', value: r => r.receipt_date || r.payment_date },
  { key: 'amount', header: 'Amount', width: 130, format: 'currency', total: 'sum', strong: true,
    cell: r => <span className="dg-pos">{formatCurrency(r.amount)}</span> },
  { key: 'payment_mode', header: 'Mode', width: 110, value: r => r.payment_mode || r.payment_type,
    cell: r => <span className="badge badge-gray">{r.payment_mode || r.payment_type}</span> },
  { key: 'reference', header: 'Cheque No', width: 130, value: r => r.reference || r.cheque_no },
  { key: 'remark', header: 'Remark', width: 240 },
];

const EMPTY = { voucher_no:'', amount:'', payment_type:'Cash', payment_date:'', cheque_no:'', remark:'' };

export default function Receipts() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/receipts', { params: { limit: 5000 } })
      .then(r => setData(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = () => {
    const today = new Date().toISOString().slice(0,10);
    setForm({ ...EMPTY, payment_date: today });
    setErr('');
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.payment_date) return setErr('Amount and date are required');
    setSaving(true); setErr('');
    try {
      await api.post('/receipts', form);
      setModal(false);
      load();
    } catch(ex) { setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this receipt?')) return;
    try { await api.delete(`/receipts/${id}`); load(); } catch(e) { alert(e.response?.data?.error||'Delete failed'); }
  };

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const cur = formatCurrency;

  const totalReceived = data.reduce((s,d) => s+Number(d.amount||0), 0);
  const upiTotal  = data.filter(d=>d.payment_mode==='UPI').reduce((s,d)=>s+Number(d.amount||0),0);
  const cashTotal = data.filter(d=>d.payment_mode==='Cash').reduce((s,d)=>s+Number(d.amount||0),0);
  const chqTotal  = data.filter(d=>d.payment_mode==='Cheque').reduce((s,d)=>s+Number(d.amount||0),0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Receipts</h1>
          <p className="page-subtitle">{data.length} total receipts</p>
        </div>
      </div>

      <div className="stats-grid" style={{marginBottom:16}}>
        <div className="stat-card card-accent"><div className="stat-label">TOTAL RECEIVED</div><div className="stat-value">{cur(totalReceived)}</div></div>
        <div className="stat-card"><div className="stat-label">UPI / ONLINE</div><div className="stat-value">{cur(upiTotal)}</div></div>
        <div className="stat-card"><div className="stat-label">CASH</div><div className="stat-value">{cur(cashTotal)}</div></div>
        <div className="stat-card"><div className="stat-label">CHEQUE</div><div className="stat-value">{cur(chqTotal)}</div></div>
      </div>

      <DataGrid
        id="receipts"
        columns={COLUMNS}
        data={data}
        loading={loading}
        defaultSort={[{ id: 'receipt_date', desc: true }]}
        searchPlaceholder="Search receipt no, mode, remark…"
        emptyText="No receipts found"
        actionsWidth={56}
        rowActions={r => (
          <button type="button" className="dg-act del" title="Delete" onClick={() => del(r.id)}><Trash2 size={15} /></button>
        )}
        toolbar={<button type="button" className="btn btn-primary" onClick={openModal}><Plus size={16}/> New Receipt</button>}
      />

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Receipt</h2>
              <button className="modal-close" onClick={() => setModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Voucher No</label>
                  <input placeholder="Auto if blank" value={form.voucher_no} onChange={set('voucher_no')} />
                </div>
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input type="number" required value={form.amount} onChange={set('amount')} />
                </div>
                <div className="form-group">
                  <label>Payment Type</label>
                  <select value={form.payment_type} onChange={set('payment_type')}>
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Cheque</option>
                    <option>Card</option>
                    <option>Online</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" required value={form.payment_date} onChange={set('payment_date')} />
                </div>
                {form.payment_type === 'Cheque' && (
                  <div className="form-group">
                    <label>Cheque No</label>
                    <input value={form.cheque_no} onChange={set('cheque_no')} />
                  </div>
                )}
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Remark</label>
                  <input value={form.remark} onChange={set('remark')} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Receipt'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
