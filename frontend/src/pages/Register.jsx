import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/boards');
    } catch (err) {
      setError(err.response?.data?.error || 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-slate-100 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 className="mb-1 text-2xl font-bold text-slate-800">TaskFlow</h1>
        <p className="mb-6 text-sm text-slate-500">Yeni hesap oluşturun</p>

        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <label className="mb-1 block text-sm font-medium text-slate-700">Ad Soyad</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          required
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">E-posta</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          required
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">Şifre (en az 6 karakter)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          className="mb-6 w-full rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Kayıt olunuyor...' : 'Kayıt ol'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Zaten hesabınız var mı?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Giriş yap
          </Link>
        </p>
      </form>
    </div>
  );
}
