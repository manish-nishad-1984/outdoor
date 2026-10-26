import { useEffect, useState, useCallback } from 'react';
import { Save, Trash2, Printer, X, Send, Search, Check, Users, Phone, MapPin, Wallet, History } from 'lucide-react';
import api from '../../api/axios';
import '../../components/docForm.css';
import './outdoorPayment.css';

const PAYMENT_TYPES = ['CASH', 'UPI', 'CHEQUE', 'CARD', 'BANK TRANSFER'];
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_SUMMARY = { order_total: 0, total_paid: 0, total_pending: 0 };

export default function OutdoorPayment() {
  const [form, setForm] = useState({
    trans_no: '', pay_date: today(), party_name: '', contact_no: '', address: '',
    outdoor_order_id: '', payment_type: 'CASH', amount: '', remark: '',
  });
  const [parties, setParties] = useState([]);
  const [bills, setBills]     = useState([]);
  const [payments, setPayments] = useState([]);
  const [recent, setRecent]   = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const [msg, setMsg]         = useState('');
  const [editingId, setEditingId] = useState(null);
  const [findNo, setFindNo]   = useState('');

  const loadRecent = useCallback(() => {
    api.get('/outdoor-payments', { params: { limit: 8 } }).then(r => setRecent(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/outdoor-payments/parties').then(r => setParties(r.data || [])).catch(() => {});
    api.get('/outdoor-payments/next-no').then(r => setForm(f => ({ ...f, trans_no: r.data.next }))).catch(() => {});
    loadRecent();
  }, [loadRecent]);

  const loadDetail = useCallback(async (party) => {
    if (!party) { setBills([]); setPayments([]); setSummary(EMPTY_SUMMARY); return; }
    try {
      const r = await api.get('/outdoor-payments/detail', { params: { party } });
      setBills(r.data.bills || []);
      setPayments(r.data.payments || []);
      setSummary(r.data.summary || EMPTY_SUMMARY);
    } catch (e) { console.error(e); }
  }, []);

  // Party is typed or picked from the list; details load once the name matches a known party.
  const onPartyInput = (name) => {
    const p = parties.find(x => x.party_name === name);
    setForm(f => ({ ...f, party_name: name, outdoor_order_id: '',
      ...(p ? { contact_no: p.contact_no || '', address: p.address || '' } : {}) }));
    if (p) loadDetail(name);
    else { setBills([]); setPayments([]); setSummary(EMPTY_SUMMARY); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Clicking a pending bill pays against it and pre-fills its pending amount.
  const pickBill = (b) => {
    setForm(f => f.outdoor_order_id === String(b.id)
      ? { ...f, outdoor_order_id: '' }
      : { ...f, outdoor_order_id: String(b.id), amount: b.pending > 0 ? String(b.pending) : f.amount });
  };

  const newNo = async () => {
    const n = await api.get('/outdoor-payments/next-no');
    return n.data.next;
  };

  const refreshAfterSave = async () => {
    await loadDetail(form.party_name);
    loadRecent();
    const next = await newNo();
    setForm(f => ({ ...f, trans_no: next, amount: '', remark: '', outdoor_order_id: '' }));
  };

  const loadByTransNo = async (no) => {
    if (!no) return;
    setErr(''); setMsg('');
    try {
      const r = await api.get(`/outdoor-payments/by-trans-no/${no}`);
      const p = r.data;
      setEditingId(p.id);
      setForm(f => ({
        ...f,
        trans_no: p.trans_no,
        pay_date: (p.pay_date || '').slice(0, 10) || today(),
        party_name: p.party_name, contact_no: p.contact_no || '', address: p.address || '',
        outdoor_order_id: p.outdoor_order_id ? String(p.outdoor_order_id) : '', payment_type: p.payment_type || 'CASH',
        amount: p.amount, remark: p.remark || '',
      }));
      loadDetail(p.party_name);
      setFindNo('');
      setMsg(`Editing payment #${p.trans_no}`);
    } catch (ex) {
      setErr(ex.response?.status === 404 ? `No payment found with Trans No ${no}` : 'Lookup failed');
    }
  };

  const save = useCallback(async () => {
    if (!form.party_name) { setErr('Select an outdoor party'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setErr('Enter a valid amount'); return; }
    setSaving(true); setErr(''); setMsg('');
    try {
      const payload = {
        ...form, amount: Number(form.amount),
        outdoor_order_id: form.outdoor_order_id ? Number(form.outdoor_order_id) : null,
      };
      if (editingId) {
        await api.put(`/outdoor-payments/${editingId}`, payload);
        setMsg('Payment updated');
      } else {
        await api.post('/outdoor-payments', payload);
        setMsg(`Payment of ₹${Number(form.amount).toLocaleString('en-IN')} saved`);
      }
      setEditingId(null);
      await refreshAfterSave();
    } catch (ex) { setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, editingId]);

  // Ctrl+S saves from anywhere on the page.
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const reset = async () => {
    setEditingId(null);
    setForm(f => ({ ...f, pay_date: today(), party_name: '', contact_no: '', address: '', outdoor_order_id: '',
      payment_type: 'CASH', amount: '', remark: '' }));
    setBills([]); setPayments([]); setSummary(EMPTY_SUMMARY);
    setErr(''); setMsg('');
    const next = await newNo();
    setForm(f => ({ ...f, trans_no: next }));
  };

  const delPayment = async (id) => {
    if (!confirm('Delete this payment?')) return;
    await api.delete(`/outdoor-payments/${id}`);
    loadRecent();
    if (id === editingId) { await reset(); setMsg('Payment deleted'); return; }
    loadDetail(form.party_name);
  };

  const fmt = d => {
    if (!d) return '-';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };
  const cur = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const paymentsTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const selectedBill = bills.find(b => String(b.id) === String(form.outdoor_order_id));
  // When editing, the loaded amount is already counted in the summary, so don't subtract it twice.
  const pendingBase = selectedBill ? selectedBill.pending : summary.total_pending;
  const pendingAfter = editingId ? pendingBase : pendingBase - Number(form.amount || 0);
  const knownParty = parties.some(p => p.party_name === form.party_name);

  const digits = (form.contact_no || '').replace(/\D/g, '');
  const shareText = encodeURIComponent(
    `Payment Receipt (Trans ${form.trans_no})\nParty: ${form.party_name}\nAmount: ₹${cur(form.amount || 0)}\nTotal Pending: ₹${cur(summary.total_pending)}`);
  const openWhatsApp = () => window.open(`https://wa.me/${digits ? '91'+digits : ''}?text=${shareText}`, '_blank');

  const doPrint = () => {
    const w = window.open('', '_blank', 'width=760,height=900');
    w.document.write(`<!doctype html><html><head><title>Payment ${form.trans_no}</title>
      <style>body{font-family:Arial,sans-serif;color:#111;padding:28px;font-size:13px}
      h1{font-size:19px;margin:0 0 4px}.muted{color:#555}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ccc;padding:6px 8px;font-size:12.5px}th{background:#eef2ff;text-align:left}
      .sum{display:flex;gap:20px;margin:14px 0}.sum div{flex:1;border:1px solid #ccc;padding:8px;text-align:center}</style></head><body>
      <h1>Outdoor Party Payment</h1>
      <div class="muted">Trans No: ${form.trans_no} &nbsp; Date: ${fmt(form.pay_date)}</div>
      <div class="muted">Party: <b>${form.party_name}</b> &nbsp; ${form.contact_no || ''}</div>
      <div class="sum">
        <div>Order Total<br><b>₹${cur(summary.order_total)}</b></div>
        <div>Total Paid<br><b>₹${cur(summary.total_paid)}</b></div>
        <div>Total Pending<br><b>₹${cur(summary.total_pending)}</b></div>
      </div>
      <h3>Payment Detail</h3>
      <table><thead><tr><th>Date</th><th>Type</th><th style="text-align:right">Amount</th><th>Remark</th></tr></thead>
      <tbody>${payments.map(p => `<tr><td>${fmt(p.pay_date)}</td><td>${p.payment_type}</td>
      <td style="text-align:right">₹${cur(p.amount)}</td><td>${p.remark || ''}</td></tr>`).join('')}</tbody></table>
      </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  return (
    <div className="qf">
      <div className="qf-top">
        <h1>Outdoor Party Payment</h1>
        <span className="qf-no">#{form.trans_no}</span>
        {editingId && <span className="op-editing">Editing</span>}
        <form className="op-find" onSubmit={e => { e.preventDefault(); loadByTransNo(findNo); }}>
          <input value={findNo} onChange={e => setFindNo(e.target.value)} placeholder="Find by Trans No" inputMode="numeric" />
          <button type="submit" title="Open payment"><Search size={15} /></button>
        </form>
      </div>

      {err && <div className="alert alert-error qf-alert">{err}</div>}
      {msg && <div className="alert alert-success qf-alert">{msg}</div>}

      <div className="qf-grid">
        <div className="qf-main">
          {/* 1 — whose payment */}
          <section className="qf-card">
            <h2 className="qf-sec"><span className="qf-step">1</span> Party</h2>
            <div className="qf-fields">
              <label className="qf-field qf-span2">
                <span>Outdoor Party *</span>
                <input list="op-party-list" value={form.party_name} onChange={e => onPartyInput(e.target.value)}
                  placeholder="Type or pick a party" autoFocus />
                <datalist id="op-party-list">{parties.map((p, i) => <option key={i} value={p.party_name} />)}</datalist>
              </label>
              <label className="qf-field">
                <span><Phone size={12} /> Contact</span>
                <input value={form.contact_no} onChange={set('contact_no')} inputMode="tel" />
              </label>
              <label className="qf-field">
                <span><MapPin size={12} /> Address</span>
                <input value={form.address} onChange={set('address')} />
              </label>
            </div>

            {knownParty && (
              <div className="op-tiles">
                <div><span>Order Total</span><strong>₹{cur(summary.order_total)}</strong></div>
                <div className="ok"><span>Paid</span><strong>₹{cur(summary.total_paid)}</strong></div>
                <div className={summary.total_pending > 0 ? 'due' : 'ok'}><span>Pending</span><strong>₹{cur(summary.total_pending)}</strong></div>
              </div>
            )}
          </section>

          {!knownParty ? (
            <section className="qf-card">
              <h2 className="qf-sec"><History size={16} /> Recent Payments</h2>
              {recent.length === 0 ? <p className="qf-hint">No payments yet. Pick a party above to receive one.</p> : (
                <div className="op-list">
                  {recent.map(p => (
                    <button type="button" key={p.id} className="op-recent" onClick={() => loadByTransNo(p.trans_no)} title="Open this payment">
                      <span className="op-recent-no">#{p.trans_no}</span>
                      <span className="op-recent-main"><b>{p.party_name}</b><small>{fmt(p.pay_date)} · {p.payment_type}{p.order_no ? ` · Order #${p.order_no}` : ''}</small></span>
                      <span className="op-amt">₹{cur(p.amount)}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="qf-hint"><Users size={13} /> Pick a party above to see their pending bills.</p>
            </section>
          ) : <>
            {/* 2 — what is still owed; click a bill to pay against it */}
            <section className="qf-card">
              <h2 className="qf-sec">
                <span className="qf-step">2</span> Pending Bills <small>click a bill to pay against it</small>
              </h2>
              {bills.length === 0 ? <p className="qf-hint">No bills for this party.</p> : (
                <div className="op-bills">
                  {bills.map(b => {
                    const pct = b.grand_total > 0 ? Math.min(100, Math.round((b.paid / b.grand_total) * 100)) : 100;
                    const on = String(b.id) === String(form.outdoor_order_id);
                    return (
                      <button type="button" key={b.id} className={`op-bill${on ? ' on' : ''}${b.pending <= 0 ? ' paid' : ''}`} onClick={() => pickBill(b)}>
                        <span className="op-bill-head">
                          <b>Order #{b.order_no}</b>
                          <small>{fmt(b.order_date)}</small>
                          {on && <Check size={15} className="op-bill-check" />}
                        </span>
                        <span className="op-bar"><span style={{ width: `${pct}%` }} /></span>
                        <span className="op-bill-nums">
                          <span>Total ₹{cur(b.grand_total)}</span>
                          <span className={b.pending > 0 ? 'due' : 'ok'}>{b.pending > 0 ? `Pending ₹${cur(b.pending)}` : 'Fully paid'}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3 — what has been received so far */}
            <section className="qf-card">
              <h2 className="qf-sec"><span className="qf-step">3</span> Payment History</h2>
              <div className="qf-table-wrap">
                <table className="qf-table">
                  <thead><tr>
                    <th style={{ width: 70 }}>Trans</th>
                    <th style={{ width: 110 }}>Date</th>
                    <th style={{ width: 130 }}>Type</th>
                    <th style={{ width: 100 }}>Order</th>
                    <th>Remark</th>
                    <th className="r" style={{ width: 120 }}>Amount</th>
                    <th style={{ width: 76 }}></th>
                  </tr></thead>
                  <tbody>
                    {payments.length === 0 && <tr><td colSpan={7} className="op-empty">No payments received yet</td></tr>}
                    {payments.map(p => {
                      const bill = bills.find(b => b.id === p.outdoor_order_id);
                      return (
                        <tr key={p.id} className={p.id === editingId ? 'editing' : undefined}>
                          <td className="b">#{p.trans_no}</td>
                          <td>{fmt(p.pay_date)}</td>
                          <td><span className="badge badge-gray">{p.payment_type}</span></td>
                          <td>{bill ? `#${bill.order_no}` : '—'}</td>
                          <td>{p.remark || '—'}</td>
                          <td className="r b">₹{cur(p.amount)}</td>
                          <td className="acts">
                            <button type="button" onClick={() => loadByTransNo(p.trans_no)} title="Edit"><Wallet size={14} /></button>
                            <button type="button" className="del" onClick={() => delPayment(p.id)} title="Delete"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {payments.length > 0 && (
                    <tfoot><tr className="op-total">
                      <td colSpan={5}>Total received ({payments.length})</td>
                      <td className="r">₹{cur(paymentsTotal)}</td><td />
                    </tr></tfoot>
                  )}
                </table>
              </div>
            </section>
          </>}
        </div>

        {/* Receive payment — everything needed to record it, always in view */}
        <aside className="qf-side">
          <div className="qf-card qf-sum">
            <h2 className="qf-sec">{editingId ? 'Edit Payment' : 'Receive Payment'}</h2>
            <label className="qf-field op-gap">
              <span>Date</span>
              <input type="date" value={form.pay_date} onChange={set('pay_date')} />
            </label>
            <label className="qf-field op-gap">
              <span>Against Order</span>
              <select value={form.outdoor_order_id} onChange={set('outdoor_order_id')} disabled={!knownParty}>
                <option value="">Whole party account</option>
                {bills.map(b => <option key={b.id} value={b.id}>Order #{b.order_no} — pending ₹{cur(b.pending)}</option>)}
              </select>
            </label>
            <div className="qf-field op-gap">
              <span>Payment Type</span>
              <div className="op-types">
                {PAYMENT_TYPES.map(t => (
                  <button type="button" key={t} className={form.payment_type === t ? 'on' : undefined}
                    onClick={() => setForm(f => ({ ...f, payment_type: t }))}>{t === 'BANK TRANSFER' ? 'BANK' : t}</button>
                ))}
              </div>
            </div>
            <label className="qf-field op-gap">
              <span className="op-amt-label">
                Amount (₹) *
                {pendingBase > 0 && !editingId && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, amount: String(pendingBase) }))}>Full pending ₹{cur(pendingBase)}</button>
                )}
              </span>
              <input className="op-amount" type="number" min={0} step="0.01" value={form.amount} onChange={set('amount')} placeholder="0" />
            </label>
            <label className="qf-field op-gap">
              <span>Remark</span>
              <input value={form.remark} onChange={set('remark')} placeholder="Optional" />
            </label>

            {knownParty && (
              <div className={`qf-pending${pendingAfter > 0 ? ' due' : ''}`}>
                <span>{editingId ? 'Pending' : 'Pending after this'}{selectedBill ? ` (Order #${selectedBill.order_no})` : ''}</span>
                <strong>₹{cur(Math.max(0, pendingAfter))}</strong>
              </div>
            )}

            <button type="button" className="btn btn-primary qf-save" onClick={save} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving…' : editingId ? 'Update Payment' : 'Save Payment'}
            </button>
            <div className="qf-actions">
              <button type="button" className="btn btn-outline" onClick={doPrint} disabled={!form.party_name}><Printer size={15} /> Print</button>
              <button type="button" className="btn btn-outline" onClick={openWhatsApp} disabled={!form.party_name}><Send size={15} /> WhatsApp</button>
            </div>
            <div className="qf-actions-sub">
              <button type="button" onClick={reset}><X size={14} /> {editingId ? 'New payment' : 'Clear'}</button>
              {editingId && <button type="button" className="del" onClick={() => delPayment(editingId)}><Trash2 size={14} /> Delete</button>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
