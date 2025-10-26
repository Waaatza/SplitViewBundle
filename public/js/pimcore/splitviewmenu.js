pimcore.registerNS("pimcore.plugin.WatzaSplitViewBundle");

pimcore.plugin.WatzaSplitViewBundle = Class.create({

    initialize: function () {
        pimcore.object.splitviewOpen = pimcore.object.splitviewOpen || [];
        pimcore.object.splitviewDetached = pimcore.object.splitviewDetached || new Set();

        document.addEventListener(pimcore.events.pimcoreReady, this.pimcoreReady.bind(this));
    },

    pimcoreReady: function () {
        const tabPanel = pimcore.viewport.down("tabpanel");

        // Verhindere Wechsel zu bereits in Splitview geöffneten Objekten
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

        // Kontextmenü an bestehende Tabs anhängen
        tabPanel.items.each(tab => this.attachContextMenuToTab(tab, tabPanel));

        // Kontextmenü an neue Tabs anhängen
        tabPanel.on("add", (container, tab) => this.attachContextMenuToTab(tab, tabPanel));
    },

    attachContextMenuToTab: function(tab, tabPanel) {
        if (!tab.id || !tab.id.startsWith("object_")) return;

        const tabCmp = tab.tab;
        if (!tabCmp || tabCmp._watzaContextBound) return;
        tabCmp._watzaContextBound = true;

        tabCmp.on("afterrender", () => {
            tabCmp.el.on("contextmenu", (e) => {
                e.stopEvent();

                if (!tabCmp.menu) tabCmp.showMenu(e);

                let menu = tabCmp.menu;
                if (!menu) {
                    menu = Ext.create("Ext.menu.Menu", { items: [] });
                    tabCmp.menu = menu;
                }

                if (!menu._watzaHooked) {
                    menu._watzaHooked = true;
                    menu.on("beforeshow", () => {
                        if (!menu.items.findBy(i => i.text === "In Splitview öffnen…")) {
                            if (menu.items.length > 0) menu.add('-');
                            menu.add({
                                text: "In Splitview öffnen…",
                                iconCls: "pimcore_icon_object",
                                handler: () => this.handleSplitviewClick(tab, tabPanel)
                            });
                        }
                    });
                }

                menu.showAt(e.getXY());
            });
        });
    },

    handleSplitviewClick: function(tab, tabPanel) {
        const allTabs = Array.from(tabPanel.items.items).filter(t => t && t.id && t.id.startsWith("object_"));
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

        // Neue Splitview erstellen
        new pimcore.object.splitview(clickedId, activeId);
        pimcore.object.splitviewOpen.push({ left: clickedId, right: activeId });
        pimcore.object.splitviewDetached.add(clickedId);
        pimcore.object.splitviewDetached.add(activeId);

        const lastAdded = tabPanel.items.last();
        if (!lastAdded) return;

        // Scrollbar & Layout für Splitview aktivieren
        lastAdded.setLayout({ type: 'hbox', align: 'stretch' });

        const children = lastAdded.query("panel");
        children.forEach(child => {
            child.setFlex(1);
            child.setScrollable(true);
        });

        // Fieldsets beobachten
        lastAdded.on("afterrender", () => {
            const fieldsets = lastAdded.query("fieldset");
            fieldsets.forEach(fs => {
                fs.on("expand", () => lastAdded.updateLayout({ defer: 50 }));
                fs.on("collapse", () => lastAdded.updateLayout({ defer: 50 }));
            });
        });

        // Splitview Close-Handler
        lastAdded.on("beforeclose", () => {
            pimcore.object.splitviewDetached.delete(clickedId);
            pimcore.object.splitviewDetached.delete(activeId);
            return true;
        });

        lastAdded.on("close", () => {
            pimcore.object.splitviewDetached.delete(clickedId);
            pimcore.object.splitviewDetached.delete(activeId);

            pimcore.object.splitviewOpen = pimcore.object.splitviewOpen.filter(entry =>
                !((entry.left === clickedId && entry.right === activeId) || (entry.left === activeId && entry.right === clickedId))
            );

            // Original-Tabs neu laden
            const clickedTab = tabPanel.items.find(t => t?.id === `object_${clickedId}`);
            const activeObjTab = tabPanel.items.find(t => t?.id === `object_${activeId}`);
            if (clickedTab?.reload) clickedTab.reload();
            if (activeObjTab?.reload) activeObjTab.reload();

            Ext.defer(() => tabPanel.updateLayout(), 200);
        });
    },

    isSplitviewAlreadyOpen: function(idA, idB) {
        return pimcore.object.splitviewOpen?.some(entry =>
            (entry.left === idA && entry.right === idB) ||
            (entry.left === idB && entry.right === idA)
        );
    }

});

new pimcore.plugin.WatzaSplitViewBundle();