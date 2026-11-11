# TaskFlow — Güvenlik Testi Raporu

**Proje:** TaskFlow — Kanban Görev Takip Uygulaması
**Test dönemi:** 17–19.08.2026 (3 iş günü)
**Test türü:** Gri kutu (kaynak koda erişimli) — manuel testler + otomatik tarama
**Hedef:** `http://localhost:4000` (REST API) ve `http://localhost:5173` (React arayüz)
**Hazırlayan:** Umut Boran

---

## 1. Amaç ve Kapsam

TaskFlow'un 1. fazında bazı güvenlik önlemleri (helmet, rate-limiting, CORS kısıtı, hata
mesajı sadeleştirme) **bilinçli olarak** eksik bırakılmıştı. Bu raporun amacı; uygulamayı
manuel tekniklerle ve OWASP ZAP ile test edip açıkları tespit etmek, kapatmak ve önce/sonra
karşılaştırmasıyla belgelemektir.

Test edilen başlıklar:

1. **Yetkilendirme / erişim kontrolü** (IDOR, rol bazlı yetki, kimliksiz erişim)
2. **Kimlik doğrulama / oturum** (JWT imza, `alg:none`, süre, şifre politikası, kullanıcı numaralandırma, brute-force)
3. **Girdi doğrulama** (SQL injection, XSS, geçersiz/negatif değerler)
4. **Yapılandırma** (HTTP güvenlik başlıkları, CORS, sürüm sızıntısı, hata mesajları, gizli anahtarlar)
5. **OWASP ZAP** ile otomatik tarama (spider + active scan + OpenAPI import)

## 2. Kullanılan Araçlar

| Araç | Sürüm | Kullanım |
|------|-------|----------|
| OWASP ZAP | 2.17.0 | Otomatik güvenlik taraması (spider, active scan, OpenAPI import, HTML rapor) |
| Java (Temurin JRE) | 17.0.20 | ZAP çalışma ortamı |
| Python | 3.13 | Manuel test otomasyonu (`docs/guvenlik/manual_tests.py`), JWT token üretimi |
| Postman / Newman | koleksiyon v2.1 | Negatif test senaryoları (401/403/400/404) |
| Node.js | 24.19 | Backend çalışma ortamı |
| helmet | 8.3.0 | Güvenlik başlıkları (düzeltme) |
| express-rate-limit | 8.6.2 | Brute-force koruması (düzeltme) |

## 3. Yönetici Özeti

- **Toplam 23 manuel test** yapıldı; ilk durumda **7 bulgu** tespit edildi.
- **OWASP ZAP** taraması 26 uç noktayı taradı; **1 Orta** (CSP) + bilgilendirme düzeyi uyarılar buldu.
- Uygulamanın **çekirdek erişim kontrolü baştan sağlamdı**: IDOR, rol bazlı yetki, JWT imza
  doğrulaması, SQL injection ve XSS testlerinin tamamı ilk durumda bile güvenli sonuç verdi.
- Tespit edilen açıkların tamamı kapatıldı; **kullanıcı numaralandırma (kayıt)** düşük risk
  olarak kabul edilip rate-limiting ile hafifletildi.
- Düzeltme sonrası: manuel testlerde **21/23 güvenli**, ZAP taramasında **0 Yüksek / 0 Orta / 0 Düşük**.

## 4. Bulgular Tablosu

| # | Bulgu | Kaynak | Risk | Etkilenen uç nokta | Öneri | Durum |
|---|-------|--------|------|--------------------|-------|-------|
| 1 | HTTP güvenlik başlıkları yok (CSP, X-Frame-Options, X-Content-Type-Options, HSTS) | Manuel + ZAP | Orta | Tüm yanıtlar | `helmet` ekle | ✅ Kapatıldı |
| 2 | `X-Powered-By: Express` sürüm sızıntısı | Manuel | Düşük | Tüm yanıtlar | `helmet` (hidePoweredBy) | ✅ Kapatıldı |
| 3 | CORS tüm origin'lere açık (`Access-Control-Allow-Origin: *`) | Manuel | Orta | Tüm yanıtlar | Origin whitelist | ✅ Kapatıldı |
| 4 | Hata yanıtlarında stack trace / veritabanı hata mesajı sızıntısı | Manuel | Orta | Hatalı istekler (bozuk JSON, geçersiz id) | Merkezi hata sadeleştirme | ✅ Kapatıldı |
| 5 | Brute-force / rate-limit yok | Manuel | Orta | `/api/auth/login`, `/api/auth/register` | `express-rate-limit` | ✅ Kapatıldı |
| 6 | Geçersiz id ile HTTP 500 + DB hatası (girdi doğrulama) | Manuel | Düşük | `/api/cards/:id/move`, `/api/boards/:id` | Tam sayı doğrulaması | ✅ Kapatıldı |
| 7 | Negatif `position` değerinin kabul edilmesi | Manuel | Düşük | `/api/cards/:id/move` | `position >= 0` doğrulaması | ✅ Kapatıldı |
| 8 | CSP eksik direktif (`frame-ancestors`, `form-action`) — `/api-docs` 301 yanıtı | ZAP | Orta | `/api-docs` | Kendi yönlendirmemiz + tam CSP | ✅ Kapatıldı |
| 9 | Kayıt ile kullanıcı numaralandırma (var olan e-posta → 409) | Manuel | Düşük | `/api/auth/register` | Rate-limit ile hafifletme | 🟡 Kabul (düşük) |

