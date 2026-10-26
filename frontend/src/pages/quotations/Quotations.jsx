import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Pencil } from 'lucide-react';
import api from '../../api/axios';
import DataGrid from '../../components/grid/DataGrid';

const COLUMNS = [
  { key: 'quo_no', header: 'Quo No', width: 96, cell: r => <span className="dg-link">#{r.quo_no}</span> },
  { key: 'quo_date', header: 'Date', width: 110, format: 'date' },
  { key: 'client_name', header: 'Client', width: 220, strong: true },
  { key: 'couple_name', header: 'Couple', width: 200 },
  { key: 'contact_no', header: 'Contact', width: 130 },
  { key: 'discount', header: 'Discount', width: 110, format: 'currency', total: 'sum', hidden: true },
  { key: 'grand_total', header: 'Grand Total', width: 130, format: 'currency', total: 'sum', strong: true },
];

export default function Quotations() {
  const nav = useNavigate();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/quotations', { params: { limit: 5000 } });
      setRows(r.data.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!confirm('Delete quotation?')) return;
    await api.delete(`/quotations/${id}`); load();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">Click a row to open it</p>
        </div>
      </div>
      <DataGrid
        id="quotations"
        columns={COLUMNS}
        data={rows}
        loading={loading}
        defaultSort={[{ id: 'quo_no', desc: true }]}
        searchPlaceholder="Search quo no, client, couple, contact…"
        emptyText="No quotations yet"
        onRowClick={r => nav(`/quotations/${r.id}`)}
        rowActions={r => <>
          <button type="button" className="dg-act" title="Edit" onClick={() => nav(`/quotations/${r.id}`)}><Pencil size={15} /></button>
          <button type="button" className="dg-act del" title="Delete" onClick={() => del(r.id)}><Trash2 size={15} /></button>
        </>}
        toolbar={<button type="button" className="btn btn-primary" onClick={() => nav('/quotations/new')}><Plus size={16} /> New Quotation</button>}
      />
    </div>
  );
}
