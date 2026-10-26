import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, flexRender,
} from '@tanstack/react-table';
import {
  Search, ArrowUp, ArrowDown, ChevronsUpDown, Columns3, Download, Rows3, Rows4,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox, X,
} from 'lucide-react';
import './grid.css';

// Shared list grid (TanStack Table + our own styling). Pages describe columns with a small
// spec instead of TanStack defs:
//   { key, header, width, align: 'right'|'center', format: 'currency'|'number'|'date',
//     value: row => any (defaults to row[key]), cell: row => node, total: 'sum',
//     hidden: true (starts hidden), sortable: false, hideable: false, exportValue: row => any }
// Data is filtered/sorted/paged client-side; the caller fetches the whole list once.
// Per-grid prefs (visible columns, widths, density, page size) persist in localStorage.

const cur = n => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = d => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d)
    : `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
};
const formatValue = (v, format) => {
  if (v == null || v === '') return format === 'currency' || format === 'number' ? (format === 'currency' ? cur(0) : 0) : '—';
  if (format === 'currency') return cur(v);
  if (format === 'number') return Number(v).toLocaleString('en-IN');
  if (format === 'date') return fmtDate(v);
  return v;
};
const isNumeric = f => f === 'currency' || f === 'number';

// Numbers compare numerically, dates chronologically, everything else as natural text.
const smartSort = (a, b, id) => {
  const x = a.getValue(id), y = b.getValue(id);
  if (x == null || x === '') return y == null || y === '' ? 0 : -1;
  if (y == null || y === '') return 1;
  const nx = Number(x), ny = Number(y);
  if (!Number.isNaN(nx) && !Number.isNaN(ny) && typeof x !== 'boolean') return nx - ny;
  return String(x).localeCompare(String(y), 'en', { numeric: true, sensitivity: 'base' });
};

function loadPrefs(id) {
  if (!id) return {};
  try { return JSON.parse(localStorage.getItem(`grid:${id}`)) || {}; } catch { return {}; }
}

export default function DataGrid({
  id, columns, data = [], loading = false, getRowId, onRowClick, rowActions, actionsWidth = 84,
  searchPlaceholder = 'Search…', toolbar, emptyText = 'No records found', exportName,
  pageSizes = [25, 50, 100], defaultSort, rowClassName,
}) {
  const saved = useMemo(() => loadPrefs(id), [id]);
  const [query, setQuery] = useState('');
  const [sorting, setSorting] = useState(saved.sorting || defaultSort || []);
  const [visibility, setVisibility] = useState(() => saved.visibility
    || Object.fromEntries(columns.filter(c => c.hidden).map(c => [c.key, false])));
  const [sizing, setSizing] = useState(saved.sizing || {});
  const [density, setDensity] = useState(saved.density || 'comfortable');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: saved.pageSize || pageSizes[0] });
  const [colMenu, setColMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    try {
      localStorage.setItem(`grid:${id}`, JSON.stringify({ sorting, visibility, sizing, density, pageSize: pagination.pageSize }));
    } catch { /* storage unavailable */ }
  }, [id, sorting, visibility, sizing, density, pagination.pageSize]);

  useEffect(() => {
    if (!colMenu) return;
    const close = e => { if (!menuRef.current?.contains(e.target)) setColMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [colMenu]);

  const valueOf = (c, row) => (c.value ? c.value(row) : row[c.key]);

  // Quick search matches any column's raw or formatted value.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(row => columns.some(c => {
      const v = valueOf(c, row);
      if (v == null) return false;
      return String(v).toLowerCase().includes(q) || String(formatValue(v, c.format)).toLowerCase().includes(q);
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query, columns]);

  useEffect(() => { setPagination(p => ({ ...p, pageIndex: 0 })); }, [query]);

  const defs = useMemo(() => {
    const d = columns.map(c => ({
      id: c.key,
      accessorFn: row => valueOf(c, row),
      header: c.header,
      size: c.width || 150,
      minSize: 56,
      enableSorting: c.sortable !== false,
      enableHiding: c.hideable !== false,
      sortingFn: smartSort,
      sortUndefined: 'last',
      cell: info => (c.cell ? c.cell(info.row.original) : formatValue(info.getValue(), c.format)),
      meta: c,
    }));
    if (rowActions) {
      d.push({
        id: '__actions', header: '', size: actionsWidth, minSize: actionsWidth, enableSorting: false,
        enableHiding: false, enableResizing: false, cell: info => rowActions(info.row.original), meta: { align: 'right', actions: true },
      });
    }
    return d;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, rowActions, actionsWidth]);

  const table = useReactTable({
    data: filtered,
    columns: defs,
    state: { sorting, columnVisibility: visibility, columnSizing: sizing, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    onColumnSizingChange: setSizing,
    onPaginationChange: setPagination,
    getRowId: getRowId || ((row, i) => String(row.id ?? i)),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
    autoResetPageIndex: false,
  });

  // Keep the page index valid when rows disappear (e.g. after a delete).
  const pageCount = table.getPageCount();
  useEffect(() => {
    if (pagination.pageIndex > 0 && pagination.pageIndex >= pageCount) setPagination(p => ({ ...p, pageIndex: Math.max(0, pageCount - 1) }));
  }, [pageCount, pagination.pageIndex]);

  // Flag horizontal overflow so the pinned actions column gets a divider shadow.
  const scrollRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  const visibleCols = table.getVisibleLeafColumns();
  const hasTotals = columns.some(c => c.total);
  const totals = useMemo(() => Object.fromEntries(columns.filter(c => c.total).map(c => [
    c.key, filtered.reduce((s, r) => s + (Number(valueOf(c, r)) || 0), 0),
  ])), [columns, filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    const cols = visibleCols.filter(c => c.id !== '__actions').map(c => c.columnDef.meta);
    const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = table.getSortedRowModel().rows.map(r => cols.map(c => {
      const v = c.exportValue ? c.exportValue(r.original) : valueOf(c, r.original);
      return esc(c.format === 'date' ? fmtDate(v) : v);
    }).join(','));
    const csv = '﻿' + [cols.map(c => esc(c.header)).join(','), ...rows].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${exportName || id || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const { pageIndex, pageSize } = pagination;
  const totalRows = filtered.length;
  const from = totalRows ? pageIndex * pageSize + 1 : 0;
  const to = Math.min(totalRows, (pageIndex + 1) * pageSize);
  const pageRows = table.getRowModel().rows;

  // Up to five page buttons centred on the current page.
  const pageButtons = (() => {
    const n = pageCount, start = Math.max(0, Math.min(pageIndex - 2, n - 5));
    return Array.from({ length: Math.min(5, n) }, (_, i) => start + i);
  })();

  return (
    <div className={`dg dg-${density}`}>
      <div className="dg-toolbar">
        <div className="dg-search">
          <Search size={15} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={searchPlaceholder} />
          {query && <button type="button" onClick={() => setQuery('')} title="Clear"><X size={14} /></button>}
        </div>
        <span className="dg-count">{query ? `${totalRows} of ${data.length}` : `${data.length}`} records</span>
        <div className="dg-tools">
          <button type="button" className="dg-tool" onClick={() => setDensity(d => (d === 'compact' ? 'comfortable' : 'compact'))}
            title={density === 'compact' ? 'Comfortable rows' : 'Compact rows'}>
            {density === 'compact' ? <Rows3 size={16} /> : <Rows4 size={16} />}
          </button>
          <div className="dg-menu-wrap" ref={menuRef}>
            <button type="button" className={`dg-tool${colMenu ? ' on' : ''}`} onClick={() => setColMenu(v => !v)} title="Show / hide columns">
              <Columns3 size={16} /> <span>Columns</span>
            </button>
            {colMenu && (
              <div className="dg-menu">
                {table.getAllLeafColumns().filter(c => c.getCanHide()).map(c => (
                  <label key={c.id}>
                    <input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()} />
                    {c.columnDef.header}
                  </label>
                ))}
                <button type="button" onClick={() => { setVisibility({}); setSizing({}); }}>Reset columns</button>
              </div>
            )}
          </div>
          <button type="button" className="dg-tool" onClick={exportCsv} title="Download as Excel (CSV)">
            <Download size={16} /> <span>Export</span>
          </button>
          {toolbar}
        </div>
      </div>

      <div className={`dg-scroll${overflowing ? ' overflowing' : ''}`} ref={scrollRef}>
        <table className="dg-table" style={{ width: table.getTotalSize() }}>
          <colgroup>{visibleCols.map(c => <col key={c.id} style={{ width: c.getSize() }} />)}</colgroup>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => {
                  const meta = h.column.columnDef.meta || {};
                  const sorted = h.column.getIsSorted();
                  const align = meta.align || (isNumeric(meta.format) ? 'right' : undefined);
                  return (
                    <th key={h.id} className={`${align ? `a-${align}` : ''}${meta.actions ? ' dg-actions' : ''}`}
                      aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {h.column.getCanSort() ? (
                        <button type="button" className={`dg-sort${sorted ? ' on' : ''}`} onClick={h.column.getToggleSortingHandler()}>
                          <span>{flexRender(h.column.columnDef.header, h.getContext())}</span>
                          {sorted === 'asc' ? <ArrowUp size={13} /> : sorted === 'desc' ? <ArrowDown size={13} /> : <ChevronsUpDown size={13} className="idle" />}
                        </button>
                      ) : flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getCanResize() && (
                        <span className={`dg-resizer${h.column.getIsResizing() ? ' on' : ''}`}
                          onMouseDown={h.getResizeHandler()} onTouchStart={h.getResizeHandler()}
                          onDoubleClick={() => h.column.resetSize()} onClick={e => e.stopPropagation()} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading && pageRows.length === 0 && Array.from({ length: 6 }, (_, i) => (
              <tr key={`sk${i}`} className="dg-skel">{visibleCols.map(c => <td key={c.id}><span /></td>)}</tr>
            ))}
            {!loading && pageRows.length === 0 && (
              <tr><td colSpan={visibleCols.length} className="dg-empty">
                <Inbox size={30} /><p>{query ? `Nothing matches “${query}”` : emptyText}</p>
              </td></tr>
            )}
            {pageRows.map(r => (
              <tr key={r.id} className={`${onRowClick ? 'click' : ''} ${rowClassName ? rowClassName(r.original) || '' : ''}`}
                onClick={onRowClick ? () => onRowClick(r.original) : undefined}>
                {r.getVisibleCells().map(cell => {
                  const meta = cell.column.columnDef.meta || {};
                  const align = meta.align || (isNumeric(meta.format) ? 'right' : undefined);
                  return (
                    <td key={cell.id} className={`${align ? `a-${align}` : ''}${isNumeric(meta.format) ? ' num' : ''}${meta.actions ? ' dg-actions' : ''}${meta.strong ? ' strong' : ''}`}
                      onClick={meta.actions ? e => e.stopPropagation() : undefined}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {hasTotals && totalRows > 0 && (
            <tfoot>
              <tr>
                {visibleCols.map((c, i) => {
                  const meta = c.columnDef.meta || {};
                  return (
                    <td key={c.id} className={meta.total ? 'a-right num' : ''}>
                      {meta.total ? formatValue(totals[c.id], meta.format) : i === 0 ? `Total (${totalRows})` : ''}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
        {loading && pageRows.length > 0 && <div className="dg-loading-bar" />}
      </div>

      <div className="dg-foot">
        <span>{totalRows ? `Showing ${from}–${to} of ${totalRows}` : 'No rows'}</span>
        <label className="dg-pagesize">
          Rows
          <select value={pageSize} onChange={e => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}>
            {pageSizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {pageCount > 1 && (
          <div className="dg-pages">
            <button type="button" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} title="First"><ChevronsLeft size={15} /></button>
            <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} title="Previous"><ChevronLeft size={15} /></button>
            {pageButtons.map(p => (
              <button type="button" key={p} className={p === pageIndex ? 'on' : undefined} onClick={() => table.setPageIndex(p)}>{p + 1}</button>
            ))}
            <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} title="Next"><ChevronRight size={15} /></button>
            <button type="button" onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} title="Last"><ChevronsRight size={15} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// Small helpers pages use in their column specs / row actions.
export { cur as formatCurrency, fmtDate as formatDate };
