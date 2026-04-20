-- 002_circle_game.sql
-- P0 熟人圈、预约、开局、记局、战绩卡
-- 所有命名 snake_case；一局固定 4 人；名次 1..4
-- 本阶段不包含 RLS / POLICY / TRIGGER

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 枚举：预约状态
CREATE TYPE reservation_status_enum AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- 枚举：开局状态
CREATE TYPE game_status_enum AS ENUM ('created', 'in_progress', 'finished', 'cancelled');

-- 熟人圈（归属门店）
CREATE TABLE circles (
    id             UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id       UUID          NOT NULL REFERENCES stores(id),
    owner_user_id  UUID          NOT NULL REFERENCES users(id),
    name           VARCHAR(128)  NOT NULL,
    description    TEXT,
    status         VARCHAR(20)   NOT NULL DEFAULT 'active',
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 熟人圈成员
CREATE TABLE circle_members (
    id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id   UUID         NOT NULL REFERENCES circles(id),
    user_id     UUID         NOT NULL REFERENCES users(id),
    role        VARCHAR(20)  NOT NULL DEFAULT 'member',
    joined_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    UNIQUE (circle_id, user_id)
);

-- 预约
CREATE TABLE reservations (
    id                UUID                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id          UUID                     NOT NULL REFERENCES stores(id),
    room_id           UUID                     NOT NULL REFERENCES rooms(id),
    circle_id         UUID                     REFERENCES circles(id),
    created_by        UUID                     NOT NULL REFERENCES users(id),
    reservation_date  DATE                     NOT NULL,
    start_time        TIME                     NOT NULL,
    end_time          TIME                     NOT NULL,
    status            reservation_status_enum  NOT NULL DEFAULT 'pending',
    source            VARCHAR(20)              NOT NULL DEFAULT 'manual',
    created_at        TIMESTAMPTZ              NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ              NOT NULL DEFAULT now()
);

-- 开局
CREATE TABLE games (
    id              UUID              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id        UUID              NOT NULL REFERENCES stores(id),
    room_id         UUID              NOT NULL REFERENCES rooms(id),
    circle_id       UUID              REFERENCES circles(id),
    reservation_id  UUID              REFERENCES reservations(id),
    created_by      UUID              NOT NULL REFERENCES users(id),
    room_type       room_type_enum    NOT NULL DEFAULT 'standard',
    status          game_status_enum  NOT NULL DEFAULT 'created',
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- 开局参与者（一局 4 人，座位 1..4 唯一）
CREATE TABLE game_participants (
    id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id    UUID         NOT NULL REFERENCES games(id),
    user_id    UUID         NOT NULL REFERENCES users(id),
    seat_no    INTEGER      NOT NULL,
    joined_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (game_id, user_id),
    UNIQUE (game_id, seat_no)
);

-- 记局结果（名次优先，score 可选，rank 1..4，无现金输赢字段）
CREATE TABLE game_results (
    id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id     UUID         NOT NULL REFERENCES games(id),
    user_id     UUID         NOT NULL REFERENCES users(id),
    rank        INTEGER      NOT NULL,
    score       INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (rank >= 1 AND rank <= 4),
    UNIQUE (game_id, user_id),
    UNIQUE (game_id, rank)
);

-- 战绩卡（直接绑定 game_id，一局一张）
CREATE TABLE result_cards (
    id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id         UUID         NOT NULL REFERENCES games(id),
    card_image_url  TEXT,
    generated_by    UUID         REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (game_id)
);
