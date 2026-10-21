<?php
namespace Modules\ZabbixCanvasMap\Actions;

use API;
use CController;
use CControllerResponseData;

/** Read-only Zabbix API gateway, scoped to the authenticated user. */
class CanvasData extends CController {
    protected function checkInput(): bool {
        $fields = ['op' => 'required|in search,status,dependencies,problems', 'type' => 'in host,group', 'q' => 'string', 'bindings' => 'string', 'hostids' => 'string', 'binding' => 'string'];
        return $this->validateInput($fields);
    }
    protected function checkPermissions(): bool { return true; }
    protected function doAction(): void {
        try {
            $op = $this->getInput('op');
            $data = $op === 'search' ? $this->search() : ($op === 'dependencies' ? $this->dependencies() : ($op === 'problems' ? $this->problems() : $this->status()));
        } catch (\Throwable $exception) {
            $data = ['error' => 'Consulta indisponível ou sem permissão para os dados solicitados.'];
            error_log('Zabbix Canvas Map: '.$exception->getMessage());
        }
        $response = new CControllerResponseData(['main_block' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)]);
        $response->disableView();
        $this->setResponse($response);
    }
    private function search(): array {
        $type = $this->getInput('type', 'host');
        $query = trim($this->getInput('q', ''));
        if (mb_strlen($query) < 2 || mb_strlen($query) > 80) return ['results' => []];
        if ($type === 'group') {
            $objects = API::HostGroup()->get(['output' => ['groupid', 'name'], 'search' => ['name' => $query], 'limit' => 30]);
            return ['results' => array_map(static fn($h) => ['id' => (string)$h['groupid'], 'name' => $h['name']], $objects)];
        }
        $objects = API::Host()->get(['output' => ['hostid', 'host', 'name'], 'search' => ['name' => $query], 'searchByAny' => true, 'limit' => 30]);
        return ['results' => array_map(static fn($h) => ['id' => (string)$h['hostid'], 'name' => $h['name']], $objects)];
    }
    /** Resolve declared depends_on values as technical host names, never as group names.
     * Bounded, user-permission-aware reads. No trigger dependencies are modified. */
    private function dependencies(): array {
        $input = json_decode($this->getInput('hostids', '[]'), true, 8);
        if (!is_array($input) || count($input) > 50) throw new \InvalidArgumentException('Invalid host selection');
        $ids = array_values(array_unique(array_filter(array_map('strval', $input),
            static fn($v) => preg_match('/^[0-9]{1,20}$/', $v))));
        if (!$ids) return ['hosts' => [], 'relations' => [], 'issues' => [], 'unresolved' => []];
        $known = []; $relations = []; $unresolved = []; $frontier = $ids;
        for ($depth = 0; $depth < 4 && $frontier && count($known) < 200; $depth++) {
            $found = API::Host()->get(['output' => ['hostid','host','name'], 'hostids' => $frontier,
                'selectTags' => ['tag','value']]);
            $nextNames = [];
            foreach ($found as $host) {
                $id = (string)$host['hostid'];
                $known[$id] = ['id' => $id, 'technical' => $host['host'], 'name' => $host['name']];
                foreach ($host['tags'] ?? [] as $tag) {
                    if (($tag['tag'] ?? '') !== 'depends_on') continue;
                    $name = trim((string)($tag['value'] ?? ''));
                    if ($name === '' || mb_strlen($name) > 128) continue;
                    $nextNames[$name] = true;
                    $relations[$id."\0".$name] = ['from' => $id, 'targetName' => $name];
                }
            }
            if (!$nextNames) break;
            $matches = API::Host()->get(['output'=>['hostid','host','name'], 'filter'=>['host'=>array_keys($nextNames)]]);
            $byName = []; foreach ($matches as $h) $byName[$h['host']] = $h;
            $next = [];
            foreach ($relations as &$r) {
                if (isset($r['to']) || isset($r['missing'])) continue;
                $h = $byName[$r['targetName']] ?? null;
                if (!$h) { $r['missing'] = true; $unresolved[] = ['from'=>$r['from'],'targetName'=>$r['targetName']]; continue; }
                $to = (string)$h['hostid']; $r['to'] = $to;
                if (!isset($known[$to])) $next[$to] = true;
            }
            unset($r);
            $frontier = array_slice(array_keys($next), 0, max(0, 200-count($known)));
        }
        // Hydrate target host metadata for the final frontier, without additional traversal.
        $referred = array_values(array_unique(array_column(array_filter($relations,static fn($r)=>isset($r['to'])),'to')));
        $missingIds = array_values(array_diff($referred,array_keys($known)));
        if ($missingIds) foreach (API::Host()->get(['output'=>['hostid','host','name'],'hostids'=>$missingIds]) as $h)
            $known[(string)$h['hostid']] = ['id'=>(string)$h['hostid'],'technical'=>$h['host'],'name'=>$h['name']];
        $problems = $known ? API::Problem()->get(['output'=>['eventid','objectid','name','severity'],
            'hostids'=>array_keys($known),'source'=>0,'object'=>0,'suppressed'=>false,'limit'=>1000]) : [];
        $triggers = array_values(array_unique(array_column($problems,'objectid')));
        $triggerHosts = [];
        if ($triggers) foreach (API::Trigger()->get(['output'=>['triggerid'],'triggerids'=>$triggers,
            'selectHosts'=>['hostid']]) as $t)
            foreach ($t['hosts'] ?? [] as $h) $triggerHosts[(string)$t['triggerid']][] = (string)$h['hostid'];
        $issues = [];
        foreach ($problems as $pr) foreach ($triggerHosts[(string)$pr['objectid']] ?? [] as $hid) {
            if (!isset($known[$hid])) continue;
            $issues[$hid][] = ['eventid'=>(string)$pr['eventid'], 'name'=>$pr['name'], 'severity'=>(int)$pr['severity']];
        }
        $adj = []; foreach ($relations as $r) if (isset($r['to'])) $adj[$r['from']][] = $r['to'];
        $cycles=[];
        foreach (array_keys($known) as $start) {
            $stack=[[$start,[$start]]];
            while ($stack) {
                [$cur,$path]=array_pop($stack);
                if (count($path)>8) continue;
                foreach ($adj[$cur]??[] as $to) {
                    if ($to===$start) { $cycles[implode('>', $path).'>'.$start] = $path; continue; }
                    if (!in_array($to,$path,true)) $stack[]=[$to,array_merge($path,[$to])];
                }
            }
        }
        return ['hosts'=>array_values($known),'relations'=>array_values($relations),
            'issues'=>$issues,'unresolved'=>$unresolved,'cycles'=>array_values($cycles),
            'note'=>'Dependências declaradas por tags; problemas associados não comprovam causalidade.'];
    }
    /** Bounded problems for a single visible host or host group. */
    private function problems(): array {
        $b = json_decode($this->getInput('binding', '{}'), true, 8);
        if (!is_array($b)) throw new \InvalidArgumentException('Invalid binding');
        $type = (string)($b['type'] ?? '');
        $id = (string)($b['id'] ?? '');
        if (!in_array($type, ['host','group'], true) || !preg_match('/^[0-9]{1,20}$/', $id))
            throw new \InvalidArgumentException('Unsupported binding');
        $options = ['output'=>['hostid','name','host'], 'limit'=>150];
        if ($type === 'host') $options['hostids'] = [$id];
        else $options['groupids'] = [$id];
        $hosts = API::Host()->get($options);
        $hostById = []; foreach ($hosts as $h) $hostById[(string)$h['hostid']] = $h['name'];
        if (!$hostById) return ['problems'=>[], 'hostCount'=>0];
        $rows = API::Problem()->get(['output'=>['eventid','objectid','name','severity','clock'],
            'hostids'=>array_keys($hostById), 'source'=>0, 'object'=>0,
            'suppressed'=>false, 'sortfield'=>['eventid'], 'sortorder'=>'DESC','limit'=>100]);
        $tids = array_values(array_unique(array_column($rows, 'objectid')));
        $owners = [];
        if ($tids) foreach (API::Trigger()->get(['output'=>['triggerid'],'triggerids'=>$tids,
            'selectHosts'=>['hostid']]) as $t) foreach ($t['hosts']??[] as $h)
                if (isset($hostById[(string)$h['hostid']]))
                    $owners[(string)$t['triggerid']][] = $hostById[(string)$h['hostid']];
        $result=[];
        foreach ($rows as $row) $result[] = [
            'eventid'=>(string)$row['eventid'], 'name'=>(string)$row['name'],
            'severity'=>(int)$row['severity'], 'clock'=>(int)$row['clock'],
            'hosts'=>array_values(array_unique($owners[(string)$row['objectid']] ?? []))
        ];
        return ['problems'=>$result,'hostCount'=>count($hostById), 'limited'=>count($rows)>=100];
    }
    private function status(): array {
        $bindings = json_decode($this->getInput('bindings', '[]'), true, 32);
        if (!is_array($bindings) || count($bindings) > 150) throw new \InvalidArgumentException('Too many bindings');
        $normalized = []; $hostids = []; $groupids = []; $tags = [];
        foreach ($bindings as $b) {
            if (!is_array($b) || !isset($b['nodeid']) || !preg_match('/^n[a-z0-9]{3,24}$/', (string)$b['nodeid'])) continue;
            $type = $b['type'] ?? 'none'; if (!in_array($type, ['host','group','tag'], true)) continue;
            $id = (string)($b['id'] ?? ''); $tag = trim((string)($b['tag'] ?? '')); $value = (string)($b['value'] ?? '');
            if ($type !== 'tag' && !preg_match('/^[0-9]{1,20}$/', $id)) continue;
            if ($type === 'tag' && ($tag === '' || mb_strlen($tag) > 128 || mb_strlen($value) > 128)) continue;
            $warning = max(0, min(5, (int)($b['warning'] ?? 2))); $critical = max(0, min(5, (int)($b['critical'] ?? 4)));
            $normalized[] = compact('type','id','tag','value','warning','critical') + ['nodeid' => $b['nodeid']];
            if ($type === 'host') $hostids[] = $id;
            if ($type === 'group') $groupids[] = $id;
            if ($type === 'tag') $tags[$tag."\0".$value] = compact('tag','value');
        }
        $visible = [];
        if ($hostids) foreach (API::Host()->get(['output'=>['hostid'], 'hostids'=>array_values(array_unique($hostids))]) as $h) $visible[(string)$h['hostid']] = true;
        $groupHosts = [];
        if ($groupids) foreach (API::Host()->get(['output'=>['hostid'], 'groupids'=>array_values(array_unique($groupids)), 'selectHostGroups'=>['groupid']]) as $h) {
            $hid = (string)$h['hostid']; $visible[$hid] = true;
            foreach ($h['hostgroups'] ?? [] as $g) $groupHosts[(string)$g['groupid']][$hid] = true;
        }
        $tagHosts = [];
        foreach ($tags as $key => $t) {
            $found = API::Host()->get(['output'=>['hostid'], 'tags'=>[['tag'=>$t['tag'],'value'=>$t['value'],'operator'=>1]], 'limit'=>1000]);
            foreach ($found as $h) { $hid=(string)$h['hostid']; $tagHosts[$key][$hid]=true; $visible[$hid]=true; }
        }
        $problemCount = []; $maxSeverity = [];
        if ($visible) {
            $problems = API::Problem()->get(['output'=>['eventid','objectid','severity','name'], 'hostids'=>array_keys($visible), 'source'=>0, 'object'=>0, 'suppressed'=>false, 'limit'=>10000]);
            // problem.get does not always include hostids: link through trigger.get.
            $triggerids = array_values(array_unique(array_column($problems,'objectid')));
            $triggerHost = [];
            if ($triggerids) foreach (API::Trigger()->get(['output'=>['triggerid'], 'triggerids'=>$triggerids, 'selectHosts'=>['hostid']]) as $t) foreach ($t['hosts']??[] as $h) $triggerHost[(string)$t['triggerid']][] = (string)$h['hostid'];
            foreach ($problems as $problem) foreach ($triggerHost[(string)($problem['objectid']??'')]??[] as $hid) {
                if (!isset($visible[$hid])) continue;
                $problemCount[$hid] = ($problemCount[$hid]??0)+1;
                $maxSeverity[$hid] = max($maxSeverity[$hid]??0,(int)$problem['severity']);
            }
        }
        $states=[];
        foreach ($normalized as $b) {
            $ids = $b['type']==='host' ? (isset($visible[$b['id']])?[$b['id']]:[]) : ($b['type']==='group'?array_keys($groupHosts[$b['id']]??[]):array_keys($tagHosts[$b['tag']."\0".$b['value']]??[]));
            $max = -1; $count=0;
            foreach ($ids as $hid) { $count+=$problemCount[$hid]??0; if (isset($maxSeverity[$hid])) $max=max($max,$maxSeverity[$hid]); }
            $state = !$ids ? 'unknown' : ($max >= $b['critical'] ? 'critical' : ($max >= $b['warning'] ? 'warning' : 'ok'));
            $states[$b['nodeid']] = ['status'=>$state,'count'=>$count,'hostCount'=>count($ids),'severity'=>$max];
        }
        return ['states'=>$states,'timestamp'=>time()];
    }
}