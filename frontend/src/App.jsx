import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OutdoorOrders from './pages/outdoor/OutdoorOrders';
import OutdoorOrderForm from './pages/outdoor/OutdoorOrderForm';
import Sales from './pages/finance/Sales';
import Receipts from './pages/finance/Receipts';
import Employees from './pages/hr/Employees';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
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
            <Route path="studio-orders" element={<StubPage title="Studio Orders" />} />
            <Route path="studio-orders/new" element={<StubPage title="New Studio Order" />} />

            {/* Quotations & Bookings */}
            <Route path="quotations" element={<StubPage title="Quotations" />} />
            <Route path="bookings" element={<StubPage title="Bookings" />} />

            {/* Finance */}
            <Route path="sales" element={<Sales />} />
            <Route path="sales/new" element={<StubPage title="New Sale Invoice" />} />
            <Route path="sales/:id" element={<StubPage title="Sale Detail" />} />
            <Route path="purchases" element={<StubPage title="Purchases" />} />
            <Route path="receipts" element={<Receipts />} />
            <Route path="payments" element={<StubPage title="Payments" />} />
            <Route path="accounts" element={<StubPage title="Accounts" />} />

            {/* Production */}
            <Route path="design-jobs" element={<StubPage title="Design Jobs" />} />
            <Route path="exposing" element={<StubPage title="Exposing / Printing" />} />
            <Route path="hire-orders" element={<StubPage title="Hire Orders" />} />

            {/* HR */}
            <Route path="employees" element={<Employees />} />
            <Route path="attendance" element={<StubPage title="Attendance" />} />
            <Route path="payroll" element={<StubPage title="Payroll" />} />

            {/* Reports & Settings */}
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
