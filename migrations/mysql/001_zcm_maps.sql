-- Apply to EXISTING Zabbix database only after backup.
CREATE TABLE IF NOT EXISTS zcm_maps (
 map_id VARCHAR(60) NOT NULL PRIMARY KEY,
 document LONGTEXT NOT NULL,
 revision INT NOT NULL DEFAULT 1,
 updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
