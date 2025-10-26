pimcore.registerNS("pimcore.plugin.WatzaSplitViewBundle");

pimcore.plugin.WatzaSplitViewBundle = Class.create({

    initialize: function () {
        pimcore.object.splitviewOpen = pimcore.object.splitviewOpen || [];
        pimcore.object.splitviewDetached = pimcore.object.splitviewDetached || new Set();

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

                this.leftTab._originalLayout  = leftLayout;
                this.rightTab._originalLayout = rightLayout;

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
                    title: `${t("splitview.splitview")}: ${this.idLeft} | ${this.idRight}`,
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

                            if (this.leftTab) tabPanel.remove(this.leftTab, true);
                            if (this.rightTab) tabPanel.remove(this.rightTab, true);

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

            if (bundle._watzaSplitviewClosing || newTab._watzaClosing) return true;

            if (pimcore.object.splitviewDetached.has(objId)) {
                Ext.Msg.alert(
                    t("splitview.object_open_in_another_splitview_title"),
                    t("splitview.object_open_in_another_splitview_message")
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
                        if (!menu.items.findBy(i => i.text === t("splitview.open_in_splitview"))) {
                            if (menu.items.length > 0) menu.add('-');
                            menu.add({
                                text: t("splitview.open_in_splitview"),
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
        const welcomeTab = Array.from(tabPanel.items.items)
            .find(t => {
                const tabEl = t.tab?.el?.dom;
                const tabText = t.tab?.getText?.() || "";
                return tabEl?.querySelector(".pimcore_icon_welcome") || tabText === "Welcome";
            });

        if (welcomeTab) {
            Ext.Msg.alert(
                t("splitview.object_open_in_another_splitview_title"),
                t("splitview.welcome_open_message")
            );
            return;
        }

        const allTabs = Array.from(tabPanel.items.items).filter(t => t && t.id && t.id.startsWith("object_"));
        if (allTabs.length < 2) {
            pimcore.helpers.showNotification("Info", t("splitview.at_least_two_tabs"));
            return;
        }

        const clickedId = tab.id.replace("object_", "");
        const activeTab = tabPanel.getActiveTab();
        if (!activeTab || !activeTab.id.startsWith("object_")) {
            pimcore.helpers.showNotification("Info", t("splitview.select_another_tab"));
            return;
        }

        const activeId = activeTab.id.replace("object_", "");
        if (clickedId === activeId) {
            pimcore.helpers.showNotification("Info", t("splitview.select_two_different_objects"));
            return;
        }

        if (this.isSplitviewAlreadyOpen(clickedId, activeId)) {
            pimcore.helpers.showNotification("Info", t("splitview.already_open"));
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
