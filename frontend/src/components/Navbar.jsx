import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between bg-blue-700 px-4 py-2 text-white shadow">
      <Link to="/boards" className="text-lg font-bold tracking-tight">
        TaskFlow
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <span className="opacity-90">{user?.name}</span>
        <button
          onClick={onLogout}
          className="rounded bg-white/15 px-3 py-1 hover:bg-white/25"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
