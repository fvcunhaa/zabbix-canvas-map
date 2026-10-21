<?php
namespace Modules\ZabbixCanvasMap\Actions;

use CController;
use CControllerResponseData;

class CanvasMapView extends CController {
    public function init(): void {
        // Read-only page opened by GET: no CSRF token is expected in the URL.
        $this->disableCsrfValidation();
    }

    protected function checkInput(): bool {
        return true;
    }

    protected function checkPermissions(): bool {
        // Access to the module is enforced by Zabbix User roles.
        // The canvas page itself is available to all authenticated user types.
        return true;
    }

    protected function doAction(): void {
        $response = new CControllerResponseData([
            'module_version' => '0.13.0-development',
            'page_title' => 'Zabbix Canvas Map'
        ]);
        $this->setResponse($response);
    }
}