### Açık OLMAYAN, doğrulanmış güvenli davranışlar
Aşağıdaki testler ilk durumda bile **güvenli** sonuç verdi (bulgu değildir, güçlü yönlerdir):

| Test | Sonuç |
|------|-------|
| IDOR — üyesi olmayan kullanıcının board/liste/kart erişimi | **403** (reddedildi) |
| Üye (member) rolüyle admin işlemleri (pano sil, üye davet) | **403** |
| Token'sız istek | **401** |
| JWT payload değiştirme (imza aynı) | **401** (imza doğrulaması) |
| `alg:none` token | **401** |
| Süresi dolmuş token | **401** |
| SQL injection (login bypass ve kart başlığı) | Parametreli sorgu — **etkisiz** |
| XSS (kart başlığına `<script>`) | React JSX otomatik kaçışı — **render'da çalışmaz** |
| Kullanıcı numaralandırma (giriş) | Olmayan e-posta ve yanlış şifre **aynı** mesaj/kod |
| Kısa şifre ile kayıt | **400** (min. 6 karakter) |

## 5. OWASP ZAP Sonuçları (önce / sonra)

Tarama; hedefe erişim + `/api-docs.json` OpenAPI şemasının içe aktarılması + spider + active
scan adımlarıyla yapıldı (26 uç nokta tarandı, ~6000+ istek).

| Risk seviyesi | ÖNCE | SONRA |
|---------------|------|-------|
| Yüksek (High) | 0 | 0 |
| Orta (Medium) | **1** (CSP: Failure to Define Directive with No Fallback) | **0** |
| Düşük (Low) | 0 | 0 |
| Bilgilendirme (Informational) | 2 tip (User Agent Fuzzer, Authentication Request Identified) | 2 tip |

Orta seviyeli tek bulgu (CSP direktif eksikliği), `/api-docs` yönlendirmesinin tam CSP
başlığı taşıyacak şekilde düzeltilmesiyle kapatıldı (bkz. Bölüm 6, madde 8).
Bilgilendirme düzeyindeki uyarılar gerçek bir açık değildir (ZAP'ın tarama davranışları).

Rapor dosyaları: `docs/guvenlik/zap-report.html` (önce), `docs/guvenlik/zap-report-after.html` (sonra).

## 6. Yapılan Kod Düzeltmeleri

| # | Dosya | Değişiklik | Neden |
|---|-------|-----------|-------|
| 1,2 | `backend/src/app.js` | `helmet()` eklendi (CSP, X-Frame-Options, X-Content-Type-Options, HSTS; `X-Powered-By` kaldırıldı) | Güvenlik başlıkları ve sürüm sızıntısı |
| 3 | `backend/src/app.js`, `.env` | CORS yalnızca `http://localhost:5173` origin'ine kısıtlandı | Tüm origin'lere açık CORS |
| 4 | `backend/src/middleware/errorHandler.js` | Stack trace hiç döndürülmüyor; 5xx'te genel mesaj, detaylar yalnızca sunucu logunda | Bilgi sızıntısı |
| 5 | `backend/src/routes/auth.js` | `express-rate-limit` (15 dk / 5 başarısız deneme; başarılılar sayılmaz) `login` ve `register`'a eklendi | Brute-force + numaralandırma hızını sınırlama |
| 6 | `backend/src/middleware/authorize.js` | id'ler pozitif tam sayıya doğrulanıyor; geçersizse DB'ye gitmeden 404 | Geçersiz id → 500 + DB hatası |
| 7 | `backend/src/controllers/cardController.js` | `moveCard`'ta `list_id` pozitif tam sayı, `position >= 0` doğrulaması | Negatif/geçersiz değer kabulü |
| 8 | `backend/src/app.js` | `/api-docs` → `/api-docs/` yönlendirmesi kendimiz tarafından yapılıp tam CSP uygulandı | ZAP Orta CSP bulgusu |

**Gizli anahtarlar:** `.env` dosyası `.gitignore` ile sürüm kontrolü dışında tutulmuştur;
depoda yalnızca gizli değer içermeyen `.env.example` bulunur. (Not: Üretimde `JWT_SECRET`
güçlü ve rastgele bir değerle değiştirilmelidir.)

## 7. Yeniden Test (Doğrulama)

Tüm düzeltmelerden sonra manuel test paketi ve ZAP taraması tekrar çalıştırıldı:

- Manuel: **21/23 güvenli** (kalan #9 kabul edilen düşük risk).
- Güvenlik başlıkları, CORS, hata sadeleştirme, rate-limit, girdi doğrulama: hepsi doğrulandı.
- ZAP: **0 Yüksek / 0 Orta / 0 Düşük**.

Ayrıntılı çıktı: `docs/guvenlik/manual_tests_BEFORE.txt` ve `manual_tests_AFTER.txt`.

## 8. Sonuç

TaskFlow'un iş mantığı ve erişim kontrolü tasarımı baştan sağlamdı; tespit edilen açıkların
tamamı **yapılandırma ve sertleştirme** kaynaklıydı ve kapatıldı. Kalan tek nokta (kayıtta
kullanıcı numaralandırma) düşük risklidir ve rate-limiting ile hafifletilmiştir. Uygulama,
2. faz sonunda temel OWASP kontrollerini karşılar durumdadır.
