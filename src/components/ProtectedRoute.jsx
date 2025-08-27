import { useUser } from '../contexts/UserContext';
import { Navigate } from 'react-router-dom';

function isBot() {
  if (typeof navigator === "undefined") return false;
  return /bot|crawler|spider|crawling/i.test(navigator.userAgent);
}

export default function ProtectedRoute({ children }) {
  const { user, loading } = useUser();

  if (loading) {
    return <div className="spinner">Загрузка...</div>;
  }

  if (!user && !isBot()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}