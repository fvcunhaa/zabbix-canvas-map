<?php
namespace Modules\ZabbixCanvasMap;

use Zabbix\Core\CModule;
use APP;
use CMenuItem;

class Module extends CModule {
    public function init(): void {
        APP::Component()->get('menu.main')
            ->add((new CMenuItem(_('Canvas Map')))->setAction('canvas.map'));
    }
}
