import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Camera, Wallet, CheckCircle2, Clock, TrendingUp, Zap, FileText,
  Receipt, ClipboardList, BarChart2, ArrowUpRight
} from 'lucide-react';
import api from '../api/axios';

const chartData = [
  { month: 'Jan', revenue: 38000 }, { month: 'Feb', revenue: 42000 },
  { month: 'Mar', revenue: 51000 }, { month: 'Apr', revenue: 46000 },
  { month: 'May', revenue: 58000 }, { month: 'Jun', revenue: 72000 },
];

const STATS = [
  { key: 'orders',   label: 'Monthly Orders',  sub: 'This month',          icon: Camera,      grad: 'from-orange-400 to-orange-600' },
  { key: 'revenue',  label: 'Monthly Revenue', sub: 'Sales invoiced',      icon: Wallet,      grad: 'from-emerald-400 to-emerald-600' },
  { key: 'collected',label: 'Collected',       sub: 'Receipts this month', icon: CheckCircle2,grad: 'from-blue-400 to-blue-600' },
  { key: 'pending',  label: 'Pending Amount',  sub: 'Outstanding',         icon: Clock,       grad: 'from-rose-400 to-rose-600' },
];

const QUICK_LINKS = [
  { to: '/outdoor-orders/new', label: 'New Outdoor Order', icon: Camera,        primary: true },
  { to: '/sales/new',          label: 'New Sales Invoice', icon: FileText },
  { to: '/receipts',           label: 'Add Receipt',       icon: Receipt },
  { to: '/quotations/new',     label: 'New Quotation',     icon: ClipboardList },
  { to: '/reports',            label: 'View Reports',      icon: BarChart2 },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/reports/dashboard').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const fmt = n => n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`;
  const values = {
    orders: stats?.orders?.total ?? '—',
    revenue: stats ? fmt(stats.monthly_sales) : '—',
    collected: stats ? fmt(stats.monthly_receipts) : '—',
    pending: stats ? fmt(stats.pending_amount) : '—',
  };

  const statusItems = [
    { label: 'In Progress', value: stats?.orders?.in_progress ?? 0, pct: 45, bar: 'bg-orange-500' },
    { label: 'Delivered',   value: stats?.orders?.delivered ?? 0,   pct: 75, bar: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div
            key={s.key}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${s.grad} opacity-10`} />
            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.grad} text-white shadow-sm`}>
              <s.icon size={20} strokeWidth={2} />
            </div>
            <div className="mt-4 text-[11.5px] font-medium uppercase tracking-wide text-slate-500">{s.label}</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{values[s.key]}</div>
            <div className="mt-1 text-[11.5px] text-slate-400">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        {/* Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
              <TrendingUp size={17} className="text-orange-500" />
              Monthly Revenue
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">2026</span>
          </div>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={v => `₹${v/1000}k`} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12.5, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}
                  formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[8,8,0,0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
              <Zap size={17} className="text-blue-500" />
              Quick Actions
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              {QUICK_LINKS.map(q => (
                <Link
                  key={q.to}
                  to={q.to}
                  className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium no-underline transition-colors ${
                    q.primary
                      ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <q.icon size={16} className={q.primary ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'} />
                  <span className="flex-1">{q.label}</span>
                  <ArrowUpRight size={14} className={`opacity-0 transition-opacity group-hover:opacity-100 ${q.primary ? 'text-white' : 'text-slate-400'}`} />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
              <BarChart2 size={17} className="text-purple-500" />
              Order Status
            </div>
            <div className="mt-4 flex flex-col gap-4">
              {statusItems.map(item => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[12.5px] text-slate-600">{item.label}</span>
                    <span className="text-[12.5px] font-bold text-slate-800">{item.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.bar} transition-all`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
