'use strict';

Backbone.pubSub = _.extend({}, Backbone.Events);

var app = {}; // create namespace for our app
app.config = {
    siteRoot: 'http://localhost/backbone_test1/Kanban'
};
//--------------
// Models
//--------------
console.log(app.config.siteRoot);

var KanbanBoardModel = Backbone.RelationalModel.extend({
    urlRoot: '/board',
    defaults: function() {
        return {
            itemName: "Board",
        };
    },    
    relations: [{
            type: Backbone.HasMany,
            key: 'kanban_columns',
            relatedModel: 'KanbanColumnModel',
            collectionType: 'KanbanColumnCollection',
            reverseRelation: {
                key: 'livesIn',
                includeInJSON: 'id'
                        // 'relatedModel' is automatically set to 'Zoo'; the 'relationType' to 'HasOne'.
            }
        }]
});

var KanbanColumnModel = Backbone.RelationalModel.extend({
    urlRoot: '/column',
    defaults: function() {
        return {
            order: 0,
            itemName: "Column",
        };
    },    
    relations: [{
            type: Backbone.HasMany,
            key: 'kanban_items',
            relatedModel: 'KanbanItemModel',
            collectionType: 'KanbanItemCollection',
            reverseRelation: {
                key: 'livesIn',
                includeInJSON: 'id'
                        // 'relatedModel' is automatically set to 'Zoo'; the 'relationType' to 'HasOne'.
            }
        }]

});

var KanbanItemModel = Backbone.RelationalModel.extend({
    urlRoot: '/item',
    itemName: '',
    itemContent: '',
    defaults: function() {
        return {
            order: 0,
            itemName: "Default Item",
            itemContent: "Add some content..."
        };
    },
    schema: {
        itemName:      { type: 'Text', validators: ['required'] },
        itemContent:   { type: 'Text', validators: ['required'] },
    }    
   
});


//--------------
// Collections
//--------------

var KanbanItemCollection = Backbone.Collection.extend({
    model: KanbanItemModel,
    comparator: 'order',
});

var KanbanColumnCollection = Backbone.Collection.extend({
    model: KanbanColumnModel,
    comparator: 'order',
});


//--------------
// Test Data
//--------------



//--------------
// Views
//--------------


var FormAddNewKanbanItem = Backbone.View.extend({
    tagName: 'div',    
    form: null,
    initialize: function( options ) {
        this.bind("ok", this.okClick);
        var kanbanItem;
        if(options===undefined && options.model===undefined){
            kanbanItem = new KanbanItemModel();
        }else{
            kanbanItem = options.model;
        }
        
        this.form = new Backbone.Form({
            model: kanbanItem
        }).render();        
    },    
    render: function() {

        this.$el.html(this.form.el);
        return this;
    },
    events: {

    },
    okClick: function(){
//        console.log("Triggered FormAddNewKanbanItem:CreateNew");
//        this.trigger('createNewItem', this.form.getValue() );
    }

});

var KanbanItemView = Backbone.View.extend({
    tagName: 'div',    
    template: _.template($('#item-template').html()),
    initialize: function() {
        this.listenTo(this.model, 'change', this.render);
    },    
    render: function() {

        this.el.id = 'item_' + this.model.id;
        this.$el.attr('data-id',this.model.id);
        this.$el.html( this.template( this.model.toJSON() ) );
        return this;
    },
    events: {
        'click .destroy-item': 'destroy',
        'drop': 'drop',
        'click #button-edit-kanban-item' : 'editItem'
    },
    drop: function(event, index) {
        console.log('KanbanItemView drop');
        var columnModelId = this.$el.closest( 'td' ).attr('data-id');
        Backbone.pubSub.trigger('moveItemToColumn', this, columnModelId );
    },   
    destroy: function() {
        this.model.destroy();
        this.remove();
    },
    remove: function() {
        this.$el.fadeOut("fast", function() {
            this.remove();
            //this.stopListening();
            return this;
        });
        return this;
    },
    editItem: function(){
        var form = new FormAddNewKanbanItem( {
            model: this.model
        } );
        //Backbone.pubSub.on('FormAddNewKanbanItem:CreateNew',this.createNewItem); 
        var modal = new Backbone.BootstrapModal({ 
            title:'Edit Kanban Item', 
            content: form, 
            animate: true 
        }).open();
        modal.on('ok',function(){
            
        },this);        
    }
});


