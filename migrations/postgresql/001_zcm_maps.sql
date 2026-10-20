-- Apply to EXISTING Zabbix database only after backup.
CREATE TABLE IF NOT EXISTS zcm_maps (
 map_id VARCHAR(60) PRIMARY KEY,
 document TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at BIGINT NOT NULL
);
