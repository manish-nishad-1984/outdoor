import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import api from '../../api/axios';

export default function StudioOrderForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState({ customer_name:'', customer_contact:'', order_date:'', delivery_date:'', gross_total:'', status:false });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (id) {
      api.get(`/studio-orders/${id}`).then(r => {
        const d = r.data;
        setForm({
          customer_name: d.customer_address||'',
          customer_contact: d.customer_contact||'',
          order_date: d.inquiry_date ? d.inquiry_date.slice(0,10) : '',
          delivery_date: d.delivery_date ? d.delivery_date.slice(0,10) : '',
          gross_total: d.gross_total||'',
          status: d.status||false
        });
      });
    }
  }, [id]);

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));

  const save = async (e) => {
    e.preventDefault();
    if (!form.customer_name) return setError('Customer name is required');
    setSaving(true); setError('');
    try {
      if (id) await api.put(`/studio-orders/${id}`, form);
      else await api.post('/studio-orders', form);
      nav('/studio-orders');
    } catch(err){ setError(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost" onClick={() => nav('/studio-orders')}><ArrowLeft size={16}/> Back</button>
          <h1 className="page-title" style={{marginTop:8}}>{id ? 'Edit Studio Order' : 'New Studio Order'}</h1>
        </div>
      </div>
      <div className="card" style={{maxWidth:600}}>
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={save} className="form-grid">
            <div className="form-group">
              <label>Customer Name *</label>
              <input value={form.customer_name} onChange={set('customer_name')} required />
            </div>
            <div className="form-group">
              <label>Contact</label>
              <input value={form.customer_contact} onChange={set('customer_contact')} />
            </div>
            <div className="form-group">
              <label>Order Date</label>
              <input type="date" value={form.order_date} onChange={set('order_date')} />
            </div>
            <div className="form-group">
              <label>Delivery Date</label>
              <input type="date" value={form.delivery_date} onChange={set('delivery_date')} />
            </div>
            <div className="form-group">
              <label>Amount (₹)</label>
              <input type="number" value={form.gross_total} onChange={set('gross_total')} />
            </div>
            {id && (
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value==='true'}))}>
                  <option value="false">Pending</option>
                  <option value="true">Delivered</option>
                </select>
              </div>
            )}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={15}/> {saving ? 'Saving…' : 'Save Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
