'use strict';

Backbone.pubSub = _.extend({}, Backbone.Events);

var app = {}; // create namespace for our app
app.config = {
    
    siteRoot: 'http://localhost/backbone_test1/Kanban', //Needed for eventual ajax calls
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
    }],
    schema: {
        itemName:      { type: 'Text', validators: ['required'], title:'Column Name' },
    }     

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
        itemName:      { type: 'Text', validators: ['required'], title:'Item Name' },
        itemContent:   { type: 'Text', validators: ['required'], title:'Item Content' },
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
// Forms
//--------------


var FormAddNewKanbanItem = Backbone.View.extend({
    tagName: 'div',    
    form: null,
    initialize: function( options ) {
        this.bind("ok", this.okClick);
        var kanbanItem;
        if(typeof options === 'undefined' || typeof options.model==='undefined'){
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

var FormEditColumn = Backbone.View.extend({
    tagName: 'div',    
    form: null,
    initialize: function( options ) {
        this.bind("ok", this.okClick);
        var kanbanColumn;
        if(typeof options === 'undefined' || typeof options.model==='undefined'){
            kanbanColumn = new KanbanColumnModel();
        }else{
            kanbanColumn = options.model;
        }
        
        this.form = new Backbone.Form({
            model: kanbanColumn
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

//--------------
// Views
//--------------




var KanbanItemView = Backbone.View.extend({
    tagName: 'div',    
    template: _.template($('#item-template').html()),
    formEdit: null,
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
        'click #button-delete-kanban-item': 'destroy',
        'drop': 'drop',
        'click #button-edit-kanban-item' : 'editItem',

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
        this.formEdit = new FormAddNewKanbanItem( {
            model: this.model
        } );

        var modal = new Backbone.BootstrapModal({ 
            title:'Edit Kanban Item', 
            content: this.formEdit, 
            animate: true 
        }).open();
        
        modal.on('ok',function(){
            var data = this.formEdit.form.getValue();

            this.model.set('itemName',data.itemName);
            this.model.set('itemContent',data.itemContent);
            this.render();

            //Just for demo, this will refresh the serialized json display
            this.drop();
            
        },this);        
    },

});


var KanbanListView = Backbone.View.extend({
    tagName: 'td',
    template: _.template($('#column-template').html()),
    itemView: KanbanItemView,
    _listItems: null,
    _listIsSyncing: false,
    orderAttr: 'order',
    formEdit: null,
    parent: null,
    initialize: function(options) {
        this.parent = options.parent;
        this.parent.on( 'kanbanColumnSizeChange', this.columnSizeChange, this );
    },
    render: function() {
        this.$el.addClass('kanban-column');
        this.$el.append(this.template(this.model.toJSON()));
        
        this.el.id = 'column_' + this.model.id;
        this.$el.attr('data-id',this.model.id);
        this.$el.attr('style','width:'+this.parent.getColumnSize()+'%' );
        this._listItems = {};

        this.listenTo(this.collection, 'sync reset', this.listSync);

        this.listSync();

        return this;
    },
    events: {
        'sortupdate': 'handleSortComplete',
        'click #button-add-kanban-item' : 'addKanbanItemClick',
        'click #button-column-edit': 'columnEdit',
        'click #button-column-trash': 'columnDelete',
        'drop': 'drop',
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
        this.$el.fadeOut("fast", function() {
            this.remove();
            //this.stopListening();
            return this;
        });
        //Just for demo, this will refresh the serilized json display
        this.trigger('sorted');        
        return this;        
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
    },
    columnEdit: function(){
        
        this.formEdit = new FormEditColumn( {
            model: this.model
        } );

        var modal = new Backbone.BootstrapModal({ 
            title:'Edit Kanban Column', 
            content: this.formEdit, 
            animate: true 
        }).open();
        
        modal.on('ok',function(){
            var data = this.formEdit.form.getValue();
            console.log(this.model);
            this.model.set('itemName',data.itemName);
            this.$el.find('#column-'+this.model.id+'-title').html(this.model.get('itemName'));
            //Just for demo, this will refresh the serilized json display
            this.trigger('sorted');
        },this);         
    },
    columnDelete: function() {
        this.model.destroy();
        this.remove();
    },
    columnSizeChange: function(newSize){
        //console.log(this);
        //Calculate width for columns. It has to be dynamic.
        this.$el.attr('style','width:'+newSize+'%');
    },
    drop: function(){
        this.trigger('KanbanColumnMoved',[{view:this}]);
    }
    
});



var KanbanBoardView = Backbone.View.extend({
    tagName: 'div',
    template: _.template($('#kanban-template').html()),
    allColumns: null,
    allItems: null,
    columnList: {},
    orderAttr: 'order',
    initialize: function(options) {
        this.collection = this.model.get('kanban_columns');
        this.allColumns = options.allColumns;
        this.allItems = options.allItems;
        this.bind('sorted',this.handleSorted);
        Backbone.pubSub.on('moveItemToColumn', this.handleMoveItemToColumn, this);

    },
    events: {
        'click #button-add-kanban-column' : 'addKanbanColumnClick',
        'click #button-kanban-edit': 'kanbanEdit',
        'click #button-kanban-trash': 'kanbanDelete'        
    },    
    render: function() {
        this.$el.append( 
                this.template() 
        );

        this.collection.each( function(m){
            this.kanbanAddColumn(m);
        }, this );        
        
        //setup drag-drop on columns
        this.$el.find('#kanban-row').sortable({

            tolerance: 'pointer',
            connectWith: ".kanban-column",
            stop: function(event, ui) {
                ui.item.trigger('drop', ui.item);

            },

        });        
        
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
    },
    addKanbanColumnClick: function(){
        var model = new KanbanColumnModel();
        model.set('id',model.cid);
        model.set('livesIn', this.model.id);
        
        this.formEdit = new FormEditColumn( {
            model: model
        } );

        var modal = new Backbone.BootstrapModal({ 
            title:'Add Kanban Column', 
            content: this.formEdit, 
            animate: true 
        }).open();
        
        modal.on('ok',function(){
            var data = this.formEdit.form.getValue();

            model.set('itemName',data.itemName);
            this.collection.add(model);
            this.kanbanAddColumn(model);            
            //Just for demo, this will refresh the serilized json display
            this.handleSorted();
            this.trigger('kanbanColumnSizeChange',this.getColumnSize());
        },this);         
        

    },
    kanbanEdit: function(){
        alert('TODO');
    },
    kanbanDelete: function(){
        alert('TODO');
    },
    kanbanAddColumn: function(columnModel){
        var v = new KanbanListView( { model: columnModel, collection: columnModel.get('kanban_items'), parent: this } );
        this.columnList[columnModel.id] = v;
        v.on('sorted', this.handleSorted, this );
        v.on('deleteMe', this.deleteKanbanColumn, this);
        v.on('KanbanColumnMoved' ,this.columnMoved, this);
        this.$el.find('#kanban-row').append(v.render().el);   
        
        
    },
    getColumnSize: function(){
        return Math.round(100/this.collection.length);
    },
    deleteKanbanColumn: function(){
        
    },
    columnMoved: function(data){
        console.log(data);
        this.handleSortComplete();
    },
    handleSortComplete: function() {
        
        var oatr = this.orderAttr;

        _.each(this.columnList, function(v) {
            v.model.set(oatr, v.$el.index());
        });

        this.collection.sort({silent: true});
        //this.listSetup();

        this.trigger('sorted');

    },      
});


//--------------
// Initializers
//--------------   
