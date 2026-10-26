import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Printer } from 'lucide-react';
import api from '../../api/axios';
import DataGrid, { formatCurrency } from '../../components/grid/DataGrid';

const pendingOf = s => Number(s.net_amount || 0) - Number(s.amount_received || 0);
const statusOf = s => {
  const received = Number(s.amount_received || 0);
  const pending = pendingOf(s);
  return pending <= 0 ? { cls: 'badge-green', label: 'Paid' } : received > 0 ? { cls: 'badge-orange', label: 'Partial' } : { cls: 'badge-red', label: 'Due' };
};

const COLUMNS = [
  { key: 'invoice_no', header: 'Invoice #', width: 110, cell: s => <span className="dg-link">{s.invoice_no}</span> },
  { key: 'party_name', header: 'Client', width: 220, strong: true },
  { key: 'sale_date', header: 'Date', width: 110, format: 'date' },
  { key: 'gross_amount', header: 'Gross', width: 120, format: 'currency', total: 'sum' },
  { key: 'discount', header: 'Discount', width: 110, format: 'currency', total: 'sum',
    cell: s => <span className="dg-neg">{formatCurrency(s.discount)}</span> },
  { key: 'net_amount', header: 'Net Total', width: 130, format: 'currency', total: 'sum', strong: true },
  { key: 'amount_received', header: 'Received', width: 120, format: 'currency', total: 'sum',
    cell: s => <span className="dg-pos">{formatCurrency(s.amount_received)}</span> },
  { key: 'pending', header: 'Pending', width: 120, format: 'currency', total: 'sum', value: pendingOf,
    cell: s => <span className={pendingOf(s) > 0 ? 'dg-neg' : 'dg-pos'}>{formatCurrency(pendingOf(s))}</span> },
  { key: 'status', header: 'Status', width: 110, value: s => statusOf(s).label,
    cell: s => { const st = statusOf(s); return <span className={`badge ${st.cls}`}><span className="badge-dot" />{st.label}</span>; } },
];

export default function Sales() {
  const nav = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/sales', { params: { limit: 5000 } })
      .then(r => setData(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const received = data.reduce((s, d) => s + Number(d.amount_received || 0), 0);
  const pending  = data.reduce((s, d) => s + Math.max(0, pendingOf(d)), 0);

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon green">💰</div><div><div className="stat-label">Total Sales</div><div className="stat-value">{data.length}</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">✅</div><div><div className="stat-label">Received</div><div className="stat-value">{formatCurrency(received)}</div></div></div>
        <div className="stat-card"><div className="stat-icon red">⏳</div><div><div className="stat-label">Pending</div><div className="stat-value">{formatCurrency(pending)}</div></div></div>
        <div className="stat-card"><div className="stat-icon orange">🧾</div><div><div className="stat-label">Invoices</div><div className="stat-value">{data.length}</div></div></div>
      </div>

      <DataGrid
        id="sales"
        columns={COLUMNS}
        data={data}
        loading={loading}
        defaultSort={[{ id: 'sale_date', desc: true }]}
        searchPlaceholder="Search invoice, client…"
        emptyText="No sales invoices yet"
        onRowClick={s => nav(`/sales/${s.id}`)}
        rowActions={s => <>
          <button type="button" className="dg-act" title="Edit" onClick={() => nav(`/sales/${s.id}`)}><Pencil size={15} /></button>
          <button type="button" className="dg-act" title="Print"><Printer size={15} /></button>
        </>}
        toolbar={<Link to="/sales/new" className="btn btn-primary">＋ New Sale</Link>}
      />
    </div>
  );
}
