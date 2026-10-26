import { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../../api/axios';
import DataGrid from '../../components/grid/DataGrid';

const COLUMNS = [
  { key: 'booking_no', header: 'Booking No', width: 120, cell: r => <span className="dg-link">{r.booking_no}</span> },
  { key: 'party_name', header: 'Party', width: 240, strong: true },
  { key: 'inquiry_date', header: 'Date', width: 110, format: 'date' },
  { key: 'gross_total', header: 'Gross Total', width: 130, format: 'currency', total: 'sum', strong: true },
  { key: 'discount_rs', header: 'Discount', width: 120, format: 'currency', total: 'sum' },
];

export default function Purchases() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/purchases', { params: { limit: 5000 } });
      setRows(r.data.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!confirm('Delete purchase?')) return;
    await api.delete(`/purchases/${id}`); load();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">{rows.length} total purchases</p>
        </div>
      </div>
      <DataGrid
        id="purchases"
        columns={COLUMNS}
        data={rows}
        loading={loading}
        defaultSort={[{ id: 'inquiry_date', desc: true }]}
        searchPlaceholder="Search booking no, party…"
        emptyText="No purchases found"
        actionsWidth={56}
        rowActions={r => (
          <button type="button" className="dg-act del" title="Delete" onClick={() => del(r.id)}><Trash2 size={15} /></button>
        )}
      />
    </div>
  );
}
