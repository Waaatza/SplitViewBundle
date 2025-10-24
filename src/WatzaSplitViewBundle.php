<?php

namespace Watza\SplitViewBundle;

use Pimcore\Extension\Bundle\AbstractPimcoreBundle;
use Pimcore\Extension\Bundle\PimcoreBundleAdminClassicInterface;
use Pimcore\Extension\Bundle\Traits\BundleAdminClassicTrait;

class WatzaSplitViewBundle extends AbstractPimcoreBundle implements PimcoreBundleAdminClassicInterface
{
    use BundleAdminClassicTrait;

    public function getPath(): string
    {
        return \dirname(__DIR__);
    }

    public function getJsPaths(): array
    {
        return [
            '/bundles/watzasplitview/js/pimcore/debug.js',
            '/bundles/watzasplitview/js/pimcore/splitview.js',
            '/bundles/watzasplitview/js/pimcore/splitviewmenu.js'
        ];
    }

}