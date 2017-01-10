kanban-bb
=========

Kanban board in Backbone JS
---


You can find a functional demo [here!](http://banezaklan.github.io/kanban-bb/ "Kanban Demo")

This is a general purpose Kanban board application made in Backbone JS. The reason for making it is mainly as an exercise to learn Backbone JS. 

The Idea
---
The idea is to have a serializable, nested Kanban board data structure, which can be viewed, manipulated and edited. All the changes are reflected in the data set displayed in the bottom. The data is kept in a relational structure of models and collections, by using backbone-relational library. This provides a simple way of manipulating the Kanban items and moving them between columns.

Functionality
---
Editing is done in interactive way, by jQueryUI sortable - drag and drop, and by using modal Bootstrap dialogs.

Each component of the board has it's own template, which can be further customized and have functionality added. To get the desired functionality I have used some current, popular JS libs. They are pulled from CDNs except one, bootstrap-modal.js library.

Real-world use
---
For the reasons of concurrency, the app would have to include some kind of user access control and near-real-time messaging system to be trully useful. At the moment this is out of scope of this component.



