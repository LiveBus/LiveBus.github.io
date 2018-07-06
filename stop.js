var url_base = "https://api-v3.mbta.com/"; 

// Constructor
function Stop(stopID) {
    this.stopID = stopID;
    this.requests = {};
    this.pending = {};
}

Stop.prototype.init = function() {
    this.update_static();
    this.update();
}

// update the static data (stop title, routes, etc)
Stop.prototype.update_static = function() {
    // Get route data
    this.send_json("routes");

    // Get general stop data
    this.send_json("stops", "/");
}

// update the dynamic data (predictions, alerts, etc)
Stop.prototype.update_dynamic = function() {
    console.log("updating stop: " + this.stopID);

    // Get prediction data
    this.send_json("predictions");
}

// General JSON reqest send -- searches for stopID
// name must be the first string in the url (routes, predictions, etc)
// filter can be left blank, or "/", etc
// Adds "name: [json response]" as attribute to object
Stop.prototype.send_json = function(name, filter = "?filter[stop]=") {
    // Clone this for use within JSON request
    var cthis = this;

    // Add to pending list
    cthis.pending[name] = true;

    // Send request and add to requests list
    cthis.requests[name] = $.getJSON(
            url_base + name + filter + this.stopID,
            function(data) {
                cthis[name] = data.data;
            }
            )
        .always(function() {
            cthis.pending[name] = false;
        });
}

// Checks if all of the requests are done
Stop.prototype.requests_done = function() {
    for(var req in this.pending) {
        if(this.pending[req]) {
            return false;
        }
    }
    console.log("updated stop " + this.stopID + " (" + (new Date()) + ")");
    return true;
}

// Get the title from the already pulled data
Stop.prototype.get_title = function() {
    return this["stops"].attributes.name;
}

// Get the predictions in html list format from already pulled data
Stop.prototype.get_predictions = function(n=3) {
    var pred = {};
    
    // Get all of the routes
    for(var i = 0; i < this["routes"].length; i++) {
        pred[this["routes"][i].attributes.short_name] = [];
    }

    // Sort predictions into routes
    var now = new Date();
    for(var i = 0; i < this["predictions"].length; i++) {
        var p = this["predictions"][i];
        pred[p.relationships.route.data.id].push(
            Math.floor((new Date((p.attributes.departure_time == null ? p.attributes.arrival_time : p.attributes.departure_time)) - now)/60000));
    }

    // htmlify the predictions
    var html = "<ul>";
    for(key in pred) {
        html += "<li>" + key + "</li><ul>";
        for(var i = 0; i < n && i < pred[key].length; i++) {
            html += "<li>" + pred[key][i] + "</li>";
        }
        html += "</ul>";
    }
    html += "</ul>";

    return html;
}

// Update handler
Stop.prototype.update_handler = function() {
    console.log("unhandled update");
}

// Update and run function when done
Stop.prototype.update = function(t=10) {
    this.update_dynamic();
    clearInterval(this.interval);
    var cthis = this;
    this.interval = setInterval(function () {
        if(cthis.requests_done()) {
            clearInterval(cthis.interval);
            cthis.update_handler();
        }
    }, t);
}
