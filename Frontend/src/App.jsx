import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider }        from './context/AuthContext';
import { TaskProvider }        from './context/TaskContext';
import { AdminProvider }       from './context/AdminContext';
import TaskRealtimeProvider    from './realtime/TaskRealtimeProvider';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import AppLayout        from './components/AppLayout';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import DashboardPage    from './pages/DashboardPage';
import MyTasksPage      from './pages/MyTasksPage';
import DueSoonPage      from './pages/DueSoonPage';
import CategoriesPage   from './pages/CategoriesPage';
import AuditLogPage     from './pages/AuditLogPage';
import ExportImportPage from './pages/ExportImportPage';
import ProfilePage      from './pages/ProfilePage';
import AdminPage        from './pages/AdminPage';
import UserProfilePage  from './pages/UserProfilePage';
import NotFoundPage     from './pages/NotFoundPage';

function AppInner() {
  return (
    // AdminProvider must be inside AuthProvider (needs useAuth) and
    // around TaskRealtimeProvider (so it can receive the connection).
    <TaskProvider>
      <AdminProvider>
        <TaskRealtimeProvider>
          <Toaster position="top-right" toastOptions={{
            duration: 3500,
            style: {
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
              padding: '10px 14px', borderRadius: '10px',
              border: '0.5px solid #e5e7eb',
            },
            success: { iconTheme: { primary: '#1D9E75', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#E24B4A', secondary: '#fff' } },
          }} />

          <Routes>
            <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"        element={<DashboardPage />} />
              <Route path="/tasks"            element={<MyTasksPage />} />
              <Route path="/due-soon"         element={<DueSoonPage />} />
              <Route path="/categories"       element={<CategoriesPage />} />
              <Route path="/audit-log"        element={<AuditLogPage />} />
              <Route path="/export"           element={<ExportImportPage />} />
              <Route path="/profile"          element={<ProfilePage />} />
              <Route path="/admin"            element={<AdminPage />} />
              {/* Public user profiles — admin profiles are blocked server-side */}
              <Route path="/users/:id"        element={<UserProfilePage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </TaskRealtimeProvider>
      </AdminProvider>
    </TaskProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
}
