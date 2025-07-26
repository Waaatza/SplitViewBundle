pimcore.registerNS("pimcore.plugin.WatzaSplitViewBundle");

pimcore.plugin.WatzaSplitViewBundle = Class.create({

    initialize: function () {
        document.addEventListener(pimcore.events.pimcoreReady, this.pimcoreReady.bind(this));
    },

    pimcoreReady: function (e) {
        // alert("WatzaSplitViewBundle ready!");
    }
});

var WatzaSplitViewBundlePlugin = new pimcore.plugin.WatzaSplitViewBundle();
