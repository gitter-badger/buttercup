"use strict";

import _ from 'underscore';
import Backbone from 'app/lib/backbone.buttercup';
import Entry from 'app/models/entry';
import fuzzysearch from 'fuzzysearch'

export default Backbone.Collection.extend({
    buttercup: new Backbone.Buttercup('entries'),
    model: Entry,

    initialize: function(models, options) {
        this.options = options;
    },

    parse: function(response) {
        return response.map(function(item) {
            for (var key in item.properties) {
                item[key] = item.properties[key];
            }
            delete item.properties;
            return item;
        });
    },

    search: function (letters) {
        if (letters === "") {
            return this;
        }

        return this.filter(function(data) {
            return fuzzysearch(letters.toLowerCase(), data.get('title').toLowerCase());
        });
    }
});
