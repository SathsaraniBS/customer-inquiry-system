-- Users: staff accounts
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'staff'
                CHECK (role IN ('staff', 'admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Inquiries: one row per customer inquiry
CREATE TABLE IF NOT EXISTS inquiries (
  id             SERIAL PRIMARY KEY,
  customer_name  VARCHAR(150) NOT NULL,
  contact        VARCHAR(255) NOT NULL,
  subject        VARCHAR(200) NOT NULL,
  description    TEXT         NOT NULL,
  status         VARCHAR(20)  NOT NULL DEFAULT 'New'
                 CHECK (status IN ('New', 'In Progress', 'Resolved')),
  created_by     INTEGER      NOT NULL REFERENCES users(id),
  version        INTEGER      NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created_by ON inquiries(created_by);
CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries(status);

-- Inquiry events: history of status changes
CREATE TABLE IF NOT EXISTS inquiry_events (
  id          SERIAL PRIMARY KEY,
  inquiry_id  INTEGER     NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  actor_id    INTEGER     NOT NULL REFERENCES users(id),
  from_status VARCHAR(20),
  to_status   VARCHAR(20) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_inquiry ON inquiry_events(inquiry_id);