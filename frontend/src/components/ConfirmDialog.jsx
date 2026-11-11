/**
 * Uygulama içi onay penceresi.
 *
 * NOT: Daha önce window.confirm() kullanılıyordu; ancak native diyaloglar bazı
 * ortamlarda (gömülü tarayıcılar, sandbox'lı iframe'ler) engellenir ve sessizce
 * false döner — bu da silme işleminin hiç çalışmamasına yol açıyordu.
 * Bu bileşen her ortamda çalışır ve arayüzle tutarlı görünür.
 */
export default function ConfirmDialog({
  open,
  title = 'Emin misiniz?',
  message,
  confirmLabel = 'Sil',
  cancelLabel = 'İptal',
  danger = true,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-bold text-slate-800">{title}</h2>
        {message && <p className="mb-5 text-sm text-slate-600">{message}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {cancelLabel}
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            className={`rounded px-4 py-2 text-sm font-medium text-white ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
