pimcore.registerNS("pimcore.plugin.WatzaDebugBundle");

pimcore.plugin.WatzaDebugBundle = Class.create({

    initialize: function () {
        document.addEventListener(pimcore.events.pimcoreReady, this.pimcoreReady.bind(this));
    },

    pimcoreReady: function (e) {
        alert("WatzaDebugBundle ready!");
        console.log(e);
    }
});

var WatzaDebugBundlePlugin = new pimcore.plugin.WatzaDebugBundle();
