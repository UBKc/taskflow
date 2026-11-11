import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCard from './SortableCard';

// Bir listeyi (kolon) ve içindeki sürüklenebilir kartları gösterir.
export default function ListColumn({
  list,
  labelsById,
  membersById,
  canEdit,
  onAddCard,
  onDeleteCard,
  onDeleteList,
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  // Boş listeye de kart bırakılabilmesi için kolon gövdesi droppable.
  const { setNodeRef } = useDroppable({ id: `list-${list.id}` });

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onAddCard(list.id, title.trim());
    setTitle('');
    setAdding(false);
  };

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-slate-200/70 p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-slate-700">
          {list.title}{' '}
          <span className="text-xs font-normal text-slate-400">({list.cards.length})</span>
        </h3>
        {canEdit && (
          <button
            onClick={() => onDeleteList(list)}
            className="text-slate-400 hover:text-red-500"
            title="Listeyi sil"
          >
            ✕
          </button>
        )}
      </div>

      <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-[8px] flex-col gap-2">
          {list.cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              labelsById={labelsById}
              membersById={membersById}
              canEdit={canEdit}
              onDelete={onDeleteCard}
            />
          ))}
        </div>
      </SortableContext>

      {adding ? (
        <form onSubmit={submit} className="mt-2">
          <textarea
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kart başlığı"
            className="w-full resize-none rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            rows={2}
          />
          <div className="mt-1 flex gap-2">
            <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
              Ekle
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              İptal
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 rounded px-2 py-1 text-left text-sm text-slate-500 hover:bg-slate-300/60"
        >
          + Kart ekle
        </button>
      )}
    </div>
  );
}
