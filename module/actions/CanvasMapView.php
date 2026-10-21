<?php
namespace Modules\ZabbixCanvasMap\Actions;

use CController;
use CControllerResponseData;

class CanvasMapView extends CController {
    protected function checkInput(): bool {
        return true;
    }

    protected function checkPermissions(): bool {
        // Zabbix has already authenticated the request; later phases add
        // per-map authorization and explicit role checks.
        return (int)\CWebUser::$data['type'] >= 1;
    }

    protected function doAction(): void {
        $response = new CControllerResponseData([
            'module_version' => '0.13.0-development',
            'page_title' => 'Zabbix Canvas Map'
        ]);
        $this->setResponse($response);
    }
}