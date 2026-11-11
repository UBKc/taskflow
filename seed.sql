-- ============================================================
-- TaskFlow — Demo Verileri (seed)
-- 3 kullanıcı, 1 board, 3 liste, 9 kart, 4 etiket.
-- Ekran görüntüsü ve API testleri için hazır veri sağlar.
--
-- Giriş bilgileri (üçünün de şifresi demo1234, bcrypt ile hashlenmiş):
--   umut@taskflow.dev   / demo1234   -> board sahibi (admin)
--   elif@taskflow.dev   / demo1234   -> davetli üye (member)
--   ayse@taskflow.dev   / demo1234   -> ikinci yönetici (admin)
-- ============================================================

-- Tekrar çalıştırılabilirlik: mevcut demo verisini temizle (id'ler sıfırlanır).
TRUNCATE card_labels, labels, cards, lists, board_members, boards, users
    RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------
-- Kullanıcılar
-- Şifreler bcrypt (cost 10) ile hashlenmiştir; veritabanında düz metin
-- şifre tutulmaz. Giriş sırasında bcrypt.compare ile doğrulanır.
-- ------------------------------------------------------------
INSERT INTO users (name, email, password_hash) VALUES
  -- şifre: demo1234
  ('Umut Boran', 'umut@taskflow.dev', '$2b$10$YWlxxgZKVCdMrxA2ZYVrz.93pDS/vdsBk4OJihik7pp3ERI7xWJWy'),
  -- şifre: demo1234
  ('Elif Yılmaz', 'elif@taskflow.dev', '$2b$10$GuHyhfWKXyLuu5BfIpmmzesMz.L4RFZ0bWEcWUKncfk0frNX3djei'),
  -- şifre: demo1234
  ('Ayşe Kaya', 'ayse@taskflow.dev', '$2b$10$vRD9uLUl71CgxZMWV.Q9yO2keAuWhExXr/MSU4mRMJ5MGr9AAPj6W');

-- ------------------------------------------------------------
-- Board (sahibi: Umut)
-- ------------------------------------------------------------
INSERT INTO boards (name, owner_id) VALUES
  ('Yaz Stajı Görev Panosu', (SELECT id FROM users WHERE email = 'umut@taskflow.dev'));

-- ------------------------------------------------------------
-- Board üyeleri ve rolleri
-- ------------------------------------------------------------
INSERT INTO board_members (board_id, user_id, role) VALUES
  ((SELECT id FROM boards WHERE name = 'Yaz Stajı Görev Panosu'),
   (SELECT id FROM users  WHERE email = 'umut@taskflow.dev'), 'admin'),
  ((SELECT id FROM boards WHERE name = 'Yaz Stajı Görev Panosu'),
   (SELECT id FROM users  WHERE email = 'elif@taskflow.dev'), 'member'),
  -- İkinci yönetici: rol sisteminin birden fazla admin desteklediğini gösterir
  ((SELECT id FROM boards WHERE name = 'Yaz Stajı Görev Panosu'),
   (SELECT id FROM users  WHERE email = 'ayse@taskflow.dev'), 'admin');

-- ------------------------------------------------------------
-- Listeler
-- ------------------------------------------------------------
INSERT INTO lists (board_id, title, position) VALUES
  ((SELECT id FROM boards WHERE name = 'Yaz Stajı Görev Panosu'), 'Yapılacak', 0),
  ((SELECT id FROM boards WHERE name = 'Yaz Stajı Görev Panosu'), 'Yapılıyor', 1),
  ((SELECT id FROM boards WHERE name = 'Yaz Stajı Görev Panosu'), 'Bitti',     2);

-- ------------------------------------------------------------
-- Etiketler (board'a özel)
-- ------------------------------------------------------------
INSERT INTO labels (board_id, name, color) VALUES
  ((SELECT id FROM boards WHERE name = 'Yaz Stajı Görev Panosu'), 'Acil',       '#eb5a46'),
  ((SELECT id FROM boards WHERE name = 'Yaz Stajı Görev Panosu'), 'Hata',       '#f2d600'),
  ((SELECT id FROM boards WHERE name = 'Yaz Stajı Görev Panosu'), 'Özellik',    '#61bd4f'),
  ((SELECT id FROM boards WHERE name = 'Yaz Stajı Görev Panosu'), 'İyileştirme','#0079bf');

-- ------------------------------------------------------------
-- Kartlar
-- Kısa yol: liste id'lerini başlığa göre seçiyoruz.
-- ------------------------------------------------------------
-- "Yapılacak" listesi
INSERT INTO cards (list_id, title, description, position, due_date, assigned_to) VALUES
  ((SELECT id FROM lists WHERE title = 'Yapılacak'),
   'Veritabanı şemasını tasarla', 'ER diyagramı çıkar ve schema.sql yaz.', 0, DATE '2026-08-05',
   (SELECT id FROM users WHERE email = 'umut@taskflow.dev')),
  ((SELECT id FROM lists WHERE title = 'Yapılacak'),
   'JWT auth akışını planla', 'register/login uç noktaları ve middleware.', 1, DATE '2026-08-07',
   (SELECT id FROM users WHERE email = 'umut@taskflow.dev')),
  ((SELECT id FROM lists WHERE title = 'Yapılacak'),
   'Tailwind ile arayüz taslağı', 'Login ve board detay ekranlarının taslağı.', 2, DATE '2026-08-09',
   (SELECT id FROM users WHERE email = 'elif@taskflow.dev')),
  ((SELECT id FROM lists WHERE title = 'Yapılacak'),
   'Postman koleksiyonu oluştur', 'Tüm uç noktalar için örnek istekler.', 3, NULL,
   (SELECT id FROM users WHERE email = 'ayse@taskflow.dev'));

-- "Yapılıyor" listesi
INSERT INTO cards (list_id, title, description, position, due_date, assigned_to) VALUES
  ((SELECT id FROM lists WHERE title = 'Yapılıyor'),
   'Board CRUD uç noktaları', 'GET/POST/PUT/DELETE /api/boards.', 0, DATE '2026-08-10',
   (SELECT id FROM users WHERE email = 'umut@taskflow.dev')),
  ((SELECT id FROM lists WHERE title = 'Yapılıyor'),
   'Kart taşıma (move) mantığı', 'PATCH /api/cards/:id/move — position güncelleme.', 1, DATE '2026-08-12',
   (SELECT id FROM users WHERE email = 'elif@taskflow.dev')),
  ((SELECT id FROM lists WHERE title = 'Yapılıyor'),
   'Rol bazlı yetkilendirme', 'admin/member kontrolü için middleware.', 2, DATE '2026-08-11',
   (SELECT id FROM users WHERE email = 'umut@taskflow.dev')),
  ((SELECT id FROM lists WHERE title = 'Yapılıyor'),
   'Swagger dokümantasyonu', 'Tüm uç noktalar için @openapi anotasyonları.', 3, DATE '2026-08-14',
   (SELECT id FROM users WHERE email = 'ayse@taskflow.dev'));

-- "Bitti" listesi
INSERT INTO cards (list_id, title, description, position, due_date, assigned_to) VALUES
  ((SELECT id FROM lists WHERE title = 'Bitti'),
   'Proje iskeleti ve docker-compose', 'Repo yapısı ve PostgreSQL konteyneri.', 0, DATE '2026-08-03',
   (SELECT id FROM users WHERE email = 'umut@taskflow.dev')),
  ((SELECT id FROM lists WHERE title = 'Bitti'),
   'Depo (repo) kurulumu', 'git init ve ilk commit.', 1, DATE '2026-08-04',
   (SELECT id FROM users WHERE email = 'umut@taskflow.dev'));

-- ------------------------------------------------------------
-- Kart etiketleri (örnek atamalar)
-- ------------------------------------------------------------
INSERT INTO card_labels (card_id, label_id) VALUES
  ((SELECT id FROM cards  WHERE title = 'Kart taşıma (move) mantığı'),
   (SELECT id FROM labels WHERE name = 'Özellik')),
  ((SELECT id FROM cards  WHERE title = 'Kart taşıma (move) mantığı'),
   (SELECT id FROM labels WHERE name = 'Acil')),
  ((SELECT id FROM cards  WHERE title = 'Rol bazlı yetkilendirme'),
   (SELECT id FROM labels WHERE name = 'Özellik')),
  ((SELECT id FROM cards  WHERE title = 'Veritabanı şemasını tasarla'),
   (SELECT id FROM labels WHERE name = 'İyileştirme'));
