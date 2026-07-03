import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, Trash2, Printer, X, LogOut, MessageSquare, Mail, Send, Plus
} from 'lucide-react';
import api from '../../api/axios';

const EVENTS = ['Wedding','Reception','Engagement','Haldi','Mehndi','Sangeet',
  'Pre-Wedding','Ring Ceremony','Baby Shower','Birthday','Other'];

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_ENTRY = { function_date: today(), item_name: '', event_name: '', qnty: 1, rate: 0, total: 0 };

export default function QuotationForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    quo_no: '', quo_date: today(), client_name: '', couple_name: '', ref_by: '',
    package_name: '', address: '', contact_no: '', email: '',
    discount: 0, note: '', wedding_deliverables: '', prewedding_deliverables: '',
    display_purchase_rate: false,
  });
  const [items, setItems]   = useState([]);
  const [entry, setEntry]   = useState({ ...EMPTY_ENTRY });
  const [itemList, setItemList] = useState([]);
  const [eventList, setEventList] = useState([]);
  const [recent, setRecent] = useState([]);
  const [showWed, setShowWed]   = useState(false);
  const [showPre, setShowPre]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  // Load item master + recent quotations
  useEffect(() => {
    api.get('/items').then(r => setItemList((r.data || []).filter(x => !x.not_use)))
       .catch(() => {});
    api.get('/quotations', { params: { limit: 12 } })
       .then(r => setRecent(r.data.data || [])).catch(() => {});
    api.get('/events').then(r => setEventList((r.data || []).filter(x => !x.not_use).map(x => x.event_name))).catch(() => {});
  }, []);

  // Load next number (new) or existing record (edit)
  useEffect(() => {
    if (isEdit) {
      api.get(`/quotations/${id}`).then(r => {
        const q = r.data;
        setForm({
          quo_no: q.quo_no || '', quo_date: q.quo_date?.slice(0,10) || today(),
          client_name: q.client_name || '', couple_name: q.couple_name || '',
          ref_by: q.ref_by || '', package_name: q.package_name || '',
          address: q.address || '', contact_no: q.contact_no || '', email: q.email || '',
          discount: q.discount || 0, note: q.note || '',
          wedding_deliverables: q.wedding_deliverables || '',
          prewedding_deliverables: q.prewedding_deliverables || '',
          display_purchase_rate: !!q.display_purchase_rate,
        });
        setItems((q.items || []).map(it => ({
          function_date: it.function_date?.slice(0,10) || '', item_name: it.item_name || '',
          event_name: it.event_name || '', qnty: Number(it.qnty) || 0,
          rate: Number(it.rate) || 0, total: Number(it.total) || 0,
        })));
      }).catch(() => setErr('Failed to load quotation'));
    } else {
      api.get('/quotations/next-no').then(r => setForm(f => ({ ...f, quo_no: r.data.next }))).catch(() => {});
    }
  }, [id, isEdit]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Entry row handlers
  const setE = (k, v) => setEntry(en => {
    const next = { ...en, [k]: v };
    if (k === 'qnty' || k === 'rate') next.total = (Number(next.qnty) * Number(next.rate)) || 0;
    return next;
  });
  const onPickItem = (name) => {
    const it = itemList.find(x => x.item_name === name);
    setEntry(en => {
      const rate = it ? Number(it.rate) || 0 : en.rate;
      return { ...en, item_name: name, rate, total: (Number(en.qnty) * rate) || 0 };
    });
  };
  const addEntry = () => {
    if (!entry.item_name) return setErr('Select an item to add');
    setErr('');
    setItems(arr => [...arr, { ...entry, total: (Number(entry.qnty) * Number(entry.rate)) || 0 }]);
    setEntry({ ...EMPTY_ENTRY, function_date: entry.function_date });
  };
  const delRow = i => setItems(arr => arr.filter((_, x) => x !== i));

  const subTotal = items.reduce((s, it) => s + Number(it.total || 0), 0);
  const grandTotal = Math.max(0, subTotal - Number(form.discount || 0));

  const buildBody = () => ({ ...form, items, discount: Number(form.discount || 0) });

  const save = useCallback(async () => {
    if (!form.client_name.trim()) { setErr('Client name required'); return; }
    if (items.length === 0) { setErr('Add at least one item'); return; }
    setSaving(true); setErr('');
    try {
      if (isEdit) await api.put(`/quotations/${id}`, buildBody());
      else await api.post('/quotations', buildBody());
      nav('/quotations');
    } catch (ex) { setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, items, isEdit, id]);

  const remove = async () => {
    if (!isEdit) return nav('/quotations');
    if (!confirm('Delete this quotation?')) return;
    await api.delete(`/quotations/${id}`);
    nav('/quotations');
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  // Print — withRate toggles the Rate/Total columns
  const doPrint = (withRate) => {
    const rows = items.map(it => `
      <tr>
        <td>${fmt(it.function_date)}</td>
        <td>${it.item_name}</td>
        <td>${it.event_name || ''}</td>
        <td style="text-align:center">${it.qnty}</td>
        ${withRate ? `<td style="text-align:right">${cur(it.rate)}</td><td style="text-align:right">${cur(it.total)}</td>` : ''}
      </tr>`).join('');
    const totalsBlock = withRate ? `
      <table class="tot"><tbody>
        <tr><td>Sub Total</td><td style="text-align:right">${cur(subTotal)}</td></tr>
        <tr><td>Discount</td><td style="text-align:right">${cur(form.discount)}</td></tr>
        <tr class="grand"><td>Grand Total</td><td style="text-align:right">${cur(grandTotal)}</td></tr>
      </tbody></table>` : '';
    const w = window.open('', '_blank', 'width=800,height=900');
    w.document.write(`<!doctype html><html><head><title>Quotation ${form.quo_no}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#111;padding:28px;font-size:13px}
        h1{font-size:20px;margin:0 0 4px} .muted{color:#555}
        .head{display:flex;justify-content:space-between;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #ccc;padding:6px 8px;font-size:12.5px}
        th{background:#eef2ff;text-align:left}
        .tot{width:280px;margin-left:auto;margin-top:12px}
        .tot td{border:none;padding:4px 8px} .grand{font-weight:700;border-top:1px solid #ccc}
        .note{margin-top:16px;white-space:pre-wrap}
      </style></head><body>
      <div class="head">
        <div><h1>Quotation</h1><div class="muted">Quo No: ${form.quo_no} &nbsp; Date: ${fmt(form.quo_date)}</div></div>
        <div style="text-align:right">
          <div><b>${form.client_name || ''}</b></div>
          <div class="muted">${form.couple_name || ''}</div>
          <div class="muted">${form.contact_no || ''}</div>
        </div>
      </div>
      <table><thead><tr>
        <th>Date</th><th>Item Name</th><th>Event</th><th style="text-align:center">Qnty</th>
        ${withRate ? '<th style="text-align:right">Rate</th><th style="text-align:right">Total</th>' : ''}
      </tr></thead><tbody>${rows}</tbody></table>
      ${totalsBlock}
      ${form.note ? `<div class="note"><b>Note:</b> ${form.note}</div>` : ''}
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const digits = (form.contact_no || '').replace(/\D/g, '');
  const shareText = encodeURIComponent(
    `Quotation ${form.quo_no}\nClient: ${form.client_name}\nGrand Total: ${cur(grandTotal)}`);
  const openWhatsApp = () => window.open(`https://wa.me/${digits ? '91'+digits : ''}?text=${shareText}`, '_blank');
  const openSMS   = () => { window.location.href = `sms:${digits}?body=${shareText}`; };
  const openEmail = () => { window.location.href =
    `mailto:${form.email}?subject=${encodeURIComponent('Quotation '+form.quo_no)}&body=${shareText}`; };

  return (
    <div className="page-container quotation-form">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotation</h1>
          <p className="page-subtitle">{isEdit ? `Editing Quo No ${form.quo_no}` : `New — Quo No ${form.quo_no}`}</p>
        </div>
      </div>

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="page-cols" style={{ gridTemplateColumns: '2.4fr 1fr' }}>
        {/* Header details */}
        <div className="card">
          <div className="card-body form-grid">
            <div className="form-group">
              <label>Quo No</label>
              <input value={form.quo_no} readOnly style={{ background: '#eff6ff', fontWeight: 700 }} />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.quo_date} onChange={set('quo_date')} />
            </div>
            <div className="form-group">
              <label>Client Name *</label>
              <input value={form.client_name} onChange={set('client_name')} required />
            </div>
            <div className="form-group">
              <label>Contact No</label>
              <input value={form.contact_no} onChange={set('contact_no')} />
            </div>
            <div className="form-group">
              <label>Couple Name</label>
              <input value={form.couple_name} onChange={set('couple_name')} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="form-group">
              <label>Ref. By</label>
              <input value={form.ref_by} onChange={set('ref_by')} />
            </div>
            <div className="form-group">
              <label>Package</label>
              <input value={form.package_name} onChange={set('package_name')} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Address</label>
              <input value={form.address} onChange={set('address')} />
            </div>
            <label className="checkbox-row" style={{ gridColumn: '1/-1', color: '#dc2626', fontWeight: 600 }}>
              <input type="checkbox" checked={form.display_purchase_rate}
                onChange={e => setForm(f => ({ ...f, display_purchase_rate: e.target.checked }))} />
              <span>Display Purchase Rate</span>
            </label>
          </div>
        </div>

        {/* Recent quotations */}
        <div className="card">
          <div className="card-header"><div className="card-title">Recent</div></div>
          <div className="table-wrap" style={{ maxHeight: 220, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Quo.No</th><th>Date</th></tr></thead>
              <tbody>
                {recent.length === 0 && <tr><td colSpan={2} style={{ color: '#9ca3af', padding: 12 }}>None yet</td></tr>}
                {recent.map(r => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/quotations/${r.id}`)}>
                    <td><span className="badge badge-blue">{r.quo_no}</span></td>
                    <td>{fmt(r.quo_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Item entry row */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-body">
          <div className="qitem-entry">
            <div className="form-group">
              <label>Function Date</label>
              <input type="date" value={entry.function_date} onChange={e => setE('function_date', e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Item Name</label>
              <input list="item-master-list" value={entry.item_name}
                onChange={e => onPickItem(e.target.value)} placeholder="Select / type item…" />
              <datalist id="item-master-list">
                {itemList.map(it => <option key={it.id} value={it.item_name} />)}
              </datalist>
            </div>
            <div className="form-group" style={{ flex: 1.4 }}>
              <label>Event Name</label>
              <input list="event-list" value={entry.event_name}
                onChange={e => setE('event_name', e.target.value)} placeholder="Event…" />
              <datalist id="event-list">
                {(eventList.length ? eventList : EVENTS).map(ev => <option key={ev} value={ev} />)}
              </datalist>
            </div>
            <div className="form-group" style={{ width: 80 }}>
              <label>Qnty</label>
              <input type="number" min={0} value={entry.qnty} onChange={e => setE('qnty', e.target.value)} />
            </div>
            <div className="form-group" style={{ width: 110 }}>
              <label>Rate</label>
              <input type="number" min={0} step="0.01" value={entry.rate} onChange={e => setE('rate', e.target.value)} />
            </div>
            <div className="form-group" style={{ width: 120 }}>
              <label>Total</label>
              <input value={cur(entry.total)} readOnly style={{ background: '#f9fafb', fontWeight: 600 }} />
            </div>
            <div className="qitem-entry-btns">
              <button type="button" className="btn btn-primary btn-sm" onClick={addEntry}><Plus size={15} /> Add</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEntry({ ...EMPTY_ENTRY })}>Cancel</button>
            </div>
          </div>
        </div>
      </div>

      {/* Items grid + totals */}
      <div className="page-cols" style={{ gridTemplateColumns: '2.4fr 1fr', marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="table-wrap" style={{ minHeight: 220 }}>
            <table className="data-table">
              <thead><tr>
                <th>Date</th><th>Item Name</th><th>Event</th>
                <th style={{ textAlign: 'center' }}>Qnty</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Total</th><th></th>
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={7} className="table-empty"><p>No items added</p></td></tr>}
                {items.map((it, i) => (
                  <tr key={i}>
                    <td>{fmt(it.function_date)}</td>
                    <td><strong>{it.item_name}</strong></td>
                    <td>{it.event_name || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{it.qnty}</td>
                    <td style={{ textAlign: 'right' }}>{cur(it.rate)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{cur(it.total)}</td>
                    <td><button className="btn-danger-soft" onClick={() => delRow(i)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="summary-box">
              <div className="summary-row"><span>Sub Total</span><strong>{cur(subTotal)}</strong></div>
              <div className="summary-row">
                <span>Discount</span>
                <input type="number" min={0} value={form.discount} onChange={set('discount')}
                  style={{ width: 120, textAlign: 'right', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} />
              </div>
              <div className="summary-row" style={{ borderBottom: 'none', fontSize: 15 }}>
                <strong>Grand Total</strong><strong style={{ color: '#2563eb' }}>{cur(grandTotal)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowWed(s => !s)}>Wedding Deliverables</button>
              {showWed && <textarea rows={4} placeholder="Wedding deliverables…"
                value={form.wedding_deliverables} onChange={set('wedding_deliverables')} />}
              <button type="button" className="btn btn-outline" onClick={() => setShowPre(s => !s)}>PreWedding Deliverables</button>
              {showPre && <textarea rows={4} placeholder="Pre-wedding deliverables…"
                value={form.prewedding_deliverables} onChange={set('prewedding_deliverables')} />}
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-body form-group">
          <label>Note</label>
          <textarea rows={3} value={form.note} onChange={set('note')} />
        </div>
      </div>

      {/* Action bar */}
      <div className="quotation-actions">
        <button className="btn btn-primary"  onClick={save} disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save'}</button>
        <button className="btn btn-danger"   onClick={remove}><Trash2 size={15} /> Delete</button>
        <button className="btn btn-outline"  onClick={() => doPrint(true)}><Printer size={15} /> Print (Rate)</button>
        <button className="btn btn-outline"  onClick={() => doPrint(false)}><Printer size={15} /> Print (W/O Rate)</button>
        <button className="btn btn-ghost"    onClick={() => nav('/quotations')}><X size={15} /> Cancel</button>
        <button className="btn btn-ghost"    onClick={() => nav('/quotations')}><LogOut size={15} /> Exit</button>
        <button className="btn btn-outline"  onClick={openSMS}><MessageSquare size={15} /> Send SMS</button>
        <button className="btn btn-outline"  onClick={openWhatsApp}><Send size={15} /> WhatsApp</button>
        <button className="btn btn-outline"  onClick={openEmail}><Mail size={15} /> Send Email</button>
      </div>
    </div>
  );
}
