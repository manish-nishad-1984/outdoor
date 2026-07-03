import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, Trash2, Printer, X, LogOut, MessageSquare, Mail, Send, Plus
} from 'lucide-react';
import api from '../../api/axios';

const EVENTS = ['Wedding','Reception','Engagement','Haldi','Mehndi','Sangeet',
  'Pre-Wedding','Ring Ceremony','Baby Shower','Birthday','Portfolio','Passport','Other'];
const PAYMENTS = ['Cash','UPI','Cheque','Card','Bank Transfer'];

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_ENTRY = { function_date: today(), item_name: '', event_name: '', qnty: 1, rate: 0, total: 0 };

export default function StudioOrderForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    order_no: '', order_date: today(), delivery_date: '', mob_no: '', cust_name: '', address: '',
    quo_no: '', couple_name: '', remark: '', ref_by: '', package_name: '',
    discount: 0, advance: 0, payment_mode: 'Cash', status: false,
    display_staff_expenses: false, final_delivery_notes: '', prewedding_deliverables: '', family_detail: '',
    st_selection: false, st_invitation: false, st_data: false, st_delivery: false,
    st_desining: false, st_printing: false, st_dvd_pendrive: false, st_done: false, st_reels: false,
    desining_opt: '', printing_opt: '', dvd_opt: '',
  });
  const [items, setItems]     = useState([]);
  const [entry, setEntry]     = useState({ ...EMPTY_ENTRY });
  const [itemList, setItemList] = useState([]);
  const [eventList, setEventList] = useState([]);
  const [quos, setQuos]       = useState([]);
  const [recent, setRecent]   = useState([]);
  const [panel, setPanel]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  useEffect(() => {
    api.get('/items').then(r => setItemList((r.data || []).filter(x => !x.not_use))).catch(() => {});
    api.get('/quotations', { params: { limit: 100 } }).then(r => setQuos(r.data.data || [])).catch(() => {});
    api.get('/studio-orders', { params: { limit: 12 } }).then(r => setRecent(r.data.data || [])).catch(() => {});
    api.get('/events').then(r => setEventList((r.data || []).filter(x => !x.not_use).map(x => x.event_name))).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
      api.get(`/studio-orders/${id}`).then(r => {
        const o = r.data;
        setForm({
          order_no: o.order_no || '', order_date: (o.order_date || o.inquiry_date)?.slice(0,10) || today(),
          delivery_date: o.delivery_date?.slice(0,10) || '',
          mob_no: o.mob_no || o.customer_contact || '', cust_name: o.cust_name || o.customer_address || '',
          address: o.address || '', quo_no: o.quo_no || '', couple_name: o.couple_name || '',
          remark: o.remark || '', ref_by: o.ref_by || '', package_name: o.package_name || '',
          discount: o.discount || 0, advance: o.advance || 0, payment_mode: o.payment_mode || 'Cash', status: !!o.status,
          display_staff_expenses: !!o.display_staff_expenses, final_delivery_notes: o.final_delivery_notes || '',
          prewedding_deliverables: o.prewedding_deliverables || '', family_detail: o.family_detail || '',
          st_selection: !!o.st_selection, st_invitation: !!o.st_invitation, st_data: !!o.st_data,
          st_delivery: !!o.st_delivery, st_desining: !!o.st_desining, st_printing: !!o.st_printing,
          st_dvd_pendrive: !!o.st_dvd_pendrive, st_done: !!o.st_done, st_reels: !!o.st_reels,
          desining_opt: o.desining_opt || '', printing_opt: o.printing_opt || '', dvd_opt: o.dvd_opt || '',
        });
        setItems((o.items || []).map(it => ({
          function_date: it.function_date?.slice(0,10) || '', item_name: it.item_name || it.item_name_snap || '',
          event_name: it.event_name || '', qnty: Number(it.qnty ?? it.box_qty) || 0,
          rate: Number(it.rate) || 0, total: Number(it.total) || 0,
        })));
      }).catch(() => setErr('Failed to load order'));
    } else {
      api.get('/studio-orders/next-no').then(r => setForm(f => ({ ...f, order_no: `STU-${String(r.data.next).padStart(3,'0')}` }))).catch(() => {});
    }
  }, [id, isEdit]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const chk = k => e => setForm(f => ({ ...f, [k]: e.target.checked }));

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

  const subTotal   = items.reduce((s, it) => s + Number(it.total || 0), 0);
  const grandTotal = Math.max(0, subTotal - Number(form.discount || 0));
  const pending    = Math.max(0, grandTotal - Number(form.advance || 0));

  const buildBody = () => ({
    ...form, items,
    discount: Number(form.discount || 0), advance: Number(form.advance || 0),
    quo_no: form.quo_no ? Number(form.quo_no) : null,
  });

  const save = useCallback(async () => {
    if (!form.cust_name.trim()) { setErr('Customer name required'); return; }
    if (items.length === 0) { setErr('Add at least one item'); return; }
    setSaving(true); setErr('');
    try {
      if (isEdit) await api.put(`/studio-orders/${id}`, buildBody());
      else await api.post('/studio-orders', buildBody());
      nav('/studio-orders');
    } catch (ex) { setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, items, isEdit, id]);

  const remove = async () => {
    if (!isEdit) return nav('/studio-orders');
    if (!confirm('Delete this order?')) return;
    await api.delete(`/studio-orders/${id}`);
    nav('/studio-orders');
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const doPrint = (withRate) => {
    const rows = items.map(it => `
      <tr><td>${fmt(it.function_date)}</td><td>${it.item_name}</td><td>${it.event_name || ''}</td>
      <td style="text-align:center">${it.qnty}</td>
      ${withRate ? `<td style="text-align:right">${cur(it.rate)}</td><td style="text-align:right">${cur(it.total)}</td>` : ''}
      </tr>`).join('');
    const totalsBlock = withRate ? `
      <table class="tot"><tbody>
        <tr><td>Sub Total</td><td style="text-align:right">${cur(subTotal)}</td></tr>
        <tr><td>Discount</td><td style="text-align:right">${cur(form.discount)}</td></tr>
        <tr><td>Advance</td><td style="text-align:right">${cur(form.advance)}</td></tr>
        <tr class="grand"><td>Grand Total</td><td style="text-align:right">${cur(grandTotal)}</td></tr>
        <tr><td>Pending</td><td style="text-align:right">${cur(pending)}</td></tr>
      </tbody></table>` : '';
    const w = window.open('', '_blank', 'width=800,height=900');
    w.document.write(`<!doctype html><html><head><title>Studio Order ${form.order_no}</title>
      <style>body{font-family:Arial,sans-serif;color:#111;padding:28px;font-size:13px}
      h1{font-size:20px;margin:0 0 4px}.muted{color:#555}
      .head{display:flex;justify-content:space-between;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ccc;padding:6px 8px;font-size:12.5px}th{background:#eef2ff;text-align:left}
      .tot{width:300px;margin-left:auto;margin-top:12px}.tot td{border:none;padding:4px 8px}
      .grand{font-weight:700;border-top:1px solid #ccc}.note{margin-top:16px;white-space:pre-wrap}</style></head><body>
      <div class="head"><div><h1>Studio Order</h1>
      <div class="muted">Order No: ${form.order_no} &nbsp; Date: ${fmt(form.order_date)} &nbsp; Delivery: ${fmt(form.delivery_date)}</div></div>
      <div style="text-align:right"><div><b>${form.cust_name || ''}</b></div>
      <div class="muted">${form.couple_name || ''}</div><div class="muted">${form.mob_no || ''}</div></div></div>
      <table><thead><tr><th>Date</th><th>Item Name</th><th>Event</th><th style="text-align:center">Qnty</th>
      ${withRate ? '<th style="text-align:right">Rate</th><th style="text-align:right">Total</th>' : ''}</tr></thead>
      <tbody>${rows}</tbody></table>${totalsBlock}
      ${form.remark ? `<div class="note"><b>Remark:</b> ${form.remark}</div>` : ''}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  const digits = (form.mob_no || '').replace(/\D/g, '');
  const shareText = encodeURIComponent(
    `Studio Order ${form.order_no}\nCustomer: ${form.cust_name}\nGrand Total: ${cur(grandTotal)}\nAdvance: ${cur(form.advance)}\nPending: ${cur(pending)}`);
  const openWhatsApp = () => window.open(`https://wa.me/${digits ? '91'+digits : ''}?text=${shareText}`, '_blank');
  const openSMS   = () => { window.location.href = `sms:${digits}?body=${shareText}`; };
  const openEmail = () => { window.location.href = `mailto:?subject=${encodeURIComponent('Studio Order '+form.order_no)}&body=${shareText}`; };

  const STATUS = [
    ['st_selection','Selection'], ['st_invitation','Invitation'], ['st_data','Data'], ['st_delivery','Delivery'],
    ['st_desining','Desining'], ['st_printing','Printing'], ['st_dvd_pendrive','DVD/Pendrive'],
    ['st_done','Done'], ['st_reels','Reels'],
  ];

  return (
    <div className="page-container quotation-form">
      <div className="page-header">
        <div>
          <h1 className="page-title">Studio Order Book</h1>
          <p className="page-subtitle">{isEdit ? `Editing ${form.order_no}` : `New — ${form.order_no}`}</p>
        </div>
      </div>

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="page-cols" style={{ gridTemplateColumns: '2.4fr 1fr' }}>
        <div className="card">
          <div className="card-body form-grid">
            <div className="form-group"><label>Order No</label>
              <input value={form.order_no} readOnly style={{ background: '#eff6ff', fontWeight: 700 }} /></div>
            <div className="form-group"><label>Date</label>
              <input type="date" value={form.order_date} onChange={set('order_date')} /></div>
            <div className="form-group"><label>Cust. Name *</label>
              <input value={form.cust_name} onChange={set('cust_name')} required /></div>
            <div className="form-group"><label>Mob No</label>
              <input value={form.mob_no} onChange={set('mob_no')} /></div>
            <div className="form-group"><label>Delivery Date</label>
              <input type="date" value={form.delivery_date} onChange={set('delivery_date')} /></div>
            <div className="form-group"><label>Quo No</label>
              <select value={form.quo_no} onChange={set('quo_no')}>
                <option value="">—</option>
                {quos.map(q => <option key={q.id} value={q.quo_no}>{q.quo_no} — {q.client_name}</option>)}
              </select></div>
            <div className="form-group"><label>Couple</label>
              <input value={form.couple_name} onChange={set('couple_name')} /></div>
            <div className="form-group"><label>Ref</label>
              <input value={form.ref_by} onChange={set('ref_by')} /></div>
            <div className="form-group"><label>Package</label>
              <input value={form.package_name} onChange={set('package_name')} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, status: e.target.value === 'true' }))}>
                <option value="false">Pending</option><option value="true">Done</option>
              </select></div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label>Address</label>
              <input value={form.address} onChange={set('address')} /></div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label>Remark</label>
              <input value={form.remark} onChange={set('remark')} /></div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Order Detail</div></div>
          <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Or.No</th><th>Date</th></tr></thead>
              <tbody>
                {recent.length === 0 && <tr><td colSpan={2} style={{ color: '#9ca3af', padding: 12 }}>None yet</td></tr>}
                {recent.map(r => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/studio-orders/${r.id}`)}>
                    <td><span className="badge badge-blue">{r.order_no}</span></td>
                    <td>{fmt(r.inquiry_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Item entry */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-body">
          <div className="qitem-entry">
            <div className="form-group"><label>Function Date</label>
              <input type="date" value={entry.function_date} onChange={e => setE('function_date', e.target.value)} /></div>
            <div className="form-group" style={{ flex: 2 }}><label>Item Name</label>
              <input list="stu-item-list" value={entry.item_name} onChange={e => onPickItem(e.target.value)} placeholder="Select item…" />
              <datalist id="stu-item-list">{itemList.map(it => <option key={it.id} value={it.item_name} />)}</datalist></div>
            <div className="form-group" style={{ flex: 1.4 }}><label>Event Name</label>
              <input list="stu-event-list" value={entry.event_name} onChange={e => setE('event_name', e.target.value)} placeholder="Event…" />
              <datalist id="stu-event-list">{(eventList.length ? eventList : EVENTS).map(ev => <option key={ev} value={ev} />)}</datalist></div>
            <div className="form-group" style={{ width: 80 }}><label>Qnty</label>
              <input type="number" min={0} value={entry.qnty} onChange={e => setE('qnty', e.target.value)} /></div>
            <div className="form-group" style={{ width: 110 }}><label>Rate</label>
              <input type="number" min={0} step="0.01" value={entry.rate} onChange={e => setE('rate', e.target.value)} /></div>
            <div className="form-group" style={{ width: 120 }}><label>Total</label>
              <input value={cur(entry.total)} readOnly style={{ background: '#f9fafb', fontWeight: 600 }} /></div>
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
          <div className="table-wrap" style={{ minHeight: 200 }}>
            <table className="data-table">
              <thead><tr>
                <th>Date</th><th>Item Name</th><th>Event</th><th style={{ textAlign: 'center' }}>Qnty</th>
                <th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Total</th><th></th>
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
              <div className="summary-row"><span>Discount</span>
                <input type="number" min={0} value={form.discount} onChange={set('discount')}
                  style={{ width: 120, textAlign: 'right', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} /></div>
              <div className="summary-row"><span style={{ color: '#dc2626', fontWeight: 600 }}>Advance</span>
                <input type="number" min={0} value={form.advance} onChange={set('advance')}
                  style={{ width: 120, textAlign: 'right', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} /></div>
              <div className="summary-row" style={{ fontSize: 15 }}>
                <strong>Grand Total</strong><strong style={{ color: '#2563eb' }}>{cur(grandTotal)}</strong></div>
              <div className="summary-row" style={{ borderBottom: 'none' }}><span>Payment</span>
                <select value={form.payment_mode} onChange={set('payment_mode')} className="form-select" style={{ width: 130 }}>
                  {PAYMENTS.map(p => <option key={p}>{p}</option>)}
                </select></div>
            </div>
            <div className="summary-row" style={{ padding: '8px 0 0', color: pending > 0 ? '#dc2626' : '#16a34a' }}>
              <span>Pending</span><strong>{cur(pending)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Deliverables + workflow */}
      <div className="page-cols" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="checkbox-row" style={{ color: '#dc2626', fontWeight: 600 }}>
              <input type="checkbox" checked={form.display_staff_expenses} onChange={chk('display_staff_expenses')} />
              <span>Display Staff And Expenses</span>
            </label>
            <button type="button" className="btn btn-outline" onClick={() => setPanel(p => p==='final'?'':'final')}>Final Delivery &amp; Post Production</button>
            {panel==='final' && <textarea rows={3} value={form.final_delivery_notes} onChange={set('final_delivery_notes')} />}
            <button type="button" className="btn btn-outline" onClick={() => setPanel(p => p==='pre'?'':'pre')}>Album / Print Deliverables</button>
            {panel==='pre' && <textarea rows={3} value={form.prewedding_deliverables} onChange={set('prewedding_deliverables')} />}
            <button type="button" className="btn btn-outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => setPanel(p => p==='family'?'':'family')}>Family Detail</button>
            {panel==='family' && <textarea rows={3} value={form.family_detail} onChange={set('family_detail')} />}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Status</div></div>
          <div className="card-body">
            <div className="checkbox-grid">
              {STATUS.map(([k, label]) => (
                <label className="checkbox-row" key={k}>
                  <input type="checkbox" checked={form[k]} onChange={chk(k)} /><span>{label}</span>
                </label>
              ))}
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="form-group"><label>Desining</label><input value={form.desining_opt} onChange={set('desining_opt')} /></div>
              <div className="form-group"><label>Printing</label><input value={form.printing_opt} onChange={set('printing_opt')} /></div>
              <div className="form-group"><label>DVD / Pendrive</label><input value={form.dvd_opt} onChange={set('dvd_opt')} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="quotation-actions">
        <button className="btn btn-primary" onClick={save} disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save'}</button>
        <button className="btn btn-danger"  onClick={remove}><Trash2 size={15} /> Delete</button>
        <button className="btn btn-outline" onClick={() => doPrint(true)}><Printer size={15} /> With Rate</button>
        <button className="btn btn-outline" onClick={() => doPrint(false)}><Printer size={15} /> Without Rate</button>
        <button className="btn btn-ghost"   onClick={() => nav('/studio-orders')}><X size={15} /> Cancel</button>
        <button className="btn btn-ghost"   onClick={() => nav('/studio-orders')}><LogOut size={15} /> Exit</button>
        <button className="btn btn-outline" onClick={openSMS}><MessageSquare size={15} /> Send SMS</button>
        <button className="btn btn-outline" onClick={openWhatsApp}><Send size={15} /> WhatsApp</button>
        <button className="btn btn-outline" onClick={openEmail}><Mail size={15} /> Send Email</button>
      </div>
    </div>
  );
}
