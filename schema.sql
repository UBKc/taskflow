-- ============================================================
-- TaskFlow — Veritabanı Şeması (PostgreSQL)
-- Tüm CREATE TABLE ifadeleri bu dosyadadır.
-- docker-compose ilk kez ayağa kalkarken otomatik çalıştırılır.
-- ============================================================

-- Tekrarlı kurulumlarda temiz başlangıç için (bağımlılık sırasına dikkat).
DROP TABLE IF EXISTS card_labels CASCADE;
DROP TABLE IF EXISTS labels CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS lists CASCADE;
DROP TABLE IF EXISTS board_members CASCADE;
DROP TABLE IF EXISTS boards CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------
-- users: uygulama kullanıcıları
-- ------------------------------------------------------------
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,          -- bcrypt hash
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- boards: kanban panoları
-- ------------------------------------------------------------
CREATE TABLE boards (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    owner_id   INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- board_members: kullanıcı <-> board (many-to-many) + rol
-- role: 'admin' (board sahibi/yönetici) veya 'member' (davetli üye)
-- ------------------------------------------------------------
CREATE TABLE board_members (
    board_id INTEGER     NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id  INTEGER     NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    role     VARCHAR(20) NOT NULL DEFAULT 'member'
             CHECK (role IN ('admin', 'member')),
    PRIMARY KEY (board_id, user_id)
);

-- ------------------------------------------------------------
-- lists: board içindeki listeler (ör. Yapılacak / Yapılıyor / Bitti)
-- position: liste sırası (soldan sağa)
-- ------------------------------------------------------------
CREATE TABLE lists (
    id       SERIAL PRIMARY KEY,
    board_id INTEGER      NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title    VARCHAR(150) NOT NULL,
    position INTEGER      NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- cards: liste içindeki kartlar (görevler)
-- position: liste içi sıra (yukarıdan aşağıya)
-- assigned_to: karta atanan kullanıcı (silinirse NULL olur)
-- ------------------------------------------------------------
CREATE TABLE cards (
    id          SERIAL PRIMARY KEY,
    list_id     INTEGER      NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    position    INTEGER      NOT NULL DEFAULT 0,
    due_date    DATE,
    assigned_to INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- labels: board'a özel etiketler
-- ------------------------------------------------------------
CREATE TABLE labels (
    id       SERIAL PRIMARY KEY,
    board_id INTEGER     NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name     VARCHAR(50) NOT NULL,
    color    VARCHAR(20) NOT NULL          -- ör. '#61bd4f'
);

-- ------------------------------------------------------------
-- card_labels: kart <-> label (many-to-many)
-- ------------------------------------------------------------
CREATE TABLE card_labels (
    card_id  INTEGER NOT NULL REFERENCES cards(id)  ON DELETE CASCADE,
    label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, label_id)
);

-- ------------------------------------------------------------
-- Sık kullanılan yabancı anahtar aramaları için indeksler
-- ------------------------------------------------------------
CREATE INDEX idx_boards_owner        ON boards(owner_id);
CREATE INDEX idx_board_members_user  ON board_members(user_id);
CREATE INDEX idx_lists_board         ON lists(board_id);
CREATE INDEX idx_cards_list          ON cards(list_id);
CREATE INDEX idx_cards_assigned      ON cards(assigned_to);
CREATE INDEX idx_labels_board        ON labels(board_id);
CREATE INDEX idx_card_labels_label   ON card_labels(label_id);
