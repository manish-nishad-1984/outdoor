import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

const EMPTY_ITEM = { description: '', qty: 1, rate: 0, amount: 0 };

export default function OutdoorOrderForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    order_no: '', party_name: '', party_mobile: '', party_address: '',
    event_type: '', event_date: '', event_location: '',
    photographer_name: '', videographer_name: '',
    amount: 0, advance_amount: 0, payment_mode: 'Cash', notes: '',
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (isEdit) {
      api.get(`/outdoor-orders/${id}`).then(r => {
        const o = r.data;
        setForm({
          order_no: o.order_no || '', party_name: o.party_name || '',
          party_mobile: o.party_mobile || '', party_address: o.party_address || '',
          event_type: o.event_type || '', event_date: o.event_date?.slice(0,10) || '',
          event_location: o.event_location || '', photographer_name: o.photographer_name || '',
          videographer_name: o.videographer_name || '',
          amount: o.amount || 0, advance_amount: o.advance_amount || 0,
          payment_mode: o.payment_mode || 'Cash', notes: o.notes || '',
        });
        if (o.items?.length) setItems(o.items);
      });
    }
  }, [id]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const setItem = (i, k, v) => setItems(items => {
    const arr = [...items];
    arr[i] = { ...arr[i], [k]: v };
    if (k === 'qty' || k === 'rate') {
      arr[i].amount = (Number(k === 'qty' ? v : arr[i].qty) * Number(k === 'rate' ? v : arr[i].rate)).toFixed(2);
    }
    return arr;
  });

  const addItem  = () => setItems(i => [...i, { ...EMPTY_ITEM }]);
  const delItem  = i  => setItems(arr => arr.filter((_,x) => x !== i));

  const gross = items.reduce((s,i) => s + Number(i.amount || 0), 0);

  const submit = async e => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const body = { ...form, amount: gross, items };
      if (isEdit) await api.put(`/outdoor-orders/${id}`, body);
      else         await api.post('/outdoor-orders', body);
      nav('/outdoor-orders');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#ef4444' }}>{err}</div>}

      <div className="page-cols">
        {/* Client Info */}
        <div className="card">
          <div className="card-header"><div className="card-title">Client Information</div></div>
          <div className="card-body form-grid">
            <div className="form-group">
              <label>Order No</label>
              <input value={form.order_no} onChange={set('order_no')} placeholder="Auto-generated if blank" />
            </div>
            <div className="form-group">
              <label>Client Name *</label>
              <input required value={form.party_name} onChange={set('party_name')} />
            </div>
            <div className="form-group">
              <label>Mobile</label>
              <input value={form.party_mobile} onChange={set('party_mobile')} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Address</label>
              <input value={form.party_address} onChange={set('party_address')} />
            </div>
          </div>
        </div>

        {/* Event Info */}
        <div className="card">
          <div className="card-header"><div className="card-title">Event Details</div></div>
          <div className="card-body form-grid">
            <div className="form-group">
              <label>Event Type *</label>
              <select required value={form.event_type} onChange={set('event_type')}>
                <option value="">Select…</option>
                {['Wedding','Engagement','Birthday','Baby Shower','Pre-Wedding','Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Event Date</label>
              <input type="date" value={form.event_date} onChange={set('event_date')} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Location</label>
              <input value={form.event_location} onChange={set('event_location')} />
            </div>
            <div className="form-group">
              <label>Photographer</label>
              <input value={form.photographer_name} onChange={set('photographer_name')} />
            </div>
            <div className="form-group">
              <label>Videographer</label>
              <input value={form.videographer_name} onChange={set('videographer_name')} />
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title">Order Items / Services</div>
          <button type="button" className="btn btn-outline btn-sm" onClick={addItem}>＋ Add Row</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Description</th><th style={{ width: 80 }}>Qty</th><th style={{ width: 100 }}>Rate ₹</th><th style={{ width: 100 }}>Amount ₹</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{i+1}</td>
                  <td><input style={{ width: '100%' }} value={it.description} onChange={e => setItem(i,'description',e.target.value)} /></td>
                  <td><input type="number" min={1} value={it.qty} onChange={e => setItem(i,'qty',e.target.value)} /></td>
                  <td><input type="number" min={0} step="0.01" value={it.rate} onChange={e => setItem(i,'rate',e.target.value)} /></td>
                  <td style={{ fontWeight: 600 }}>₹{Number(it.amount).toLocaleString('en-IN')}</td>
                  <td><button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={() => delItem(i)}>✕</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, padding: '10px 12px' }}>Total</td><td style={{ fontWeight: 800, color: '#f97316' }}>₹{gross.toLocaleString('en-IN')}</td><td /></tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><div className="card-title">Payment</div></div>
        <div className="card-body form-grid">
          <div className="form-group">
            <label>Advance Amount</label>
            <input type="number" min={0} value={form.advance_amount} onChange={set('advance_amount')} />
          </div>
          <div className="form-group">
            <label>Payment Mode</label>
            <select value={form.payment_mode} onChange={set('payment_mode')}>
              {['Cash','UPI','Cheque','Card'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Notes</label>
            <textarea rows={3} value={form.notes} onChange={set('notes')} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className="btn btn-outline" onClick={() => nav('/outdoor-orders')}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Update Order' : 'Create Order'}</button>
      </div>
    </form>
  );
}
