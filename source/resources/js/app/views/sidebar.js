"use strict";

// Import Deps
import _ from 'underscore';
import Backbone from 'backbone';
import Tpl from 'tpl/sidebar.html!text';
import GroupItemTpl from 'tpl/sidebar-group-item.html!text';
import Groups from 'app/collections/groups';
import Group from 'app/models/group';
import EmptyStateView from 'app/views/empty-state';
import {confirmDialog} from 'app/tools/dialog';

const SidebarGroupItemView = Backbone.View.extend({
    tagName: 'li',

    events: {
        'click a[data-id]': 'handleClick',
        'click .group-add': 'addGroup',
        'click .group-remove': 'removeGroup',
        'keydown [data-title]': 'handleTitleChange'
    },

    initialize: function (options) {
        this.template = _.template(GroupItemTpl);
        this.options = options;
        this.model.on('destroy', this.destroy, this);
    },

    render: function () {
        // Render
        this.$el.html(this.template(
            _.extend(
                this.model.toJSON(),
                {
                    isNew: this.model.isNew(),
                    isTrash: this.model.isTrash()
                }
            )
        ));

        // Render childs
        if (!this.model.isNew()) {
            if (typeof this.model.groups === "undefined") {
                this.model.groups = new Groups([], {
                    parentID: this.model.id
                });
            }

            this.groupView = new SidebarGroupView({
                collection: this.model.groups,
                parentView: this.options.parentView
            });
            this.$el.append(this.groupView.render().el);
            this.$el.toggleClass("has-groups", this.model.groups.size() > 0);
        } else {
            window.setTimeout(() => {
                this.$('[data-title]').trigger('focus');
                document.execCommand('selectAll', false, null);
            }, 10);
        }

        return this;
    },

    handleTitleChange: function (e) {
        // Set title
        var title = this.$('[data-title]').text().trim();

        // Find out what to do with keyboard
        switch (e.which) {
            case 13:
                this.model.save({title: title}, {
                    success: () => {
                        this.render();
                    }
                });
                return false;
                break;
            case 27:
                this.model.destroy();
                break;
            default:
                break;
        }
    },

    handleClick: function (e) {
        e.stopPropagation();
        e.preventDefault();

        // Toggle Tree
        this.toggleTree();

        // Load the group if it isn’t already loaded
        if (!this.$(e.currentTarget).parent().hasClass('active') && !this.model.isNew()) {
            Buttercup.Events.trigger('groupSelected', this.model);
        }
    },

    addGroup: function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.model.groups.add(new Group());
        this.expandTree();
    },

    removeGroup: function(e) {
        e.preventDefault();
        e.stopPropagation();

        confirmDialog(
            `Delete ${this.model.get("title")}?`,
            `Are you sure you want to delete this group? This cannot be undone.`,
            (result) => {
                if (result === true) {
                    this.model.destroy();
                }
            }
        );
    },

    destroy: function () {
        this.$el.remove();
    },

    expandTree: function() {
        this.$el.find("> ul").show();
        this.$el.addClass("expanded has-groups");
    },

    toggleTree: function() {
        this.$el.find("> ul").toggle();
        this.$el.toggleClass("expanded");
    }
});

const SidebarGroupView = Backbone.View.extend({
    className: 'nav-group',
    tagName: 'ul',

    initialize: function (options) {
        this.options = options;
        this.collection.on('add', this.addGroup, this);
        this.views = [];
    },

    render: function () {
        _.each(this.collection.models, (model) => {
            this.addGroup(model);
        });
        return this;
    },

    addGroup: function(model) {
        var view = new SidebarGroupItemView({
            model: model,
            parentView: this.options.parentView
        });
        this.$el.append(view.render().el);
        this.views.push(view);
    }
});

// Export View
export default Backbone.View.extend({
    className: 'grid-block sidebar medium-3',

    events: {
        'click .group-add': 'addGroup'
    },

    initialize: function () {
        this.template = _.template(Tpl);
        this.groups = new Groups();
        this.groups.on('reset', this.render, this);
        this.groups.on('add', this.handleAdd, this);
        this.groups.on('remove', this.handleRemove, this);
        this.groups.fetch({reset: true});

        Buttercup.Events.on('groupSelected', this.handleSelectedGroup, this);
    },

    render: function () {
        this.$el.html(this.template());

        if (this.groups.size()) {
            var groupView = new SidebarGroupView({
                collection: this.groups,
                parentView: this
            });
            this.$('.groups').show();
            this.$('nav').html(groupView.render().el);
            this.$("a[data-id]:first").click();
        } else {
            this.$('.groups').hide();
            this.$('.empty').html((new EmptyStateView({type: "groups"})).render().el);
        }

        return this;
    },

    handleSelectedGroup: function (model) {
        this.$('.active').removeClass('active');
        this.$('a[data-id="'+model.id+'"]').parent().addClass('active');
    },

    handleAdd: function() {
        if (this.groups.size() === 1) {
            this.render();
        }
    },

    handleRemove: function() {
        if (this.groups.size() === 0) {
            this.render();
            Buttercup.Events.trigger("groupLoaded", false);
        }
    },

    addGroup: function (e) {
        e.preventDefault();
        this.groups.add(new Group());
    }
});
