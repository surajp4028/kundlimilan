-- =====================================================================
-- ASTRO — MySQL / MariaDB schema (utf8mb4, InnoDB)
-- Apply with:  npm run db:setup   (safe to re-run; seeds admin + services)
--
-- Encryption model (same as SKYO)
--   * Every personal value (names, contacts, birth details, IPs, devices,
--     provider payloads, S3 keys) is stored only as envelope ciphertext
--     (*_enc, AES-256-GCM; data key from AWS KMS, local key in dev).
--   * *_bidx columns are HMAC-SHA256 blind indexes for exact lookups.
--   * OTPs, session tokens and passwords are one-way hashes.
-- =====================================================================

CREATE TABLE IF NOT EXISTS schema_meta (
  meta_key   VARCHAR(64) NOT NULL PRIMARY KEY,
  meta_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key   VARCHAR(64)  NOT NULL PRIMARY KEY,
  setting_value TEXT         NULL,
  updated_by    INT UNSIGNED NULL,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers. Public id = AST + 8 digits (e.g. AST67682378). S3 folder = this id.
CREATE TABLE IF NOT EXISTS users (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uid                 CHAR(12)     NOT NULL,
  name_enc            TEXT         NULL,
  name_bidx           CHAR(64)     NULL,
  email_enc           TEXT         NULL,
  email_bidx          CHAR(64)     NULL,
  email_verified_at   DATETIME     NULL,
  phone_enc           TEXT         NULL,
  phone_bidx          CHAR(64)     NULL,
  phone_verified_at   DATETIME     NULL,
  status              ENUM('active','inactive','blocked') NOT NULL DEFAULT 'active',
  signup_method       ENUM('register','otp_login') NOT NULL DEFAULT 'otp_login',
  consent_at          DATETIME     NULL,
  consent_version     VARCHAR(16)  NULL,
  signup_ip_enc       TEXT         NULL,
  last_login_at       DATETIME     NULL,
  last_login_ip_enc   TEXT         NULL,
  last_login_ip_bidx  CHAR(64)     NULL,
  last_location_enc   TEXT         NULL,
  last_device_enc     TEXT         NULL,
  avatar_key_enc      TEXT         NULL,
  avatar_updated_at   DATETIME     NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_uid (uid),
  UNIQUE KEY uq_users_email (email_bidx),
  UNIQUE KEY uq_users_phone (phone_bidx),
  KEY idx_users_name (name_bidx),
  KEY idx_users_ip (last_login_ip_bidx),
  KEY idx_users_status (status),
  KEY idx_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Console users: admin (everything) + staff (granular permissions)
CREATE TABLE IF NOT EXISTS admins (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name_enc            TEXT         NOT NULL,
  email_enc           TEXT         NOT NULL,
  email_bidx          CHAR(64)     NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  role                ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  permissions         JSON         NULL,
  status              ENUM('active','inactive') NOT NULL DEFAULT 'active',
  failed_attempts     INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until        DATETIME     NULL,
  last_login_at       DATETIME     NULL,
  last_login_ip_enc   TEXT         NULL,
  password_changed_at DATETIME     NULL,
  avatar_key_enc      TEXT         NULL,
  avatar_updated_at   DATETIME     NULL,
  created_by          INT UNSIGNED NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admins_email (email_bidx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED  NOT NULL,
  token_hash      CHAR(64)      NOT NULL,
  ip_enc          TEXT          NULL,
  ip_bidx         CHAR(64)      NULL,
  location_enc    TEXT          NULL,
  user_agent_enc  TEXT          NULL,
  device_enc      TEXT          NULL,
  client          ENUM('web','android','ios') NOT NULL DEFAULT 'web',
  login_method    VARCHAR(32)   NULL,
  created_at      DATETIME      NOT NULL,
  last_seen_at    DATETIME      NOT NULL,
  expires_at      DATETIME      NOT NULL,
  revoked_at      DATETIME      NULL,
  revoked_reason  VARCHAR(64)   NULL,
  UNIQUE KEY uq_user_sessions_token (token_hash),
  KEY idx_user_sessions_user (user_id, revoked_at),
  KEY idx_user_sessions_ip (ip_bidx),
  KEY idx_user_sessions_created (created_at),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id        INT UNSIGNED  NOT NULL,
  token_hash      CHAR(64)      NOT NULL,
  ip_enc          TEXT          NULL,
  ip_bidx         CHAR(64)      NULL,
  location_enc    TEXT          NULL,
  user_agent_enc  TEXT          NULL,
  device_enc      TEXT          NULL,
  created_at      DATETIME      NOT NULL,
  last_seen_at    DATETIME      NOT NULL,
  expires_at      DATETIME      NOT NULL,
  revoked_at      DATETIME      NULL,
  revoked_reason  VARCHAR(64)   NULL,
  UNIQUE KEY uq_admin_sessions_token (token_hash),
  KEY idx_admin_sessions_admin (admin_id, revoked_at),
  KEY idx_admin_sessions_ip (ip_bidx),
  CONSTRAINT fk_admin_sessions_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_challenges (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  challenge_id    CHAR(32)      NOT NULL,
  channel         ENUM('email','phone') NOT NULL,
  purpose         ENUM('login','register_email','register_phone','change_email','change_phone') NOT NULL,
  subject_user_id INT UNSIGNED  NULL,
  identifier_bidx CHAR(64)      NOT NULL,
  identifier_enc  TEXT          NOT NULL,
  code_hash       CHAR(64)      NOT NULL,
  attempts        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts    TINYINT UNSIGNED NOT NULL DEFAULT 5,
  ip_enc          TEXT          NULL,
  created_at      DATETIME      NOT NULL,
  expires_at      DATETIME      NOT NULL,
  consumed_at     DATETIME      NULL,
  UNIQUE KEY uq_otp_challenge (challenge_id),
  KEY idx_otp_identifier (identifier_bidx, purpose, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS verification_tickets (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_hash     CHAR(64)      NOT NULL,
  channel         ENUM('email','phone') NOT NULL,
  identifier_enc  TEXT          NOT NULL,
  identifier_bidx CHAR(64)      NOT NULL,
  created_at      DATETIME      NOT NULL,
  expires_at      DATETIME      NOT NULL,
  used_at         DATETIME      NULL,
  UNIQUE KEY uq_ticket (ticket_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket        CHAR(64)     NOT NULL PRIMARY KEY,
  hits          INT UNSIGNED NOT NULL DEFAULT 0,
  window_start  DATETIME     NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_type      ENUM('user','admin','system') NOT NULL,
  actor_id        INT UNSIGNED  NULL,
  action          VARCHAR(64)   NOT NULL,
  target_type     VARCHAR(32)   NULL,
  target_id       VARCHAR(64)   NULL,
  ip_enc          TEXT          NULL,
  user_agent_enc  TEXT          NULL,
  meta_enc        TEXT          NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_created (created_at),
  KEY idx_audit_actor (actor_type, actor_id),
  KEY idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ref           CHAR(10)      NOT NULL,
  topic         ENUM('booking','refund','account','partnership','grievance','other') NOT NULL DEFAULT 'other',
  name_enc      TEXT          NOT NULL,
  email_enc     TEXT          NOT NULL,
  phone_enc     TEXT          NULL,
  message_enc   TEXT          NOT NULL,
  user_id       INT UNSIGNED  NULL,
  ip_enc        TEXT          NULL,
  status        ENUM('new','in_progress','closed') NOT NULL DEFAULT 'new',
  handled_by    INT UNSIGNED  NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contact_ref (ref),
  KEY idx_contact_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Report catalogue — fully managed from Admin → Services.
-- provider_endpoint = AstrologyAPI PDF path (e.g. match_making_pdf).
-- input_kind: single (one person) | couple (boy + girl) | single_year (+ year)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug               VARCHAR(48)   NOT NULL,
  title              VARCHAR(80)   NOT NULL,
  title_hi           VARCHAR(80)   NULL,
  tagline            VARCHAR(160)  NULL,
  description        TEXT          NULL,
  features           JSON          NULL,
  category           ENUM('kundli','matching','yearly','numerology','remedies','western') NOT NULL DEFAULT 'kundli',
  input_kind         ENUM('single','couple','single_year') NOT NULL DEFAULT 'single',
  provider_endpoint  VARCHAR(80)   NOT NULL,
  languages          VARCHAR(80)   NOT NULL DEFAULT 'en,hi',
  pages_hint         VARCHAR(24)   NULL,
  price_paise        INT UNSIGNED  NOT NULL,
  mrp_paise          INT UNSIGNED  NULL,
  icon               VARCHAR(24)   NOT NULL DEFAULT 'sparkles',
  accent             VARCHAR(16)   NOT NULL DEFAULT 'gold',
  status             ENUM('active','hidden','disabled') NOT NULL DEFAULT 'active',
  featured           TINYINT(1)    NOT NULL DEFAULT 0,
  sort_order         INT           NOT NULL DEFAULT 100,
  sample_key         VARCHAR(255)  NULL,
  updated_by         INT UNSIGNED  NULL,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_services_slug (slug),
  KEY idx_services_status (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Saved birth profiles ("Me", "Wife", "Son"…). Whole record encrypted.
CREATE TABLE IF NOT EXISTS birth_profiles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  data_enc    TEXT         NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_profiles_user (user_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Orders: one paid report each. Ref = ASTR + 10 hex (e.g. ASTR3F9A0C21B7).
-- status: pending → paid → completed (report ready) | failed | refunded | cancelled
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_ref          VARCHAR(20)   NOT NULL,
  user_uid           CHAR(12)      NOT NULL,
  service_id         INT UNSIGNED  NOT NULL,
  service_slug       VARCHAR(48)   NOT NULL,
  title              VARCHAR(80)   NOT NULL,
  subject_enc        TEXT          NULL,          -- "Rahul & Priya" (encrypted)
  input_enc          MEDIUMTEXT    NOT NULL,      -- birth details (encrypted JSON)
  language           VARCHAR(4)    NOT NULL DEFAULT 'en',
  price_paise        BIGINT UNSIGNED NOT NULL,
  discount_paise     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  amount_paise       BIGINT UNSIGNED NOT NULL,
  coupon_code        VARCHAR(32)   NULL,
  currency           CHAR(3)       NOT NULL DEFAULT 'INR',
  status             ENUM('pending','paid','completed','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
  payment_status     ENUM('unpaid','paid','refunded','failed') NOT NULL DEFAULT 'unpaid',
  pay_order_id       VARCHAR(64)   NULL,
  pay_payment_id     VARCHAR(64)   NULL,
  pay_method         VARCHAR(24)   NULL,
  paid_at            DATETIME      NULL,
  report_status      ENUM('not_started','generating','ready','failed') NOT NULL DEFAULT 'not_started',
  report_attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  report_error       VARCHAR(300)  NULL,
  report_started_at  DATETIME      NULL,
  completed_at       DATETIME      NULL,
  notified_at        DATETIME      NULL,
  hold_expires_at    DATETIME      NULL,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_order_ref (order_ref),
  UNIQUE KEY uq_order_pay_order (pay_order_id),
  KEY idx_orders_user (user_uid, created_at),
  KEY idx_orders_status (status, created_at),
  KEY idx_orders_service (service_slug, created_at),
  KEY idx_orders_pay_payment (pay_payment_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_uid) REFERENCES users(uid) ON UPDATE CASCADE,
  CONSTRAINT fk_orders_service FOREIGN KEY (service_id) REFERENCES services(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Generated PDFs, kept privately on S3 under <prefix><ASTRO ID>/reports/...
CREATE TABLE IF NOT EXISTS reports (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_ref           VARCHAR(20)   NOT NULL,
  user_uid            CHAR(12)      NOT NULL,
  service_slug        VARCHAR(48)   NOT NULL,
  title               VARCHAR(120)  NOT NULL,
  file_key_enc        TEXT          NOT NULL,
  size_bytes          INT UNSIGNED  NOT NULL DEFAULT 0,
  sha256              CHAR(64)      NULL,
  download_count      INT UNSIGNED  NOT NULL DEFAULT 0,
  last_downloaded_at  DATETIME      NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_report_order (order_ref),
  KEY idx_reports_user (user_uid, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every Razorpay / AstrologyAPI / notification exchange (bodies encrypted, never secrets)
CREATE TABLE IF NOT EXISTS payment_logs (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_ref    VARCHAR(20)   NULL,
  provider     ENUM('razorpay','astrologyapi','kundlimilan','resend') NOT NULL,
  direction    ENUM('outbound','inbound') NOT NULL,
  action       VARCHAR(48)   NOT NULL,
  http_status  SMALLINT      NULL,
  outcome      ENUM('ok','error') NOT NULL DEFAULT 'ok',
  external_id  VARCHAR(64)   NULL,
  event_id     VARCHAR(64)   NULL,
  amount_paise BIGINT UNSIGNED NULL,
  latency_ms   INT           NULL,
  request_enc  MEDIUMTEXT    NULL,
  response_enc MEDIUMTEXT    NULL,
  created_at   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_payment_logs_event (event_id),
  KEY idx_payment_logs_order (order_ref),
  KEY idx_payment_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_attempts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_ref     VARCHAR(20)   NOT NULL,
  user_uid      VARCHAR(16)   NOT NULL,
  provider      VARCHAR(16)   NOT NULL DEFAULT 'razorpay',
  order_id      VARCHAR(64)   NULL,
  payment_id    VARCHAR(64)   NULL,
  status        VARCHAR(16)   NOT NULL,
  method        VARCHAR(24)   NULL,
  amount_paise  BIGINT UNSIGNED NULL,
  error_code    VARCHAR(64)   NULL,
  error_desc    VARCHAR(300)  NULL,
  verified      TINYINT(1)    NOT NULL DEFAULT 0,
  source        VARCHAR(24)   NOT NULL,
  data_enc      MEDIUMTEXT    NULL,
  created_at    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_payment_attempt (payment_id),
  KEY idx_attempt_order (order_ref),
  KEY idx_attempt_user (user_uid, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refunds (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_ref     VARCHAR(20)   NOT NULL,
  payment_id    VARCHAR(64)   NOT NULL,
  refund_id     VARCHAR(64)   NULL,
  amount_paise  BIGINT UNSIGNED NOT NULL,
  status        VARCHAR(16)   NOT NULL,
  reason        VARCHAR(200)  NULL,
  initiated_by  VARCHAR(32)   NOT NULL,
  data_enc      MEDIUMTEXT    NULL,
  created_at    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_refund_id (refund_id),
  KEY idx_refund_order (order_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32)   NOT NULL,
  title           VARCHAR(100)  NULL,
  discount_type   ENUM('percent','fixed') NOT NULL,
  value           DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_discount    DECIMAL(10,2) NULL,
  min_order       DECIMAL(10,2) NULL,
  service_slug    VARCHAR(48)   NULL,            -- NULL = every report
  per_user_limit  INT UNSIGNED  NULL,
  total_limit     INT UNSIGNED  NULL,
  user_uid        VARCHAR(16)   NULL,            -- personal code
  status          ENUM('active','paused') NOT NULL DEFAULT 'active',
  starts_at       DATETIME      NULL,
  expires_at      DATETIME      NULL,
  used_count      INT UNSIGNED  NOT NULL DEFAULT 0,
  created_by      INT UNSIGNED  NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_coupon_code (code),
  KEY idx_coupon_user (user_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coupon_id       INT UNSIGNED  NOT NULL,
  code            VARCHAR(32)   NOT NULL,
  user_uid        VARCHAR(16)   NOT NULL,
  order_ref       VARCHAR(20)   NOT NULL,
  discount_paise  BIGINT UNSIGNED NOT NULL,
  status          ENUM('reserved','used','released') NOT NULL DEFAULT 'reserved',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at         DATETIME      NULL,
  UNIQUE KEY uq_redemption_order (order_ref),
  KEY idx_redemption_coupon (coupon_id, status),
  KEY idx_redemption_user (user_uid, coupon_id),
  CONSTRAINT fk_redemption_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- AstrologyAPI ledger + cache. JSON calls are pay-as-you-go (wallet token),
-- so identical requests are served from cache and daily caps apply.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS astro_api_calls (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kind          ENUM('json','pdf') NOT NULL,
  endpoint      VARCHAR(80)   NOT NULL,
  http_status   SMALLINT      NULL,
  outcome       ENUM('ok','error','cache','blocked') NOT NULL,
  error         VARCHAR(200)  NULL,
  latency_ms    INT           NOT NULL DEFAULT 0,
  feature       VARCHAR(32)   NULL,
  user_id       INT UNSIGNED  NULL,
  order_ref     VARCHAR(20)   NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_astro_created (created_at),
  KEY idx_astro_endpoint (endpoint, created_at),
  KEY idx_astro_outcome (outcome, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS astro_cache (
  cache_key     CHAR(64)      NOT NULL PRIMARY KEY,
  endpoint      VARCHAR(80)   NOT NULL,
  response_enc  MEDIUMTEXT    NOT NULL,
  hits          INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME      NOT NULL,
  KEY idx_astro_cache_exp (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
