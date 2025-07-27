pimcore.registerNS("pimcore.plugin.WatzaSplitViewBundle");

pimcore.plugin.WatzaSplitViewBundle = Class.create({

    initialize: function () {
        document.addEventListener(pimcore.events.pimcoreReady, this.pimcoreReady.bind(this));
    },

    pimcoreReady: function () {
        const tabPanel = pimcore.viewport.down("tabpanel");

        tabPanel.on("add", (container, tab) => {
            this.attachContextMenuToTab(tab, tabPanel);
        });

        tabPanel.items.each(tab => {
            this.attachContextMenuToTab(tab, tabPanel);
        });
    },

    attachContextMenuToTab: function (tab, tabPanel) {
        if (!tab.id || !tab.id.startsWith("object_")) {
            return;
        }

        Ext.defer(() => {
            const tabHeader = tab.tab?.el; 
            if (!tabHeader) {
                console.warn("[Splitview] Kein Tab-Header für", tab.id);
                return;
            }

            console.log("[Splitview] Kontextmenü an Tab-Header gebunden:", tab.id);

            tabHeader.on("contextmenu", (event) => {
                event.stopEvent();

                const menu = new Ext.menu.Menu({
                    items: [{
                        text: "In Splitview öffnen...",
                        iconCls: "pimcore_icon_object",
                        handler: () => {
                            const allTabs = tabPanel.items.filter(t => t.id?.startsWith("object_"));
                            if (allTabs.length < 2) {
                                pimcore.helpers.showNotification("Info", "Es müssen mindestens zwei Objekt-Tabs geöffnet sein.");
                                return;
                            }

                            const clickedId = tab.id.replace("object_", "");

                            const otherTab = allTabs.find(t => t.id !== tab.id);
                            const otherId = otherTab?.id?.replace("object_", "");

                            if (!otherId) {
                                pimcore.helpers.showNotification("Info", "Kein zweites Objekt gefunden.");
                                return;
                            }

                            console.log("[Splitview Menü] Starte mit", clickedId, "und", otherId);

                            new pimcore.object.splitview(clickedId, otherId);
                        }
                    }]
                });
                menu.showAt(event.getXY());
            });

        }, 300); 
    }

});

new pimcore.plugin.WatzaSplitViewBundle();