import { useState } from 'react';
import api from '../api/client';

// Admin için üye davet/çıkarma modalı.
export default function MemberModal({ boardId, members, ownerId, onClose, onChanged }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const invite = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post(`/api/boards/${boardId}/members`, { email: email.trim() });
      setEmail('');
      await onChanged();
    } catch (err) {
      setError(err.response?.data?.error || 'Üye eklenemedi.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (userId) => {
    setError('');
    try {
      await api.delete(`/api/boards/${boardId}/members/${userId}`);
      await onChanged();
    } catch (err) {
      setError(err.response?.data?.error || 'Üye çıkarılamadı.');
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Üyeler</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {error && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={invite} className="mb-4 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta ile davet et"
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
          <button
            disabled={busy}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Davet et
          </button>
        </form>

        <ul className="divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-slate-800">{m.name}</div>
                <div className="text-xs text-slate-500">{m.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {m.role === 'admin' ? 'Yönetici' : 'Üye'}
                </span>
                {m.id !== ownerId && (
                  <button
                    onClick={() => remove(m.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Çıkar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
