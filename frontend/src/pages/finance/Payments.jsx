import { useEffect, useState, useCallback } from 'react';
import { Save, Trash2, Printer, X, LogOut, Send, Search } from 'lucide-react';
import api from '../../api/axios';

const PAYMENT_TYPES = ['CASH', 'UPI', 'CHEQUE', 'CARD', 'BANK TRANSFER'];
const today = () => new Date().toISOString().slice(0, 10);

export default function Payments() {
  const [form, setForm] = useState({
    voucher_no: '', pay_date: today(), party_id: '', party_name: '', contact_no: '', address: '',
    purchase_id: '', payment_type: 'CASH', cheque_no: '', amount: '', remark: '',
  });
  const [parties, setParties] = useState([]);
  const [bills, setBills]     = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ order_total: 0, total_paid: 0, total_pending: 0 });
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const [msg, setMsg]         = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    api.get('/payments/parties').then(r => setParties(r.data || [])).catch(() => {});
    api.get('/payments/next-no').then(r => setForm(f => ({ ...f, voucher_no: r.data.next }))).catch(() => {});
  }, []);

  const loadDetail = useCallback(async (partyId) => {
    if (!partyId) { setBills([]); setPayments([]); setSummary({ order_total: 0, total_paid: 0, total_pending: 0 }); return; }
    try {
      const r = await api.get('/payments/detail', { params: { party_id: partyId } });
      setBills(r.data.bills || []);
      setPayments(r.data.payments || []);
      setSummary(r.data.summary || { order_total: 0, total_paid: 0, total_pending: 0 });
    } catch (e) { console.error(e); }
  }, []);

  const onPickParty = (id) => {
    const p = parties.find(x => String(x.id) === String(id));
    setForm(f => ({ ...f, party_id: id, party_name: p?.party_name || '', contact_no: p?.contact_no || '', address: p?.address || '', purchase_id: '' }));
    loadDetail(id);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const refreshAfterSave = async () => {
    await loadDetail(form.party_id);
    const n = await api.get('/payments/next-no');
    setForm(f => ({ ...f, voucher_no: n.data.next, amount: '', remark: '', cheque_no: '', purchase_id: '' }));
  };

  const loadByVoucher = async () => {
    if (!form.voucher_no) return;
    setErr(''); setMsg('');
    try {
      const r = await api.get(`/payments/by-voucher/${form.voucher_no}`);
      const p = r.data;
      setEditingId(p.id);
      setForm(f => ({
        ...f,
        voucher_no: p.voucher_no,
        pay_date: (p.payment_date || '').slice(0, 10) || today(),
        party_id: p.party_id, party_name: p.party_name || '', contact_no: p.contact_no || '', address: p.address || '',
        purchase_id: p.purchase_id || '', payment_type: p.payment_type || 'CASH', cheque_no: p.cheque_no || '',
        amount: p.amount, remark: p.remark || '',
      }));
      loadDetail(p.party_id);
      setMsg(`Loaded payment #${p.voucher_no} for edit`);
    } catch (ex) {
      setErr(ex.response?.status === 404 ? `No payment found with Voucher No ${form.voucher_no}` : 'Lookup failed');
    }
  };

  const save = async () => {
    if (!form.party_id) { setErr('Select a party'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setErr('Enter a valid amount'); return; }
    setSaving(true); setErr(''); setMsg('');
    try {
      const payload = {
        ...form, amount: Number(form.amount),
        purchase_id: form.purchase_id ? Number(form.purchase_id) : null,
      };
      if (editingId) {
        await api.put(`/payments/${editingId}`, payload);
        setMsg('Payment updated');
      } else {
        await api.post('/payments', payload);
        setMsg('Payment saved');
      }
      setEditingId(null);
      await refreshAfterSave();
    } catch (ex) { setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const delPayment = async (id) => {
    if (!confirm('Delete this payment?')) return;
    await api.delete(`/payments/${id}`);
    if (id === editingId) {
      setEditingId(null); reset();
      const n = await api.get('/payments/next-no');
      setForm(f => ({ ...f, voucher_no: n.data.next }));
      return;
    }
    loadDetail(form.party_id);
  };

  const deleteCurrent = async () => {
    if (!editingId) { setErr('Load an existing payment by Voucher No first'); return; }
    if (!confirm('Delete this payment?')) return;
    await api.delete(`/payments/${editingId}`);
    setMsg('Payment deleted');
    setEditingId(null);
    reset();
    const n = await api.get('/payments/next-no');
    setForm(f => ({ ...f, voucher_no: n.data.next }));
  };

  const reset = () => {
    setEditingId(null);
    setForm(f => ({ ...f, party_id: '', party_name: '', contact_no: '', address: '', purchase_id: '', amount: '', remark: '', cheque_no: '' }));
    setBills([]); setPayments([]); setSummary({ order_total: 0, total_paid: 0, total_pending: 0 });
    setErr(''); setMsg('');
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const billsTotalGrand   = bills.reduce((s, b) => s + Number(b.grand_total || 0), 0);
  const billsTotalPending = bills.reduce((s, b) => s + Number(b.pending || 0), 0);
  const paymentsTotal     = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const digits = (form.contact_no || '').replace(/\D/g, '');
  const shareText = encodeURIComponent(
    `Payment Voucher ${form.voucher_no}\nParty: ${form.party_name}\nAmount: ₹${cur(form.amount || 0)}\nTotal Pending: ₹${cur(summary.total_pending)}`);
  const openWhatsApp = () => window.open(`https://wa.me/${digits ? '91' + digits : ''}?text=${shareText}`, '_blank');

  const doPrint = () => {
    const w = window.open('', '_blank', 'width=760,height=900');
    w.document.write(`<!doctype html><html><head><title>Payment ${form.voucher_no}</title>
      <style>body{font-family:Arial,sans-serif;color:#111;padding:28px;font-size:13px}
      h1{font-size:19px;margin:0 0 4px}.muted{color:#555}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ccc;padding:6px 8px;font-size:12.5px}th{background:#eef2ff;text-align:left}
      .sum{display:flex;gap:20px;margin:14px 0}.sum div{flex:1;border:1px solid #ccc;padding:8px;text-align:center}</style></head><body>
      <h1>Party Payment</h1>
      <div class="muted">Voucher No: ${form.voucher_no} &nbsp; Date: ${fmt(form.pay_date)}</div>
      <div class="muted">Party: <b>${form.party_name}</b> &nbsp; ${form.contact_no || ''}</div>
      <div class="sum">
        <div>Total Billed<br><b>₹${cur(summary.order_total)}</b></div>
        <div>Total Paid<br><b>₹${cur(summary.total_paid)}</b></div>
        <div>Total Pending<br><b>₹${cur(summary.total_pending)}</b></div>
      </div>
      <h3>Payment Detail</h3>
      <table><thead><tr><th>Date</th><th>Type</th><th style="text-align:right">Amount</th><th>Remark</th></tr></thead>
      <tbody>${payments.map(p => `<tr><td>${fmt(p.payment_date)}</td><td>${p.payment_type}</td>
      <td style="text-align:right">₹${cur(p.amount)}</td><td>${p.remark || ''}</td></tr>`).join('')}</tbody></table>
      </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  return (
    <div className="page-container quotation-form">
      <div className="page-header">
        <div>
          <h1 className="page-title">Party Payment Detail</h1>
          <p className="page-subtitle">Voucher {form.voucher_no}{editingId ? ' — editing existing payment' : ''}</p>
        </div>
      </div>

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}
      {msg && <div className="alert alert-success" style={{ marginBottom: 12 }}>{msg}</div>}

      {/* Header */}
      <div className="card">
        <div className="card-body form-grid">
          <div className="form-group">
            <label>Voucher No {editingId && <span className="badge badge-blue" style={{ marginLeft: 6 }}>Editing</span>}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={form.voucher_no} onChange={set('voucher_no')} style={{ background: 'hsl(var(--accent))', fontWeight: 700, flex: 1 }} />
              <button type="button" className="btn btn-outline btn-icon" title="Load payment by Voucher No" onClick={loadByVoucher}>
                <Search size={14} />
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={form.pay_date} onChange={set('pay_date')} />
          </div>
          <div className="form-group">
            <label>Party Name</label>
            <select value={form.party_id} onChange={e => onPickParty(e.target.value)}>
              <option value="">— Select Party —</option>
              {parties.map(p => <option key={p.id} value={p.id}>{p.party_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Bill No</label>
            <select value={form.purchase_id} onChange={set('purchase_id')}>
              <option value="">— All / Party —</option>
              {bills.map(b => <option key={b.id} value={b.id}>{b.order_no} (Pending ₹{cur(b.pending)})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Contact Number</label>
            <input value={form.contact_no} onChange={set('contact_no')} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Address</label>
            <input value={form.address} onChange={set('address')} />
          </div>
        </div>
      </div>

      {/* Summary boxes */}
      <div className="stats-grid" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-label">TOTAL BILLED AMT</div>
          <div className="stat-value">₹{cur(summary.order_total)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">TOTAL PAID AMT</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>₹{cur(summary.total_paid)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">TOTAL PENDING AMT</div>
          <div className="stat-value" style={{ color: summary.total_pending > 0 ? '#dc2626' : '#16a34a' }}>₹{cur(summary.total_pending)}</div>
        </div>
      </div>

      {/* Payment entry */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-body form-grid" style={{ gridTemplateColumns: form.payment_type === 'CHEQUE' ? '1fr 1fr 1fr 2fr' : '1fr 1fr 2fr' }}>
          <div className="form-group">
            <label>Payment Type</label>
            <select value={form.payment_type} onChange={set('payment_type')}>
              {PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          {form.payment_type === 'CHEQUE' && (
            <div className="form-group">
              <label>Cheque No</label>
              <input value={form.cheque_no} onChange={set('cheque_no')} placeholder="Cheque number" />
            </div>
          )}
          <div className="form-group">
            <label>Amount</label>
            <input type="number" min={0} step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Remark</label>
            <input value={form.remark} onChange={set('remark')} />
          </div>
        </div>
      </div>

      {/* Two panels */}
      <div className="page-cols" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-header"><div className="card-title" style={{ color: '#dc2626' }}>Pending Bill Detail</div></div>
          <div className="table-wrap" style={{ minHeight: 200 }}>
            <table className="data-table">
              <thead><tr>
                <th>Bill No</th><th>Date</th>
                <th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Pend.Amt</th>
              </tr></thead>
              <tbody>
                {bills.length === 0 && <tr><td colSpan={4} className="table-empty"><p>No pending bills</p></td></tr>}
                {bills.map(b => (
                  <tr key={b.id}>
                    <td><span className="badge badge-blue">{b.order_no}</span></td>
                    <td>{fmt(b.order_date)}</td>
                    <td style={{ textAlign: 'right' }}>₹{cur(b.grand_total)}</td>
                    <td style={{ textAlign: 'right', color: b.pending > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>₹{cur(b.pending)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>Total :</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{cur(billsTotalGrand)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{cur(billsTotalPending)}</td>
              </tr></tfoot>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title" style={{ color: '#dc2626' }}>Payment Detail</div></div>
          <div className="table-wrap" style={{ minHeight: 200 }}>
            <table className="data-table">
              <thead><tr>
                <th>Date</th><th>Pay.Type</th><th style={{ textAlign: 'right' }}>Amount</th><th>Remark</th><th></th>
              </tr></thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={5} className="table-empty"><p>No payments</p></td></tr>}
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{fmt(p.payment_date)}</td>
                    <td><span className="badge badge-gray">{p.payment_type}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{cur(p.amount)}</td>
                    <td>{p.remark || '-'}</td>
                    <td><button className="btn-danger-soft" onClick={() => delPayment(p.id)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>Total :</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{cur(paymentsTotal)}</td>
                <td colSpan={2}></td>
              </tr></tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="quotation-actions">
        <button className="btn btn-primary" onClick={save} disabled={saving}><Save size={15} /> {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}</button>
        <button className="btn btn-danger"  onClick={deleteCurrent} disabled={!editingId}><Trash2 size={15} /> Delete</button>
        <button className="btn btn-outline" onClick={doPrint}><Printer size={15} /> Print</button>
        <button className="btn btn-ghost"   onClick={reset}><X size={15} /> Cancel</button>
        <button className="btn btn-ghost"   onClick={reset}><LogOut size={15} /> Exit</button>
        <button className="btn btn-outline" onClick={openWhatsApp}><Send size={15} /> Send WhatsApp</button>
      </div>
    </div>
  );
}
