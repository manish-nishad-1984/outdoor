import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OutdoorOrders from './pages/outdoor/OutdoorOrders';
import OutdoorOrderForm from './pages/outdoor/OutdoorOrderForm';
import StudioOrders from './pages/studio/StudioOrders';
import StudioOrderForm from './pages/studio/StudioOrderForm';
import Quotations from './pages/quotations/Quotations';
import QuotationForm from './pages/quotations/QuotationForm';
import Sales from './pages/finance/Sales';
import Purchases from './pages/finance/Purchases';
import Payments from './pages/finance/Payments';
import OutdoorPayment from './pages/finance/OutdoorPayment';
import Accounts from './pages/finance/Accounts';
import Receipts from './pages/finance/Receipts';
import DesignJobs from './pages/production/DesignJobs';
import Exposing from './pages/production/Exposing';
import HireOrders from './pages/production/HireOrders';
import Employees from './pages/hr/Employees';
import Attendance from './pages/hr/Attendance';
import Payroll from './pages/hr/Payroll';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Bookings from './pages/bookings/Bookings';
import SaleForm from './pages/finance/SaleForm';
import ItemMaster from './pages/masters/ItemMaster';
import StubPage from './pages/StubPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />

            {/* Outdoor Orders */}
            <Route path="outdoor-orders" element={<OutdoorOrders />} />
            <Route path="outdoor-orders/new" element={<OutdoorOrderForm />} />
            <Route path="outdoor-orders/:id" element={<OutdoorOrderForm />} />

            {/* Studio Orders */}
            <Route path="studio-orders" element={<StudioOrders />} />
            <Route path="studio-orders/new" element={<StudioOrderForm />} />
            <Route path="studio-orders/:id" element={<StudioOrderForm />} />

            {/* Quotations & Bookings */}
            <Route path="quotations" element={<Quotations />} />
            <Route path="quotations/new" element={<QuotationForm />} />
            <Route path="quotations/:id" element={<QuotationForm />} />
            <Route path="bookings" element={<Bookings />} />

            {/* Finance */}
            <Route path="sales" element={<Sales />} />
            <Route path="sales/new" element={<SaleForm />} />
            <Route path="sales/:id" element={<SaleForm />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="receipts" element={<Receipts />} />
            <Route path="payments" element={<Payments />} />
            <Route path="outdoor-payments" element={<OutdoorPayment />} />
            <Route path="accounts" element={<Accounts />} />

            {/* Production */}
            <Route path="design-jobs" element={<DesignJobs />} />
            <Route path="exposing" element={<Exposing />} />
            <Route path="hire-orders" element={<HireOrders />} />

            {/* HR */}
            <Route path="employees" element={<Employees />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="payroll" element={<Payroll />} />

            {/* Reports & Settings */}
            <Route path="items" element={<ItemMaster />} />

            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