var KanbanListView = Backbone.View.extend({
    tagName: 'td',
    template: _.template($('#column-template').html()),
    itemView: KanbanItemView,
    _listItems: null,
    _listIsSyncing: false,
    orderAttr: 'order',
    initialize: function() {
               
    },
    render: function() {
        this.$el.addClass('kanban-column');
        this.$el.append(this.template(this.model.toJSON()));
        
        this.el.id = 'column_' + this.model.id;
        this.$el.attr('data-id',this.model.id);
        
        this._listItems = {};

        this.listenTo(this.collection, 'sync reset', this.listSync);

        this.listSync();

        return this;
    },
    events: {
        'sortupdate': 'handleSortComplete',
        'click #button-add-kanban-item' : 'addKanbanItemClick',
    },
    handleSortComplete: function() {
        
        var oatr = this.orderAttr;

        _.each(this._listItems, function(v) {
            v.model.set(oatr, v.$el.index());
        });

        this.collection.sort({silent: true});
        //this.listSetup();

        this.trigger('sorted');
        
        console.log('sort complete on '+this.$el.attr('id'));
    },
    listSetup: function() {

//        var $ods = this.$('div');
//
//        if ($ods.length == 1) {
//            if (this.$el.data('ui-sortable'))
//                this.$el.sortable('destroy');
//        } else {
            this.$el.find('#column-items').sortable({
                 
                tolerance: 'pointer',
                connectWith: ".column-items",
                stop: function(event, ui) {
                    ui.item.trigger('drop', ui.item);

                },
                
            });
//        }

    },
    listSync: function() {

        var list = this.collection.models;

        this._listIsSyncing = true;

        _.invoke(this._listItems, 'remove');
        this._listItems = {};

        for (var m in list){
            this.listAdd(list[m]);
        }

        this._listIsSyncing = false;

        this.listSetup();

    },
    listAdd: function(model) {

        var v;

        if (!this._listItems[model.cid]) {
            v = this._listItems[model.cid] = new this.itemView({model: model});
            this.$el.find('#column-items').append(v.render().$el);
            this.handleSortComplete();
        }

        if (!this._listIsSyncing){
            this.listSetup();
        }
    },
    listRemove: function(model) {

        if (this._listItems[model.cid]) {
            this._listItems[model.cid].remove();
            delete this._listItems[model.cid];
        }

        if (!this._listIsSyncing)
            this.listSetup();

    },
    remove: function() {
        _.invoke(this._listItems, 'remove');
    },
    addKanbanItemClick: function() {

        var form = new FormAddNewKanbanItem();
        //Backbone.pubSub.on('FormAddNewKanbanItem:CreateNew',this.createNewItem); 
        var modal = new Backbone.BootstrapModal({ 
            title:'Create Kanban Item', 
            content: form, 
            animate: true 
        }).open();
        modal.on('ok',function(){
            this.createNewItem(form.form.getValue());
        },this);
        
    },
    createNewItem: function(formData){
        
        var model = new KanbanItemModel();
        model.set('id',model.cid);
        model.set('itemName', formData.itemName);
        model.set('itemContent', formData.itemContent);
        model.set('livesIn', this.model.id);
        this.listAdd(model);
    }

    
});


//var KanbanBoardView = KanbanListView.extend({
//    tagName: 'tr',
//    template: null,
//    itemView: KanbanListView,
//    _listItems: null,
//    _listIsSyncing: false,
//    orderAttr: 'order',    
//});

var KanbanBoardView = Backbone.View.extend({
    tagName: 'tr',
    template: null,
    allColumns: null,
    allItems: null,
    columnList: {},
    initialize: function(options) {
        this.collection = this.model.get('kanban_columns');
        this.allColumns = options.allColumns;
        this.allItems = options.allItems;
        this.bind('sorted',this.handleSorted);
        Backbone.pubSub.on('moveItemToColumn', this.handleMoveItemToColumn, this);

    },
    render: function() {
        this.collection.each( function(m){
            console.log(m);
            var v = new KanbanListView( { model:m, collection: m.get('kanban_items') } );
            this.columnList[m.id] = v;
            v.on('sorted', this.handleSorted, this );
            this.$el.append(v.render().el);
            
        }, this );        
        
        return this;
    },
    handleSorted: function(){
        this.trigger('boardsorted');
    },
    handleMoveItemToColumn: function( kanbanItem, DestColumnId ){

        var sourceColumnId = kanbanItem.model.get('livesIn').id;
        //Move view from one column list to the one where it was dropped

        if (this.columnList[sourceColumnId]._listItems[kanbanItem.model.cid]) {
            //console.log("Removing "+kanbanItem.model.cid+" from column "+sourceColumnId);
            delete this.columnList[sourceColumnId]._listItems[kanbanItem.model.cid];
        }        
        
        this.columnList[DestColumnId]._listItems[kanbanItem.model.cid] = kanbanItem;
        
        kanbanItem.model.set('livesIn',this.collection.get(DestColumnId));
        this.columnList[DestColumnId].handleSortComplete();
    }
      
});





//--------------
// Initializers
//--------------   
//var kanbanItem = new KanbanItemModel();
//var form = new Backbone.Form({
//    model: kanbanItem
//}).render();


