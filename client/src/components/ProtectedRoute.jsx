import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ children, requireCampaign = false, requireCharacter = false }) {
  const { user, campaign, character, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-parchment">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireCampaign && !campaign) return <Navigate to="/" replace />;
  if (requireCharacter && !character) return <Navigate to="/characters" replace />;

  return children;
}

export function DMRoute({ children }) {
  const { user, campaign, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-parchment">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'dm') return <Navigate to="/market" replace />;
  if (!campaign) return <Navigate to="/" replace />;

  return children;
}
