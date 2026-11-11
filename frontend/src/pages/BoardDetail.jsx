import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import ListColumn from '../components/ListColumn';
import CardItem from '../components/CardItem';
import MemberModal from '../components/MemberModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [meta, setMeta] = useState(null); // { board, members, labels }
  const [lists, setLists] = useState([]); // [{ id, title, position, cards: [] }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  // Uygulama içi onay penceresi durumu (window.confirm yerine)
  const [confirmState, setConfirmState] = useState(null);

  const askConfirm = (opts) => setConfirmState(opts);
  const closeConfirm = () => setConfirmState(null);

  const sensors = useSensors(
    // 5px hareket olmadan sürükleme başlamaz -> buton tıklamaları çalışmaya devam eder.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const load = async () => {
    try {
      const { data } = await api.get(`/api/boards/${id}`);
      setMeta({ board: data.board, members: data.members, labels: data.labels });
      setLists(data.lists);
    } catch (err) {
      setError(err.response?.data?.error || 'Board yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const labelsById = useMemo(() => {
    const map = {};
    (meta?.labels || []).forEach((l) => (map[l.id] = l));
    return map;
  }, [meta]);

  const membersById = useMemo(() => {
    const map = {};
    (meta?.members || []).forEach((m) => (map[m.id] = m));
    return map;
  }, [meta]);

  const myRole = useMemo(
    () => meta?.members?.find((m) => m.id === user?.id)?.role,
    [meta, user]
  );
  const isAdmin = myRole === 'admin';

  // --- Sürükle-bırak yardımcıları ---
  const findContainer = (dndId) => {
    if (typeof dndId === 'string' && dndId.startsWith('list-')) {
      return Number(dndId.slice(5));
    }
    const cardId = Number(dndId);
    const list = lists.find((l) => l.cards.some((c) => c.id === cardId));
    return list ? list.id : null;
  };

  const onDragStart = ({ active }) => {
    const cardId = Number(active.id);
    const card = lists.flatMap((l) => l.cards).find((c) => c.id === cardId);
    setActiveCard(card || null);
  };

  // Kart farklı bir listenin üzerine gelince listeler arası anlık taşıma yap.
  const onDragOver = ({ active, over }) => {
    if (!over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setLists((prev) => {
      const source = prev.find((l) => l.id === activeContainer);
      const dest = prev.find((l) => l.id === overContainer);
      const activeIndex = source.cards.findIndex((c) => c.id === Number(active.id));
      const moved = source.cards[activeIndex];
      if (!moved) return prev;

      const overIsList = String(over.id).startsWith('list-');
      const overIndex = overIsList ? dest.cards.length : dest.cards.findIndex((c) => c.id === Number(over.id));

      const newSource = { ...source, cards: source.cards.filter((c) => c.id !== moved.id) };
      const destCards = [...dest.cards];
      destCards.splice(overIndex < 0 ? destCards.length : overIndex, 0, { ...moved, list_id: dest.id });
      const newDest = { ...dest, cards: destCards };

      return prev.map((l) => (l.id === newSource.id ? newSource : l.id === newDest.id ? newDest : l));
    });
  };

  const onDragEnd = ({ active, over }) => {
    setActiveCard(null);
    if (!over) return;
    const overContainer = findContainer(over.id);
    if (!overContainer) return;

    const dest = lists.find((l) => l.id === overContainer);
    const oldIndex = dest.cards.findIndex((c) => c.id === Number(active.id));
    let newIndex = String(over.id).startsWith('list-')
      ? dest.cards.length - 1
      : dest.cards.findIndex((c) => c.id === Number(over.id));
    if (newIndex < 0) newIndex = dest.cards.length - 1;

    const newCards = arrayMove(dest.cards, oldIndex, newIndex);
    setLists((prev) => prev.map((l) => (l.id === dest.id ? { ...l, cards: newCards } : l)));

    const finalIndex = newCards.findIndex((c) => c.id === Number(active.id));
    persistMove(Number(active.id), overContainer, finalIndex);
  };

  const persistMove = async (cardId, listId, position) => {
    try {
      await api.patch(`/api/cards/${cardId}/move`, { list_id: listId, position });
    } catch (err) {
      setError(err.response?.data?.error || 'Kart taşınamadı, yeniden yükleniyor.');
      load(); // sunucuyla yeniden senkronize et
    }
  };

  // --- CRUD işlemleri ---
  const addList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    await api.post(`/api/boards/${id}/lists`, { title: newListTitle.trim() });
    setNewListTitle('');
    setAddingList(false);
    load();
  };

  const addCard = async (listId, title) => {
    await api.post(`/api/lists/${listId}/cards`, { title });
    load();
  };

  const deleteCard = (card) => {
    askConfirm({
      title: 'Kartı sil',
      message: `"${card.title}" kartı silinecek. Emin misiniz?`,
      confirmLabel: 'Kartı sil',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/api/lists/${card.list_id}/cards/${card.id}`);
          load();
        } catch (err) {
          setError(err.response?.data?.error || 'Kart silinemedi.');
        }
      },
    });
  };

  const deleteList = (list) => {
    askConfirm({
      title: 'Listeyi sil',
      message: `"${list.title}" listesi ve içindeki tüm kartlar silinecek. Emin misiniz?`,
      confirmLabel: 'Listeyi sil',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/api/boards/${id}/lists/${list.id}`);
          load();
        } catch (err) {
          setError(err.response?.data?.error || 'Liste silinemedi.');
        }
      },
    });
  };

  const deleteBoard = () => {
    askConfirm({
      title: 'Panoyu sil',
      message: 'Bu pano, tüm listeleri ve kartlarıyla birlikte kalıcı olarak silinecek. Emin misiniz?',
      confirmLabel: 'Panoyu sil',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/api/boards/${id}`);
          navigate('/boards');
        } catch (err) {
          setError(err.response?.data?.error || 'Pano silinemedi.');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col bg-slate-100">
        <Navbar />
        <div className="flex flex-1 items-center justify-center text-slate-500">Yükleniyor...</div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex h-full flex-col bg-slate-100">
        <Navbar />
        <div className="flex flex-1 items-center justify-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <Navbar />

      {/* Board başlığı ve aksiyonlar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/boards')} className="text-sm text-slate-500 hover:text-slate-800">
            ← Panolar
          </button>
          <h1 className="text-lg font-bold text-slate-800">{meta.board.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <button
                onClick={() => setShowMembers(true)}
                className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200"
              >
                Üyeler ({meta.members.length})
              </button>
              <button
                onClick={deleteBoard}
                className="rounded bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
              >
                Panoyu sil
              </button>
            </>
          ) : (
            <span className="text-sm text-slate-400">Üye görünümü</span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 px-4 py-1 text-sm text-red-700">{error}</div>
      )}

      {/* Kanban alanı — sürükle-bırak */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <main className="flex flex-1 gap-3 overflow-x-auto p-4">
          {lists.map((list) => (
            <ListColumn
              key={list.id}
              list={list}
              labelsById={labelsById}
              membersById={membersById}
              canEdit
              onAddCard={addCard}
              onDeleteCard={deleteCard}
              onDeleteList={deleteList}
            />
          ))}

          {/* Yeni liste ekle */}
          <div className="w-72 flex-shrink-0">
            {addingList ? (
              <form onSubmit={addList} className="rounded-lg bg-slate-200/70 p-2">
                <input
                  autoFocus
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Liste başlığı"
                  className="w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="mt-1 flex gap-2">
                  <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
                    Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingList(false)}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    İptal
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAddingList(true)}
                className="w-full rounded-lg bg-white/60 px-3 py-2 text-left text-sm text-slate-600 hover:bg-white"
              >
                + Liste ekle
              </button>
            )}
          </div>
        </main>

        {/* Sürüklenen kartın önizlemesi */}
        <DragOverlay>
          {activeCard ? (
            <CardItem card={activeCard} labelsById={labelsById} membersById={membersById} canEdit={false} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {showMembers && isAdmin && (
        <MemberModal
          boardId={id}
          members={meta.members}
          ownerId={meta.board.owner_id}
          onClose={() => setShowMembers(false)}
          onChanged={load}
        />
      )}

      {/* Silme onayı — window.confirm yerine uygulama içi pencere */}
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        onConfirm={confirmState?.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
