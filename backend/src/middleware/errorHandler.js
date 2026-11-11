/**
 * Merkezi hata yakalama middleware'i.
 *
 * 2. FAZ (güvenlik sertleştirme): Hata detayları artık istemciye SIZDIRILMAZ.
 * - Stack trace hiçbir zaman yanıtta yer almaz.
 * - Beklenmeyen (5xx) hatalarda veritabanı/iç hata mesajı yerine genel bir
 *   mesaj döndürülür; tüm detaylar yalnızca sunucu loglarına yazılır.
 */
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err); // tam detay sadece sunucu tarafında

  const status = err.status || 500;
  const message =
    status < 500
      ? err.message || 'İstek işlenemedi.'
      : 'Beklenmeyen bir sunucu hatası oluştu.';

  res.status(status).json({ error: message });
}

/**
 * async controller'ları sarmalayıp hataları errorHandler'a iletir.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
