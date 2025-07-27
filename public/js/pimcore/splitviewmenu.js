pimcore.registerNS("pimcore.plugin.WatzaSplitViewBundle");

pimcore.plugin.WatzaSplitViewBundle = Class.create({

    initialize: function () {
        pimcore.object.splitviewOpen = pimcore.object.splitviewOpen || [];
        pimcore.object.splitviewDetached = pimcore.object.splitviewDetached || new Set();

        document.addEventListener(pimcore.events.pimcoreReady, this.pimcoreReady.bind(this));
    },

    pimcoreReady: function () {
        const tabPanel = pimcore.viewport.down("tabpanel");

        tabPanel.on("beforetabchange", (panel, newTab) => {
            if (!newTab?.id) return true;

            if (newTab.id.startsWith("object_")) {
                const objId = newTab.id.replace("object_", "");
                if (pimcore.object.splitviewDetached.has(objId)) {
                    Ext.Msg.alert(
                        "Info",
                        "Dieses Objekt ist derzeit in einer Splitview geöffnet.<br>Bitte schließe die Splitview zuerst."
                    );
                    return false;
                }
            }
            return true;
        });

        tabPanel.on("add", (container, tab) => {
            this.attachContextMenuToTab(tab, tabPanel);
        });

        tabPanel.items.each(tab => {
            this.attachContextMenuToTab(tab, tabPanel);
        });
    },

    attachContextMenuToTab: function (tab, tabPanel) {
        if (!tab.id || !tab.id.startsWith("object_")) return;

        Ext.defer(() => {
            const tabHeader = tab.tab?.el;
            if (!tabHeader) return;

            if (tabHeader._watzaContextBound) return;
            tabHeader._watzaContextBound = true;

            tabHeader.on("contextmenu", (event) => {
                event.stopEvent();

                let originalMenu = tab.tab?.menu;

                if (!originalMenu) {
                    originalMenu = new Ext.menu.Menu();
                    tab.tab.menu = originalMenu;
                }

                if (!originalMenu.items.findBy(i => i.text === "In Splitview öffnen…")) {
                    originalMenu.add({
                        text: "In Splitview öffnen…",
                        iconCls: "pimcore_icon_object",
                        handler: () => this.handleSplitviewClick(tab, tabPanel)
                    });
                }

                originalMenu.showAt(event.getXY());
            });
        }, 300);
    },

    handleSplitviewClick: function (tab, tabPanel) {
        const allTabs = tabPanel.items.filter(t => t.id?.startsWith("object_"));
        if (allTabs.length < 2) {
            pimcore.helpers.showNotification("Info", "Es müssen mindestens zwei Objekt-Tabs geöffnet sein.");
            return;
        }

        const clickedId = tab.id.replace("object_", "");

        const activeTab = tabPanel.getActiveTab();
        if (!activeTab || !activeTab.id.startsWith("object_")) {
            pimcore.helpers.showNotification("Info", "Bitte wähle zuerst einen anderen Objekt-Tab aus.");
            return;
        }
        const activeId = activeTab.id.replace("object_", "");

        if (clickedId === activeId) {
            pimcore.helpers.showNotification("Info", "Bitte wähle zwei unterschiedliche Objekte.");
            return;
        }

        if (this.isSplitviewAlreadyOpen(clickedId, activeId)) {
            pimcore.helpers.showNotification("Info", "Diese Splitview ist bereits geöffnet.");
            return;
        }

        new pimcore.object.splitview(clickedId, activeId);

        pimcore.object.splitviewOpen.push({ left: clickedId, right: activeId });

        pimcore.object.splitviewDetached.add(clickedId);
        pimcore.object.splitviewDetached.add(activeId);

        const mainPanel = pimcore.viewport.down("tabpanel");
        Ext.defer(() => {
            const lastAdded = mainPanel.items.last();
            if (lastAdded) {
                lastAdded.on("close", () => {
                    pimcore.object.splitviewOpen = pimcore.object.splitviewOpen.filter(entry => {
                        return !(
                            (entry.left === clickedId && entry.right === activeId) ||
                            (entry.left === activeId && entry.right === clickedId)
                        );
                    });

                    pimcore.object.splitviewDetached.delete(clickedId);
                    pimcore.object.splitviewDetached.delete(activeId);
                });
            }
        }, 300);
    },

    isSplitviewAlreadyOpen: function (idA, idB) {
        return pimcore.object.splitviewOpen?.some(entry => {
            return (
                (entry.left === idA && entry.right === idB) ||
                (entry.left === idB && entry.right === idA)
            );
        });
    }

});

new pimcore.plugin.WatzaSplitViewBundle();