pimcore.registerNS("pimcore.object.splitview");

pimcore.object.splitview = Class.create({

    initialize: function (idLeft, idRight) {
        console.log("[Splitview] Init splitview für Tabs:", idLeft, idRight);

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
                console.log("[Splitview] Tabs gefunden:", leftTab.id, rightTab.id);
                this.leftTab  = leftTab;
                this.rightTab = rightTab;
                callback();
            } else {
                console.log("[Splitview] Warte auf das Öffnen beider Tabs …");
                Ext.defer(check, 300);
            }
        };
        check();
    },

    waitForEditors: function (callback) {
        const isReady = (tab) => {
            const el = tab.getEl()?.dom;
            if (!el) return false;

            return el.querySelector(
                ".objectlayout_element_Layout, " +
                ".objectlayout_element_tabpanel, " +
                ".objectlayout_element_panel, " +
                ".objectlayout_element_general"
            );
        };

        const check = () => {
            let leftReady  = isReady(this.leftTab);
            let rightReady = isReady(this.rightTab);

            if (leftReady && rightReady) {
                console.log("[Splitview] ✅ Beide React-Editoren sind jetzt gerendert");
                callback();
            } else {
                console.log("[Splitview] ⏳ Warte weiter auf React-Editor Rendering …");
                Ext.defer(check, 300);
            }
        };
        check();
    },

    findEditorLayout: function(tab) {
        if (!tab || !tab.items || tab.items.length === 0) {
            console.warn("[Splitview] ❌ Kein gültiger Tab oder keine Items:", tab);
            return null;
        }

        let toolbarPanel = tab.items.getAt(0);
        console.log("[Splitview] ✅ Toolbar erkannt:", toolbarPanel?.id);

        let editorPanel = null;
        if (tab.items.length > 1) {
            editorPanel = tab.items.getAt(1);
            console.log("[Splitview] ✅ Editor-Panel erkannt:", editorPanel?.id);
        }

        let wrapperItems = [];
        if (toolbarPanel) wrapperItems.push(toolbarPanel);
        if (editorPanel) wrapperItems.push(editorPanel);

        let wrapper = new Ext.Panel({
            layout: {
                type: "vbox",
                align: "stretch"
            },
            items: wrapperItems
        });

        console.log("[Splitview] 🎯 Wrapper gebaut mit", wrapperItems.length, "Element(en)");
        return wrapper;
    },

    buildSplitview: function () {
        console.log("[Splitview] Beide Tabs geladen → baue Splitview…");

        const tabPanel = this.getMainTabPanel();

        let leftLayout  = this.findEditorLayout(this.leftTab);
        let rightLayout = this.findEditorLayout(this.rightTab);

        if (!leftLayout || !rightLayout) {
            console.error("[Splitview] ❌ Konnte Editor-Layouts nicht finden → Abbruch");
            return;
        }

        this.leftTab.remove(leftLayout, false);
        this.rightTab.remove(rightLayout, false);

        this.leftTab.tab.hide();
        this.rightTab.tab.hide();

        let splitPanel = new Ext.Panel({
            title: `Splitview: ${this.idLeft} | ${this.idRight}`,
            iconCls: "pimcore_icon_object",
            closable: true,
            layout: {
                type: "hbox",
                align: "stretch"
            },
            defaults: { flex: 1, layout: "fit" },
            items: [
                { xtype: "container", layout: "fit", items: [leftLayout] },
                { xtype: "container", layout: "fit", items: [rightLayout] }
            ],
            listeners: {
                afterrender: function (cmp) {
                    console.log("[Splitview] afterrender → Layout refresh");
                    pimcore.layout.refresh();
                },
                close: () => {
                    this.leftTab.add(leftLayout);   
                    this.rightTab.add(rightLayout); 
                    this.leftTab.tab.show();
                    this.rightTab.tab.show();
                    tabPanel.setActiveTab(this.leftTab);
                    pimcore.layout.refresh();
                }
            }
        });

        tabPanel.add(splitPanel);
        tabPanel.setActiveTab(splitPanel);

        pimcore.layout.refresh();

        Ext.defer(() => {
            console.log("[Splitview] 🔄 Forcing resize event for React editors");
            window.dispatchEvent(new Event("resize"));
        }, 200);

        console.log("[Splitview] ✅ Splitview aktiv & Layout gestretcht");
    }

});