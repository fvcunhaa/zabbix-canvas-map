<?php
$page = (new CHtmlPage())
    ->setTitle($data['page_title'])
    ->addItem(new CDiv([
        new CTag('div', true, '', [
            'id' => 'zcm-root',
            'data-version' => $data['module_version'],
            'data-csrf' => \CCsrfTokenHelper::get('canvas.store')
        ])
    ]));
$page->show();