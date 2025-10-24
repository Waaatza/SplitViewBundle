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
            console.log("[SplitViewBundle] Neuer Tab hinzugefügt:", tab.id);
            this.attachContextMenuToTab(tab, tabPanel);
        });

        // Initiale Tabs (z. B. nach Reload)
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
                    console.warn("[SplitViewBundle] Tab hat kein Menü → erstellen");
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

    handleSplitviewClick: function (tab, tabPanel) {
        console.log("[SplitViewBundle] handleSplitviewClick → Tab:", tab?.id);

        let allTabsMC = tabPanel.items.filter(t => t && t.id && t.id.startsWith("object_"));
        let allTabs = allTabsMC?.toArray ? allTabsMC.toArray() : Array.from(allTabsMC?.items || []);

        if (allTabs.length < 2) {
            pimcore.helpers.showNotification("Info", "Es müssen mindestens zwei Objekt-Tabs geöffnet sein.");
            return;
        }

        const clickedId = tab.id.replace("object_", "");
        let activeTab = tabPanel.getActiveTab();

        // Welcome Screen Handling
        if (!activeTab || !activeTab.id.startsWith("object_")) {
            const firstObjTab = tabPanel.items.find(t => t.id && t.id.startsWith("object_"));
            if (!firstObjTab) {
                pimcore.helpers.showNotification("Info", "Öffne zuerst ein Objekt.");
                return;
            }
            activeTab = firstObjTab;
            tabPanel.setActiveTab(firstObjTab);
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

        console.log("[SplitViewBundle] Öffne Splitview mit:", clickedId, activeId);

        // Scrollable Panels sicherstellen
        const leftPanel = Ext.create('Ext.panel.Panel', {
            layout: 'fit',
            scrollable: true,
            border: false,
            items: [pimcore.globalmanager.get(`object_${clickedId}`)]
        });

        const rightPanel = Ext.create('Ext.panel.Panel', {
            layout: 'fit',
            scrollable: true,
            border: false,
            items: [pimcore.globalmanager.get(`object_${activeId}`)]
        });

        const splitview = Ext.create('Ext.panel.Panel', {
            layout: 'hbox',
            title: `Splitview: ${clickedId} ↔ ${activeId}`,
            closable: true,
            items: [
                { xtype: 'panel', flex: 1, layout: 'fit', scrollable: true, items: [leftPanel] },
                { xtype: 'panel', flex: 1, layout: 'fit', scrollable: true, items: [rightPanel] }
            ]
        });

        tabPanel.add(splitview);
        tabPanel.setActiveTab(splitview);

        pimcore.object.splitviewOpen.push({ left: clickedId, right: activeId });
        pimcore.object.splitviewDetached.add(clickedId);
        pimcore.object.splitviewDetached.add(activeId);

        splitview.on("beforeclose", () => {
            pimcore.object.splitviewDetached.delete(clickedId);
            pimcore.object.splitviewDetached.delete(activeId);
            return true;
        });

        splitview.on("close", () => {
            console.log("[SplitViewBundle] Splitview geschlossen → cleanup");
            pimcore.object.splitviewDetached.delete(clickedId);
            pimcore.object.splitviewDetached.delete(activeId);

            pimcore.object.splitviewOpen = pimcore.object.splitviewOpen.filter(entry => {
                return !(
                    (entry.left === clickedId && entry.right === activeId) ||
                    (entry.left === activeId && entry.right === clickedId)
                );
            });

            const clickedTab = tabPanel.items.find(t => t?.id === `object_${clickedId}`);
            const activeObjTab = tabPanel.items.find(t => t?.id === `object_${activeId}`);

            if (clickedTab?.reload) clickedTab.reload();
            if (activeObjTab?.reload) activeObjTab.reload();

            // vollständiges Relayout
            Ext.defer(() => {
                pimcore.viewport.doLayout();
                tabPanel.updateLayout();
            }, 300);
        });
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