-- Chameleon Dynamic Theming: Group Themes Table
CREATE TABLE IF NOT EXISTS group_themes (
    group_name TEXT PRIMARY KEY,
    primary_color TEXT NOT NULL,    -- HEX 코드
    secondary_color TEXT NOT NULL,  -- HEX 코드
    source_url TEXT,               -- 데이터 출처 (Namuwiki 등)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
