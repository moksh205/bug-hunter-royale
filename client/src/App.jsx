// ============================================================
//  App - decides which page shows for each URL.
//
//   /login, /register        -> anyone
//   /, /leaderboard          -> logged in (with the top navbar)
//   /battle/:matchId         -> logged in
// ============================================================
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Lobby from './pages/Lobby';
import Leaderboard from './pages/Leaderboard';
import Arena from './pages/Arena';

function App() {
  return (
    // Order matters: SocketProvider needs the token from AuthProvider.
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Everything inside here requires login */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Navbar />}>
                <Route path="/" element={<Lobby />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/battle/:matchId" element={<Arena />} />
              </Route>
            </Route>

            {/* Unknown URL -> go home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
