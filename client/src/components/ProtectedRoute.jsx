import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ children, requireCharacter = false }) {
  const { user, character, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-parchment">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requireCharacter && !character) return <Navigate to="/" replace />;

  return children;
}

export function DMRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-parchment">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'dm') return <Navigate to="/market" replace />;

  return children;
}
