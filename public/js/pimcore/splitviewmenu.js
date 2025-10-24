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
            console.log("[SplitViewBundle: SplitViewMenu] Neuer Tab hinzugefügt:", tab.id);
            this.attachContextMenuToTab(tab, tabPanel);
        });

        tabPanel.items.each(tab => {
            this.attachContextMenuToTab(tab, tabPanel);
        });
    },

    attachContextMenuToTab: function (tab, tabPanel) {
        if (!tab.id || !tab.id.startsWith("object_")) return;

        const tabCmp = tab.tab;
        if (!tabCmp || tabCmp._watzaContextBound) return;
        tabCmp._watzaContextBound = true;

        tabCmp.on("afterrender", () => {
            tabCmp.el.on("contextmenu", (e) => {
                e.stopEvent();

                if (!tabCmp.menu) {
                    tabCmp.showMenu(e);
                }

                let menu = tabCmp.menu;

                if (!menu) {
                    console.warn("[SplitViewBundle: SplitViewMenu] Tab hat kein eigenes Menü → wir erstellen eines");
                    menu = Ext.create("Ext.menu.Menu", {
                        items: []
                    });
                    tabCmp.menu = menu;
                }

                if (!menu._watzaHooked) {
                    menu._watzaHooked = true;

                    menu.on("beforeshow", () => {
                        if (!menu.items.findBy(i => i.text === "In Splitview öffnen…")) {
                            console.log("[SplitViewBundle: SplitViewMenu] → Füge Splitview-Menüeintrag hinzu");

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

    handleSplitviewClick: function (tab, tabPanel) {
        console.log("[SplitViewBundle: SplitViewMenu] handleSplitviewClick → Tab:", tab?.id);

        let allTabsMC = tabPanel.items.filter(t => t && t.id && t.id.startsWith("object_"));
        let allTabs = allTabsMC?.toArray ? allTabsMC.toArray() : Array.from(allTabsMC?.items || []);

        console.log("[SplitViewBundle: SplitViewMenu] Aktuell offene Objekt-Tabs:", allTabs.map(t => t.id));

        if (allTabs.length < 2) {
            console.warn("[SplitViewBundle: SplitViewMenu] Zu wenige Tabs für Splitview");
            pimcore.helpers.showNotification("Info", "Es müssen mindestens zwei Objekt-Tabs geöffnet sein.");
            return;
        }

        const clickedId = tab.id.replace("object_", "");
        const activeTab = tabPanel.getActiveTab();

        if (!activeTab || !activeTab.id.startsWith("object_")) {
            console.warn("[SplitViewBundle: SplitViewMenu] Kein aktiver Objekt-Tab");
            pimcore.helpers.showNotification("Info", "Bitte wähle zuerst einen anderen Objekt-Tab aus.");
            return;
        }

        const activeId = activeTab.id.replace("object_", "");
        if (clickedId === activeId) {
            console.warn("[SplitViewBundle: SplitViewMenu] Gleicher Tab gewählt");
            pimcore.helpers.showNotification("Info", "Bitte wähle zwei unterschiedliche Objekte.");
            return;
        }

        if (this.isSplitviewAlreadyOpen(clickedId, activeId)) {
            console.warn("[SplitViewBundle: SplitViewMenu] Splitview bereits offen:", clickedId, activeId);
            pimcore.helpers.showNotification("Info", "Diese Splitview ist bereits geöffnet.");
            return;
        }

        console.log("[SplitViewBundle: SplitViewMenu] Öffne Splitview mit:", clickedId, activeId);

        new pimcore.object.splitview(clickedId, activeId);
        pimcore.object.splitviewOpen.push({ left: clickedId, right: activeId });
        pimcore.object.splitviewDetached.add(clickedId);
        pimcore.object.splitviewDetached.add(activeId);

        const mainPanel = pimcore.viewport.down("tabpanel");

        Ext.defer(() => {
            const lastAdded = mainPanel.items.last();
            console.log("[SplitViewBundle: SplitViewMenu] Letzter hinzugefügter Panel (Splitview?)", lastAdded?.title);

            if (!lastAdded) return;

            lastAdded.on("beforeclose", () => {
                console.log("[SplitViewBundle: SplitViewMenu] beforeclose → entferne Detached direkt");
                pimcore.object.splitviewDetached.delete(clickedId);
                pimcore.object.splitviewDetached.delete(activeId);
                return true;
            });

            lastAdded.on("close", () => {
                console.log("[SplitViewBundle: SplitViewMenu] close Event für Splitview → entferne Detached", clickedId, activeId);

                pimcore.object.splitviewDetached.delete(clickedId);
                pimcore.object.splitviewDetached.delete(activeId);

                pimcore.object.splitviewOpen = pimcore.object.splitviewOpen.filter(entry => {
                    return !(
                        (entry.left === clickedId && entry.right === activeId) ||
                        (entry.left === activeId && entry.right === clickedId)
                    );
                });

                const clickedTab = mainPanel.items.find(t => t?.id === `object_${clickedId}`);
                const activeObjTab = mainPanel.items.find(t => t?.id === `object_${activeId}`);

                console.log("[SplitViewBundle: SplitViewMenu] Tabs nach Close wieder aktiv:", clickedTab?.id, activeObjTab?.id);

                if (clickedTab?.reload) clickedTab.reload();
                if (activeObjTab?.reload) activeObjTab.reload();

                Ext.defer(() => {
                    console.log("[SplitViewBundle: SplitViewMenu] doLayout nach Close");
                    mainPanel.updateLayout();
                }, 200);
            });
        }, 200);
    },

    isSplitviewAlreadyOpen: function (idA, idB) {
        const open = pimcore.object.splitviewOpen?.some(entry => {
            return (
                (entry.left === idA && entry.right === idB) ||
                (entry.left === idB && entry.right === idA)
            );
        });
        console.log("[SplitViewBundle: SplitViewMenu] isSplitviewAlreadyOpen?", idA, idB, "→", open);
        return open;
    }
});

new pimcore.plugin.WatzaSplitViewBundle();
