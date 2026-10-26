import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Check } from 'lucide-react';
import api from '../../api/axios';
import '../../components/docForm.css';

const PAYMENT_MODES = ['Cash','UPI','Cheque','Card','Online'];
const WEDDING_ITEMS = [
  'Photography','Videography','Drone','Traditional Photography','Pre-Wedding',
  'Candid Photography','Album','Video Editing','Invitation Video','Reels',
  'LED Screen','Sound System','Generator'
];
const EMPTY_ROW = { description:'', qty:1, rate:0, amount:0 };

export default function SaleForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';

  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({
    customer_name: '',
    inquiry_date: today,
    payment_mode: 'Cash',
    gross_total: 0,
    discount_rs: 0,
    advance: 0,
    total_pending: 0,
    status: 'Pending',
    items: [{ ...EMPTY_ROW }],
    wedding_items: [],
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  useEffect(() => {
    if (!isNew) {
      api.get(`/sales/${id}`).then(r => {
        const d = r.data;
        setForm(f => ({ ...f, ...d, items: d.items||[{ ...EMPTY_ROW }], wedding_items: d.wedding_items||[] }));
      }).catch(console.error);
    }
  }, [id, isNew]);

  const setF = k => e => {
    setForm(f => {
      const updated = { ...f, [k]: e.target.value };
      // Recalc pending
      const gross = parseFloat(updated.gross_total)||0;
      const disc  = parseFloat(updated.discount_rs)||0;
      const adv   = parseFloat(updated.advance)||0;
      updated.total_pending = gross - disc - adv;
      return updated;
    });
  };

  const addRow = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ROW }] }));
  const removeRow = idx => setForm(f => ({ ...f, items: f.items.filter((_,i)=>i!==idx) }));
  const setRow = (idx, key, val) => {
    setForm(f => {
      const items = f.items.map((it,i) => {
        if (i!==idx) return it;
        const u = { ...it, [key]: val };
        if (key==='qty'||key==='rate') u.amount = parseFloat(u.qty||0)*parseFloat(u.rate||0);
        return u;
      });
      const gross = items.reduce((s,it)=>s+parseFloat(it.amount||0),0);
      const disc  = parseFloat(f.discount_rs)||0;
      const adv   = parseFloat(f.advance)||0;
      return { ...f, items, gross_total: gross, total_pending: gross - disc - adv };
    });
  };

  const toggleWedding = item => {
    setForm(f => ({
      ...f,
      wedding_items: f.wedding_items.includes(item)
        ? f.wedding_items.filter(x=>x!==item)
        : [...f.wedding_items, item]
    }));
  };

  const save = async e => {
    e.preventDefault();
    if (!form.customer_name) return setErr('Customer name is required');
    setSaving(true); setErr('');
    try {
      if (isNew) await api.post('/sales', form);
      else await api.put(`/sales/${id}`, form);
      nav('/sales');
    } catch(ex){ setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const cur = n => `₹${parseFloat(n||0).toLocaleString('en-IN')}`;
  const gross = form.items.reduce((s,it)=>s+parseFloat(it.amount||0),0);
  const disc  = parseFloat(form.discount_rs)||0;
  const adv   = parseFloat(form.advance)||0;
  const pending = gross - disc - adv;

  return (
    <div className="qf">
      <div className="qf-top">
        <button type="button" className="qf-back" onClick={() => nav('/sales')} title="Back to list"><ArrowLeft size={18} /></button>
        <h1>{isNew ? 'New Sale Invoice' : 'Edit Sale Invoice'}</h1>
        {!isNew && <span className="qf-no">#{id}</span>}
      </div>

      {err && <div className="alert alert-error qf-alert">{err}</div>}

      <div className="qf-grid">
        <div className="qf-main">
          <section className="qf-card">
            <h2 className="qf-sec"><span className="qf-step">1</span> Customer</h2>
            <div className="qf-fields">
              <label className="qf-field qf-span2">
                <span>Customer Name *</span>
                <input value={form.customer_name} onChange={setF('customer_name')} placeholder="Customer name" autoFocus={isNew} />
              </label>
              <label className="qf-field">
                <span>Invoice Date</span>
                <input type="date" value={form.inquiry_date} onChange={setF('inquiry_date')} />
              </label>
              <label className="qf-field">
                <span>Status</span>
                <select value={form.status} onChange={setF('status')}>
                  {['Pending','Confirmed','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
          </section>

          {/* Line items are edited in place; "Add row" appends a blank one */}
          <section className="qf-card">
            <h2 className="qf-sec"><span className="qf-step">2</span> Items</h2>
            <div className="qf-table-wrap">
              <table className="qf-table">
                <thead><tr>
                  <th>Description</th>
                  <th className="r" style={{ width: 80 }}>Qty</th>
                  <th className="r" style={{ width: 110 }}>Rate</th>
                  <th className="r" style={{ width: 110 }}>Amount</th>
                  <th style={{ width: 44 }}></th>
                </tr></thead>
                <tbody>
                  {form.items.map((it, idx) => (
                    <tr key={idx} className="qf-edit-row">
                      <td><input value={it.description} onChange={e => setRow(idx, 'description', e.target.value)} placeholder="Service / item description" /></td>
                      <td><input className="r" type="number" value={it.qty} onChange={e => setRow(idx, 'qty', e.target.value)} /></td>
                      <td><input className="r" type="number" value={it.rate} onChange={e => setRow(idx, 'rate', e.target.value)} /></td>
                      <td className="r b">{cur(it.amount)}</td>
                      <td className="acts">
                        {form.items.length > 1 && (
                          <button type="button" className="del" onClick={() => removeRow(idx)} title="Remove"><Trash2 size={14} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="qf-sec-foot">
              <button type="button" className="qf-link" onClick={addRow}><Plus size={14} /> Add row</button>
            </div>
          </section>

          <section className="qf-card">
            <h2 className="qf-sec"><span className="qf-step">3</span> Wedding Services <small>tick what is included</small></h2>
            <div className="qf-pills">
              {WEDDING_ITEMS.map(item => {
                const on = form.wedding_items.includes(item);
                return (
                  <label key={item} className={on ? 'on' : undefined}>
                    <input type="checkbox" checked={on} onChange={() => toggleWedding(item)} />{on && <Check size={13} />} {item}
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="qf-side">
          <div className="qf-card qf-sum">
            <h2 className="qf-sec">Summary</h2>
            <div className="qf-sum-row strong" style={{ borderTop: 0, marginTop: 0 }}><span>Gross Total</span><span>{cur(gross)}</span></div>
            <label className="qf-sum-row"><span>Discount (₹)</span>
              <input type="number" value={form.discount_rs} onChange={setF('discount_rs')} /></label>
            <div className="qf-grand"><span>Net Total</span><strong>{cur(gross - disc)}</strong></div>
            <label className="qf-sum-row"><span>Advance (₹)</span>
              <input type="number" value={form.advance} onChange={setF('advance')} /></label>
            <label className="qf-sum-row"><span>Paid by</span>
              <select value={form.payment_mode} onChange={setF('payment_mode')}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select></label>
            <div className={`qf-pending${pending > 0 ? ' due' : ''}`}>
              <span>{pending > 0 ? 'Pending' : 'Fully paid'}</span><strong>{cur(pending > 0 ? pending : 0)}</strong>
            </div>
            <button type="button" className="btn btn-primary qf-save" onClick={save} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving…' : 'Save Invoice'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
