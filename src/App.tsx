import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './lib/toast';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Truck } from 'lucide-react';

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const VehiclesPage = lazy(() => import('./pages/Vehicles').then((m) => ({ default: m.VehiclesPage })));
const VehicleDetailPage = lazy(() => import('./pages/VehicleDetail').then((m) => ({ default: m.VehicleDetailPage })));
const DriversPage = lazy(() => import('./pages/Drivers').then((m) => ({ default: m.DriversPage })));
const ClientsPage = lazy(() => import('./pages/Clients').then((m) => ({ default: m.ClientsPage })));
const RentalsPage = lazy(() => import('./pages/Rentals').then((m) => ({ default: m.RentalsPage })));
const PlanningPage = lazy(() => import('./pages/Planning').then((m) => ({ default: m.Planning })));
const SalesPage = lazy(() => import('./pages/Sales').then((m) => ({ default: m.SalesPage })));
const MissionsPage = lazy(() => import('./pages/Missions').then((m) => ({ default: m.MissionsPage })));
const MovementsPage = lazy(() => import('./pages/Movements').then((m) => ({ default: m.MovementsPage })));
const MaintenancePage = lazy(() => import('./pages/Maintenance').then((m) => ({ default: m.MaintenancePage })));
const FuelPage = lazy(() => import('./pages/Fuel').then((m) => ({ default: m.FuelPage })));
const InvoicesPage = lazy(() => import('./pages/Invoices').then((m) => ({ default: m.InvoicesPage })));
const PaymentsPage = lazy(() => import('./pages/Payments').then((m) => ({ default: m.PaymentsPage })));
const ExpensesPage = lazy(() => import('./pages/Expenses').then((m) => ({ default: m.ExpensesPage })));
const GpsPage = lazy(() => import('./pages/Gps').then((m) => ({ default: m.GpsPage })));
const EcoDrivingPage = lazy(() => import('./pages/EcoDriving').then((m) => ({ default: m.EcoDriving })));
const IncidentsPage = lazy(() => import('./pages/Incidents').then((m) => ({ default: m.IncidentsPage })));
const NotificationsPage = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));
const AuditPage = lazy(() => import('./pages/Audit').then((m) => ({ default: m.AuditPage })));
const AgenciesPage = lazy(() => import('./pages/Agencies').then((m) => ({ default: m.AgenciesPage })));
const SuppliersPage = lazy(() => import('./pages/Suppliers').then((m) => ({ default: m.SuppliersPage })));
const ReportsPage = lazy(() => import('./pages/Reports').then((m) => ({ default: m.ReportsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFoundPage })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30000 } },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center animate-pulse">
        <Truck className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                  <Route path="/vehicles" element={<Suspense fallback={<PageLoader />}><VehiclesPage /></Suspense>} />
                  <Route path="/vehicles/:id" element={<Suspense fallback={<PageLoader />}><VehicleDetailPage /></Suspense>} />
                  <Route path="/drivers" element={<Suspense fallback={<PageLoader />}><DriversPage /></Suspense>} />
                  <Route path="/clients" element={<Suspense fallback={<PageLoader />}><ClientsPage /></Suspense>} />
                  <Route path="/rentals" element={<Suspense fallback={<PageLoader />}><RentalsPage /></Suspense>} />
                  <Route path="/planning" element={<Suspense fallback={<PageLoader />}><PlanningPage /></Suspense>} />
                  <Route path="/sales" element={<Suspense fallback={<PageLoader />}><SalesPage /></Suspense>} />
                  <Route path="/missions" element={<Suspense fallback={<PageLoader />}><MissionsPage /></Suspense>} />
                  <Route path="/movements" element={<Suspense fallback={<PageLoader />}><MovementsPage /></Suspense>} />
                  <Route path="/maintenance" element={<Suspense fallback={<PageLoader />}><MaintenancePage /></Suspense>} />
                  <Route path="/fuel" element={<Suspense fallback={<PageLoader />}><FuelPage /></Suspense>} />
                  <Route path="/finance/invoices" element={<Suspense fallback={<PageLoader />}><InvoicesPage /></Suspense>} />
                  <Route path="/finance/payments" element={<Suspense fallback={<PageLoader />}><PaymentsPage /></Suspense>} />
                  <Route path="/finance/expenses" element={<Suspense fallback={<PageLoader />}><ExpensesPage /></Suspense>} />
                  <Route path="/gps" element={<Suspense fallback={<PageLoader />}><GpsPage /></Suspense>} />
                  <Route path="/drivers/eco" element={<Suspense fallback={<PageLoader />}><EcoDrivingPage /></Suspense>} />
                  <Route path="/incidents" element={<Suspense fallback={<PageLoader />}><IncidentsPage /></Suspense>} />
                  <Route path="/notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
                  <Route path="/agencies" element={<Suspense fallback={<PageLoader />}><AgenciesPage /></Suspense>} />
                  <Route path="/suppliers" element={<Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense>} />
                  <Route path="/reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
                  <Route path="/audit" element={<Suspense fallback={<PageLoader />}><AuditPage /></Suspense>} />
                  <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
