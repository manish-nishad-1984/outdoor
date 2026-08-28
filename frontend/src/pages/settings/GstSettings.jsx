import { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import api from '../../api/axios';

// Web port of legacy FrmVatSettings.vb (on-screen header: "GST Settings").
// Legacy PDISC/PAVAT fields (Visible=False in the designer, never shown to the user)
// are stored server-side for schema parity with other legacy forms but not rendered here.
const DEFAULTS = { raw_purchase_gst: 4, purchase_gst: 0, sale_gst: 4, outdoor_gst: 1 };
const EMPTY = { ...DEFAULTS, purchase_disc: 0, purchase_additional_gst: 1 };

const FIELDS = [
  ['raw_purchase_gst', 'Raw Purchase GST'],
  ['sale_gst', 'Sale GST'],
  ['outdoor_gst', 'OutDoor GST'],
  ['purchase_gst', 'Purchase GST'],
];

export default function GstSettings() {
  const [form, setForm]       = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  useEffect(() => {
    api.get('/gst-settings').then(r => {
      setForm(f => ({ ...f, ...r.data }));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const persist = async next => {
    setSaving(true); setMsg('');
    try {
      const r = await api.put('/gst-settings', next);
      setForm(f => ({ ...f, ...r.data }));
      setMsg('success:Settings saved');
    } catch (ex) { setMsg(`error:${ex.response?.data?.error || 'Save failed'}`); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  const save = e => { e.preventDefault(); persist(form); };

  const resetDefaults = () => {
    const next = { ...form, ...DEFAULTS };
    setForm(next);
    persist(next);
  };

  if (loading) return <div className="page-container"><div className="table-loading">Loading…</div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">GST Settings</h1>
          <p className="page-subtitle">Default GST rates used across purchase, sale &amp; outdoor transactions</p>
        </div>
      </div>

      <form onSubmit={save}>
        {msg && (
          <div className={`alert ${msg.startsWith('error:') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
            {msg.replace(/^(error|success):/, '')}
          </div>
        )}

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">GST Rates</div></div>
          <div className="card-body form-grid">
            {FIELDS.map(([key, label]) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" step="0.01" min="0" value={form[key]} onChange={set(key)} style={{ flex: 1 }} />
                  <span style={{ color: '#6b7280', fontSize: 13 }}>%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <button type="button" className="btn btn-outline" disabled={saving} onClick={resetDefaults}>
            <RotateCcw size={15} /> Default Settings
          </button>
        </div>
      </form>
    </div>
  );
}
