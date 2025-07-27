# SplitViewBundle for Pimcore 11

This Bundle allows opening multiple Objects in the Pimcore ExtJs Admin UI. 

## Installation
The installation follows the Standard Symfony/Pimcore-Bundle installation. 
(Composer install and enable class in bundles.php)

Prerequisites: 
- Pimcore ≥ 11.4

> composer require watza/splitviewbundle

bundles.php:
Add "Watza\SplitViewBundle\WatzaSplitViewBundle::class => ['all' => true]," to return Array.

## How to Use
To open the Splitview, run the following in the browser console using your desired Pimcore IDs:
> new pimcore.object.splitview(id1, id2);

Second Method: Right Click on Object in Tabbar to add it to SplitView

![Example Image](./public/images/demo-image.png)

## To-Do
- [x] Add Option to open Splitview in Admin UI
- [x] Add Option for multiple SplitViews
- [x] Add Warning if Object is already openend in Splitview
- [ ] Option to add more than two Objects to Splitview

## Known Issues
- [ ] Contextmenu *only* shows "Open in Splitview" instead e.g. "close all"
- [x] Closing the Splitview also shows Modal "Object is already opened in Splitview"
- [ ] After closing the splitview, the object must be reloaded to have the full space