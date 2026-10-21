-- Run on database canvas_map as canvas_map_app; never run on database zabbix.
CREATE TABLE IF NOT EXISTS zcm_maps (
    map_id varchar(60) PRIMARY KEY,
    document text NOT NULL,
    revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT zcm_document_json CHECK (char_length(document) <= 2097152)
);
CREATE INDEX IF NOT EXISTS zcm_maps_updated_at_idx ON zcm_maps (updated_at DESC);
CREATE TABLE IF NOT EXISTS zcm_schema_migrations (
    version integer PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO zcm_schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;