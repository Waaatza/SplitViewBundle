# SplitviewBundle for Pimcore

This Bundle allows opening multiple Objects in the Pimcore ExtJs Admin UI. The installation follows the Standard Symfony-Bundle installation.

Prerequisites: 
- Both Objects are opened as Tabs
- Pimcore > 11.5

To open the Splitview, run the following in the browser console using your desired Pimcore IDs:
> new pimcore.object.splitview(id1, id2);