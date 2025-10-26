<?php

namespace Watza\SplitViewBundle;

use Pimcore\Extension\Bundle\AbstractPimcoreBundle;
use Pimcore\Extension\Bundle\PimcoreBundleAdminClassicInterface;
use Pimcore\Extension\Bundle\Traits\BundleAdminClassicTrait;
use Symfony\Component\Translation\Loader\YamlFileLoader;

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
            '/bundles/watzasplitview/js/pimcore/splitviewmenu.js'
        ];
    }

    /**
     * Lädt die Admin-Translations beim Booten des Bundles
     */
    public function boot(): void
    {
        $translator = $this->container->get('translator');

        // YAML Loader registrieren
        $translator->addLoader('yaml', new YamlFileLoader());

        // Admin-Translations für Deutsch und Englisch laden
        foreach (['de', 'en'] as $locale) {
            $file = __DIR__ . '/translations/admin.' . $locale . '.yaml';
            if (file_exists($file)) {
                $translator->addResource('yaml', $file, $locale);
            }
        }
    }
}
