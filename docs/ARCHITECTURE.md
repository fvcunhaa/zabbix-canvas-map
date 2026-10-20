# Architecture — v0.7.0

Zabbix Canvas Map runs exclusively as a Zabbix 7.0 frontend module. PHP controllers serve Zabbix API-backed monitoring and map persistence. JavaScript renders the canvas inside the authenticated frontend. Persistent maps are stored in a `zcm_maps` table in the same Zabbix PostgreSQL or MySQL/MariaDB database, without changes to native tables. DBA executes the applicable versioned migration after backup. Map JSON contains nodes, edges and image payloads; concurrent writes use revision checks. No extra database or service is required.

Security: read operations honor authenticated access; map editing is initially limited to Super Admin pending RBAC. CSRF, data limits, migrations and concurrency require validation on a live Zabbix 7.0 Docker environment before production.

The full 0.7.0 implementation is a separate development artifact until all sources are committed. Do not deploy from this repository as a complete module until packaging is confirmed.
