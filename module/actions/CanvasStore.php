<?php
namespace Modules\ZabbixCanvasMap\Actions;

use CController;
use CControllerResponseData;

/** Map storage in a dedicated canvas_map database; never touches Zabbix DB tables. */
class CanvasStore extends CController {
    protected function checkInput(): bool {
        return $this->validateInput([
            'op' => 'required|in list,read,save',
            'map_id' => 'string', 'document' => 'string', 'revision' => 'string'
        ]);
    }
    protected function checkPermissions(): bool {
        return (int)\CWebUser::$data['type'] === 3;
    }
    private static function db(): \PDO {
        if (!extension_loaded('pdo_pgsql')) {
            throw new \RuntimeException('pdo_pgsql PHP extension unavailable');
        }
        $host = getenv('ZCM_DB_HOST') ?: '';
        $name = getenv('ZCM_DB_NAME') ?: 'canvas_map';
        $user = getenv('ZCM_DB_USER') ?: '';
        $password = getenv('ZCM_DB_PASSWORD');
        $port = getenv('ZCM_DB_PORT') ?: '5432';
        if (!$host || !$user || $password === false || !preg_match('/^[0-9]{1,5}$/', $port)
            || !preg_match('/^[a-zA-Z0-9_]{1,63}$/', $name)) {
            throw new \RuntimeException('Canvas database configuration missing or invalid');
        }
        $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s;connect_timeout=3', $host, $port, $name);
        $db = new \PDO($dsn, $user, $password, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
            \PDO::ATTR_PERSISTENT => false
        ]);
        $db->exec("SET statement_timeout = '3000ms'");
        $db->exec("SET lock_timeout = '1500ms'");
        return $db;
    }
    protected function doAction(): void {
        try {
            $op = $this->getInput('op');
            $id = (string)$this->getInput('map_id', '');
            if ($op !== 'list' && !preg_match('/^[a-z][a-z0-9_-]{1,59}$/', $id)) {
                throw new \InvalidArgumentException('Invalid map ID');
            }
            $db = self::db();
            if ($op === 'list') {
                $stmt = $db->query('SELECT map_id,revision,updated_at FROM zcm_maps ORDER BY map_id LIMIT 200');
                $data = ['maps' => $stmt->fetchAll()];
            }
            elseif ($op === 'read') {
                $stmt = $db->prepare('SELECT document,revision FROM zcm_maps WHERE map_id=:id');
                $stmt->execute([':id' => $id]);
                $row = $stmt->fetch();
                $data = $row ? ['map' => json_decode($row['document'], true), 'revision' => (int)$row['revision']] : ['map' => null];
            }
            else {
                $raw = (string)$this->getInput('document', '');
                if (strlen($raw) > 2 * 1024 * 1024) throw new \InvalidArgumentException('Map exceeds 2 MB');
                $doc = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
                if (!is_array($doc) || !in_array($doc['schema'] ?? null, [2,3], true)
                    || !is_array($doc['nodes'] ?? null) || !is_array($doc['edges'] ?? null)
                    || count($doc['nodes']) > 300 || count($doc['edges']) > 600) {
                    throw new \InvalidArgumentException('Invalid document schema');
                }
                foreach ($doc['nodes'] as $node) {
                    if (!is_array($node) || !preg_match('/^n[a-z0-9]{3,24}$/', (string)($node['id'] ?? ''))
                        || !is_numeric($node['x'] ?? null) || !is_numeric($node['y'] ?? null)
                        || !is_numeric($node['w'] ?? null) || !is_numeric($node['h'] ?? null)) {
                        throw new \InvalidArgumentException('Invalid node fields');
                    }
                }
                $revision = (string)$this->getInput('revision', '0');
                if (!preg_match('/^(0|[1-9][0-9]{0,9})$/', $revision)) throw new \InvalidArgumentException('Invalid revision');
                $expected = (int)$revision;
                $encoded = json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
                if ($expected === 0) {
                    $stmt = $db->prepare('INSERT INTO zcm_maps(map_id,document,revision,updated_at) VALUES(:id,:doc,1,now()) ON CONFLICT (map_id) DO NOTHING');
                    $stmt->execute([':id'=>$id, ':doc'=>$encoded]);
                } else {
                    $stmt = $db->prepare('UPDATE zcm_maps SET document=:doc,revision=revision+1,updated_at=now() WHERE map_id=:id AND revision=:rev');
                    $stmt->execute([':id'=>$id, ':doc'=>$encoded, ':rev'=>$expected]);
                }
                if ($stmt->rowCount() !== 1) throw new \RuntimeException('Conflict: map changed by another user');
                $data = ['ok'=>true, 'revision'=>$expected+1];
            }
        } catch (\Throwable $e) {
            error_log('Canvas Map storage: '.get_class($e));
            $message = $e->getMessage();
            $data = ['error' => $e instanceof \InvalidArgumentException ? $message :
                (str_starts_with($message, 'Conflict:') ? $message : 'Canvas storage unavailable; contact administrator')];
        }
        $response = new CControllerResponseData(['main_block'=>json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)]);
        $response->disableView();
        $this->setResponse($response);
    }
}