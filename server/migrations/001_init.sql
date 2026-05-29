CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE,
  password_hash TEXT,
  name VARCHAR(50) NOT NULL,
  avatar VARCHAR(100) NOT NULL DEFAULT 'default',
  stars INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,
  topic VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  score INTEGER,
  stars_earned INTEGER NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(10) NOT NULL,
  category VARCHAR(50) NOT NULL,
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  UNIQUE(user_id, code)
);

CREATE TABLE IF NOT EXISTS review_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id VARCHAR(50) NOT NULL,
  item_id VARCHAR(100) NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  next_review TIMESTAMPTZ NOT NULL,
  last_review TIMESTAMPTZ,
  review_count INTEGER NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, module_id, item_id)
);

CREATE TABLE IF NOT EXISTS path_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id VARCHAR(50) NOT NULL,
  item_id VARCHAR(100) NOT NULL,
  order_num INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'locked',
  stars INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, module_id, item_id)
);

CREATE TABLE IF NOT EXISTS custom_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parent_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_time_limit INTEGER NOT NULL DEFAULT 30,
  session_time_limit INTEGER NOT NULL DEFAULT 10,
  enabled_modules JSONB NOT NULL DEFAULT '{}',
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS voice_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rate REAL NOT NULL DEFAULT 0.7,
  pitch REAL NOT NULL DEFAULT 1.0,
  gender VARCHAR(10) NOT NULL DEFAULT 'female',
  tone VARCHAR(10) NOT NULL DEFAULT 'gentle',
  engine VARCHAR(20) NOT NULL DEFAULT 'browser',
  role VARCHAR(20) NOT NULL DEFAULT 'adult_female',
  edge_tts_voice VARCHAR(100) NOT NULL DEFAULT 'zh-CN-XiaoxiaoNeural',
  edge_tts_rate INTEGER NOT NULL DEFAULT 0,
  edge_tts_pitch INTEGER NOT NULL DEFAULT 0,
  edge_tts_volume INTEGER NOT NULL DEFAULT 0,
  edge_tts_locale_filter VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
  edge_tts_gender_filter VARCHAR(10) NOT NULL DEFAULT 'Female'
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_records_user ON learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_module ON learning_records(user_id, module);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_review_items_user ON review_items(user_id);
CREATE INDEX IF NOT EXISTS idx_review_items_due ON review_items(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_path_nodes_user ON path_nodes(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_custom_content_user ON custom_content(user_id, module);
