import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Fix 3: ProtectedRoute waits for auth to resolve ───────────────────────
// The root cause of the login-flash is rendering a redirect while loading=true.
// We must show nothing (or a spinner) until AuthProvider has finished the
// /auth/refresh call and we know for certain whether the user is logged in.

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still waiting for /auth/refresh to complete — render nothing.
  // This prevents the flash-to-login that happens when:
  //   1. Page loads, _accessToken is null (in-memory, lost on reload)
  //   2. ProtectedRoute renders, sees user=null, redirects to /login
  //   3. /auth/refresh completes 200ms later, redirects back to dashboard
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
      }}>
        <div style={{
          width: 28,
          height: 28,
          border: '2px solid #e5e7eb',
          borderTopColor: '#378ADD',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // Auth resolved — user is not logged in
  if (!user) {
    // Pass the attempted URL so login page can redirect back after success
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role
  if (adminOnly && user.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  // Same guard — don't redirect to dashboard until we know the user exists
  if (loading) return null;

  // Already logged in — send to dashboard
  if (user) return <Navigate to="/dashboard" replace />;

  return children;
}
