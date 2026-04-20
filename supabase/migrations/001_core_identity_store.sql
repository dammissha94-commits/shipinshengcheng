CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 枚举：包厢类型
CREATE TYPE room_type_enum AS ENUM ('standard', 'friends', 'vip');

-- 用户表
CREATE TABLE users (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    phone         VARCHAR(20) NOT NULL UNIQUE,
    nickname      VARCHAR(64),
    avatar_url    TEXT,
    status        VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 会员账户表
CREATE TABLE member_accounts (
    id              UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID           NOT NULL REFERENCES users(id),
    member_level    VARCHAR(20)    NOT NULL DEFAULT 'normal',
    wallet_balance  NUMERIC(12,2)  NOT NULL DEFAULT 0,
    points_balance  INTEGER        NOT NULL DEFAULT 0,
    status          VARCHAR(20)    NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- 门店表
CREATE TABLE stores (
    id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name           VARCHAR(128) NOT NULL,
    city           VARCHAR(64),
    address        TEXT,
    phone          VARCHAR(20),
    rent_monthly   NUMERIC(12,2),
    status         VARCHAR(20) NOT NULL DEFAULT 'active',
    opened_at      DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 包厢表
CREATE TABLE rooms (
    id                   UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id             UUID           NOT NULL REFERENCES stores(id),
    room_no              VARCHAR(20)    NOT NULL,
    room_type            room_type_enum NOT NULL DEFAULT 'standard',
    capacity             INTEGER        NOT NULL DEFAULT 4,
    status               VARCHAR(20)    NOT NULL DEFAULT 'idle',
    current_clean_status VARCHAR(20)    NOT NULL DEFAULT 'clean',
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    UNIQUE (store_id, room_no)
);
