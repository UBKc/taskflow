import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';

export default function Boards() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/boards');
      setBoards(data.boards);
    } catch (err) {
      setError(err.response?.data?.error || 'Board\'lar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createBoard = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const { data } = await api.post('/api/boards', { name: name.trim() });
      setName('');
      navigate(`/boards/${data.board.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Board oluşturulamadı.');
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 overflow-auto p-6">
        <h1 className="mb-4 text-2xl font-bold text-slate-800">Panolarım</h1>

        {error && <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={createBoard} className="mb-6 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Yeni pano adı"
            className="flex-1 rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            Oluştur
          </button>
        </form>

        {loading ? (
          <p className="text-slate-500">Yükleniyor...</p>
        ) : boards.length === 0 ? (
          <p className="text-slate-500">Henüz bir panonuz yok. Yukarıdan oluşturun.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate(`/boards/${b.id}`)}
                className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow"
              >
                <div className="mb-2 font-semibold text-slate-800">{b.name}</div>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    b.role === 'admin'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {b.role === 'admin' ? 'Yönetici' : 'Üye'}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
