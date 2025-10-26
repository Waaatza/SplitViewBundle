pimcore.registerNS("pimcore.plugin.WatzaSplitViewBundle");

pimcore.plugin.WatzaSplitViewBundle = Class.create({

    initialize: function () {
        pimcore.object.splitviewOpen = pimcore.object.splitviewOpen || [];
        pimcore.object.splitviewDetached = pimcore.object.splitviewDetached || new Set();

        // Flag for ongoing splitview closing
        this._watzaSplitviewClosing = false;

        this.defineSplitviewClass();

        document.addEventListener(pimcore.events.pimcoreReady, this.pimcoreReady.bind(this));
    },

    defineSplitviewClass: function() {
        pimcore.registerNS("pimcore.object.splitview");

        pimcore.object.splitview = Class.create({

            initialize: function (idLeft, idRight) {
                this.idLeft = idLeft;
                this.idRight = idRight;
                this.leftTab = null;
                this.rightTab = null;

                this.waitForTabs(() => this.waitForEditors(() => this.buildSplitview()));
            },

            getMainTabPanel: function () {
                return pimcore.viewport.down("tabpanel");
            },

            waitForTabs: function (callback) {
                const tabPanel = this.getMainTabPanel();
                const check = () => {
                    let leftTab  = tabPanel.items.find(t => t.id === "object_" + this.idLeft);
                    let rightTab = tabPanel.items.find(t => t.id === "object_" + this.idRight);

                    if (leftTab && rightTab) {
                        this.leftTab  = leftTab;
                        this.rightTab = rightTab;
                        callback();
                    } else {
                        Ext.defer(check, 300);
                    }
                };
                check();
            },

            waitForEditors: function (callback) {
                const isReady = (tab) => tab.getEl()?.dom?.querySelector(
                    ".objectlayout_element_Layout, .objectlayout_element_tabpanel, .objectlayout_element_panel, .objectlayout_element_general"
                );
                const check = () => {
                    if (isReady(this.leftTab) && isReady(this.rightTab)) {
                        callback();
                    } else {
                        Ext.defer(check, 300);
                    }
                };
                check();
            },

            findEditorLayout: function(tab) {
                if (!tab || !tab.items || tab.items.length === 0) return null;

                // Clone content + toolbar
                const layoutItems = [];
                tab.items.each(item => layoutItems.push(item));

                const dockedToolbars = tab.dockedItems
                    ? tab.dockedItems.items.filter(d => d.dock === "top")
                    : [];

                return new Ext.Panel({
                    layout: { type: "vbox", align: "stretch" },
                    dockedItems: dockedToolbars.map(tb => tb.cloneConfig()),
                    items: layoutItems
                });
            },

            buildSplitview: function () {
                const tabPanel = this.getMainTabPanel();

                let leftLayout  = this.findEditorLayout(this.leftTab);
                let rightLayout = this.findEditorLayout(this.rightTab);

                if (!leftLayout || !rightLayout) return;

                // Store original layouts
                this.leftTab._originalLayout  = leftLayout;
                this.rightTab._originalLayout = rightLayout;

                // Hide tabs but do not remove layouts
                this.leftTab.tab.hide();
                this.rightTab.tab.hide();

                const scrollContainer = (layout) => new Ext.Panel({
                    layout: { type: "vbox", align: "stretch" },
                    flex: 1,
                    scrollable: true,
                    border: false,
                    items: [layout]
                });

                const leftPanel = scrollContainer(leftLayout);
                const rightPanel = scrollContainer(rightLayout);

                const splitPanel = new Ext.Panel({
                    title: `Splitview: ${this.idLeft} ↔ ${this.idRight}`,
                    iconCls: "pimcore_icon_object",
                    closable: true,
                    layout: { type: "hbox", align: "stretch" },
                    defaults: { flex: 1, layout: "fit" },
                    items: [leftPanel, rightPanel],
                    listeners: {
                        afterrender: () => pimcore.layout.refresh(),
                        close: () => {
                            const bundle = pimcore.plugin.WatzaSplitViewBundle;
                            bundle._watzaSplitviewClosing = true;

                            pimcore.object.splitviewDetached.delete(this.idLeft);
                            pimcore.object.splitviewDetached.delete(this.idRight);
                            pimcore.object.splitviewOpen = pimcore.object.splitviewOpen.filter(entry =>
                                !((entry.left === this.idLeft && entry.right === this.idRight) ||
                                (entry.left === this.idRight && entry.right === this.idLeft))
                            );

                            const tabPanel = this.getMainTabPanel();

                            // Completely close old tabs
                            if (this.leftTab) tabPanel.remove(this.leftTab, true);
                            if (this.rightTab) tabPanel.remove(this.rightTab, true);

                            // Reopen objects
                            pimcore.helpers.openObject(this.idLeft);
                            pimcore.helpers.openObject(this.idRight);

                            Ext.defer(() => {
                                pimcore.layout.refresh();
                                bundle._watzaSplitviewClosing = false;
                            }, 100);
                        }
                    }
                });

                tabPanel.add(splitPanel);
                tabPanel.setActiveTab(splitPanel);
            }
        });
    },

    pimcoreReady: function () {
        const tabPanel = pimcore.viewport.down("tabpanel");
        const bundle = this;

        tabPanel.on("beforetabchange", (panel, newTab) => {
            if (!newTab?.id) return true;

            const objId = newTab.id.replace("object_", "");

            // If a splitview is currently being closed → do not block
            if (bundle._watzaSplitviewClosing || newTab._watzaClosing) return true;

            // Only block if the object is currently in an open splitview
            if (pimcore.object.splitviewDetached.has(objId)) {
                // Check if the tab is currently **being reopened** (e.g., after splitview closing)
                const wasSplitviewClosed = bundle._watzaSplitviewClosing;
                if (wasSplitviewClosed) {
                    return true; // Tab can switch, no alert
                }
                Ext.Msg.alert(
                    "Info",
                    "This object is currently opened in a splitview.<br>Please close the splitview first."
                );
                return false;
            }

            return true;
        });

        tabPanel.items.each(tab => this.attachContextMenuToTab(tab, tabPanel));
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
                        if (!menu.items.findBy(i => i.text === "Open in Splitview…")) {
                            if (menu.items.length > 0) menu.add('-');
                            menu.add({
                                text: "Open in Splitview…",
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
       // Check if the Welcome Screen is still open
        const welcomeTab = Array.from(tabPanel.items.items)
            .find(t => {
                const tabEl = t.tab?.el?.dom;
                const tabText = t.tab?.getText?.() || "";
                return tabEl?.querySelector(".pimcore_icon_welcome") || tabText === "Welcome";
            });

        if (welcomeTab) {
            Ext.Msg.alert(
                "Info",
                "Please close the Welcome Screen or Dashboard first before opening a splitview."
            );
            return;
        }

        const allTabs = Array.from(tabPanel.items.items).filter(t => t && t.id && t.id.startsWith("object_"));
        if (allTabs.length < 2) {
            pimcore.helpers.showNotification("Info", "At least two object tabs must be open.");
            return;
        }

        const clickedId = tab.id.replace("object_", "");
        const activeTab = tabPanel.getActiveTab();
        if (!activeTab || !activeTab.id.startsWith("object_")) {
            pimcore.helpers.showNotification("Info", "Please select another object tab first.");
            return;
        }

        const activeId = activeTab.id.replace("object_", "");
        if (clickedId === activeId) {
            pimcore.helpers.showNotification("Info", "Please select two different objects.");
            return;
        }

        if (this.isSplitviewAlreadyOpen(clickedId, activeId)) {
            pimcore.helpers.showNotification("Info", "This splitview is already open.");
            return;
        }

        new pimcore.object.splitview(clickedId, activeId);
        pimcore.object.splitviewOpen.push({ left: clickedId, right: activeId });
        pimcore.object.splitviewDetached.add(clickedId);
        pimcore.object.splitviewDetached.add(activeId);
    },

    isSplitviewAlreadyOpen: function(idA, idB) {
        return pimcore.object.splitviewOpen?.some(entry =>
            (entry.left === idA && entry.right === idB) ||
            (entry.left === idB && entry.right === idA)
        );
    }

});

new pimcore.plugin.WatzaSplitViewBundle();
