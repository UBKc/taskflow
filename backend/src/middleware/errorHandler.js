// 500 hatalarinda detay istemciye gitmiyor, sadece sunucu loguna yaziliyor (zap taramasindan sonra)
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  const status = err.status || 500;
  const message =
    status < 500
      ? err.message || 'İstek işlenemedi.'
      : 'Beklenmeyen bir sunucu hatası oluştu.';

  res.status(status).json({ error: message });
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
