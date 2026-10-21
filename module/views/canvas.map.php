<?php
$canvas_root = (new CDiv())
    ->setId('zcm-root')
    ->setAttribute('data-version', $data['module_version'])
    ->setAttribute('data-csrf', \CCsrfTokenHelper::get('canvas.store'));

(new CHtmlPage())
    ->setTitle($data['page_title'])
    ->addItem($canvas_root)
    ->show();
