// Tek bir kartı gösterir. (Sürükle-bırak sonraki commit'te eklenecek.)
export default function CardItem({ card, labelsById, membersById, onDelete, canEdit }) {
  const labels = (card.label_ids || []).map((id) => labelsById[id]).filter(Boolean);
  const assignee = card.assigned_to ? membersById[card.assigned_to] : null;

  return (
    <div className="group rounded-md border border-slate-200 bg-white p-2.5 shadow-sm">
      {labels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {labels.map((l) => (
            <span
              key={l.id}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: l.color }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-800">{card.title}</p>
        {canEdit && (
          <button
            // Sürükle-bırak (dnd-kit) dinleyicileri kartın tamamına bağlıdır.
            // pointerdown'ı durdurmazsak tıklama sürükleme sanılıp yutulur ve
            // onClick hiç çalışmaz. Bu yüzden olayı burada kesiyoruz.
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card);
            }}
            className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
            title="Kartı sil"
          >
            ✕
          </button>
        )}
      </div>

      {card.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{card.description}</p>
      )}

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        {card.due_date ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5">
            📅 {new Date(card.due_date).toLocaleDateString('tr-TR')}
          </span>
        ) : (
          <span />
        )}
        {assignee && (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white"
            title={assignee.name}
          >
            {assignee.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
