import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import DataGrid, { formatCurrency } from '../../components/grid/DataGrid';

const COLUMNS = [
  { key: 'order_no', header: 'Order #', width: 96, cell: o => <span className="dg-link">#{o.order_no}</span> },
  { key: 'event_date', header: 'Date', width: 110, format: 'date' },
  { key: 'party_name', header: 'Client', width: 230, strong: true },
  { key: 'party_mobile', header: 'Mobile', width: 130 },
  { key: 'event_type', header: 'Event Type', width: 140, hidden: true,
    cell: o => (o.event_type ? <span className="badge badge-blue">{o.event_type}</span> : '—') },
  { key: 'photographer_name', header: 'Photographer', width: 150, hidden: true },
  { key: 'amount', header: 'Amount', width: 120, format: 'currency', total: 'sum', strong: true },
  { key: 'advance', header: 'Advance', width: 120, format: 'currency', total: 'sum',
    cell: o => <span className="dg-pos">{formatCurrency(o.advance)}</span> },
  { key: 'total_pending', header: 'Pending', width: 120, format: 'currency', total: 'sum',
    cell: o => <span className={Number(o.total_pending) > 0 ? 'dg-neg' : 'dg-pos'}>{formatCurrency(o.total_pending)}</span> },
];

export default function OutdoorOrders() {
  const nav = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/outdoor-orders', { params: { limit: 5000 } })
      .then(r => setData(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async id => {
    if (!confirm('Delete this order?')) return;
    await api.delete(`/outdoor-orders/${id}`);
    load();
  };

  const totalAmt  = data.reduce((s, d) => s + Number(d.amount || 0), 0);
  const totalAdv  = data.reduce((s, d) => s + Number(d.advance || 0), 0);
  const totalPend = data.reduce((s, d) => s + Number(d.total_pending || 0), 0);

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{data.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value">{formatCurrency(totalAmt)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Advance Received</div>
          <div className="stat-value">{formatCurrency(totalAdv)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Amount</div>
          <div className={`stat-value ${totalPend > 0 ? 'dg-neg' : 'dg-pos'}`}>{formatCurrency(totalPend)}</div>
        </div>
      </div>

      <DataGrid
        id="outdoor-orders"
        columns={COLUMNS}
        data={data}
        loading={loading}
        defaultSort={[{ id: 'order_no', desc: true }]}
        searchPlaceholder="Search order no, client, mobile…"
        emptyText="No orders yet"
        onRowClick={o => nav(`/outdoor-orders/${o.id}`)}
        rowActions={o => <>
          <button type="button" className="dg-act" title="Edit" onClick={() => nav(`/outdoor-orders/${o.id}`)}><Pencil size={15} /></button>
          <button type="button" className="dg-act del" title="Delete" onClick={() => del(o.id)}><Trash2 size={15} /></button>
        </>}
        toolbar={<button type="button" className="btn btn-primary" onClick={() => nav('/outdoor-orders/new')}><Plus size={16} /> New Order</button>}
      />
    </div>
  );
}
