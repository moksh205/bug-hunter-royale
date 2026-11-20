// ============================================================
//  ProtectedRoute - a "bouncer" for pages that need login.
//    - still checking the saved token -> show a loader
//    - not logged in                  -> send to /login
//    - logged in                      -> show the page (<Outlet />)
// ============================================================
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-mist">Loading…</div>;
  }

  if (!user) {
    // Remember where they wanted to go, so Login can send them back there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
