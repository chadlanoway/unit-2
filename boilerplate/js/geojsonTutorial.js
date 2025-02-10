// creates a new map instance, and setView centers and zooms the map per the parameters
var map = L.map('map').setView([39.75621, -104.99404], 5);

// set up a tile layer with a url to a template and any needed options, then add it to the map
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// make a geojson object with a point and properties
var geojsonFeature = {
    "type": "Feature",
    "properties": {
        "name": "Coors Field",
        "amenity": "Baseball Stadium",
        "popupContent": "This is where the Rockies play!"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-104.99404, 39.75621]
    }
};

// make a layer with that variable and add it to map
L.geoJSON(geojsonFeature).addTo(map);

// another geojson vbariable, this time 2 linestring arrays
var myLines = [{
    "type": "LineString",
    "coordinates": [[-100, 40], [-105, 45], [-110, 55]]
}, {
    "type": "LineString",
    "coordinates": [[-105, 40], [-110, 45], [-115, 55]]
}];

// style object that will be applied to the geojson lines
var myStyle = {
    "color": "#ff7800",  
    "weight": 5,         
    "opacity": 0.65      
};

// make a layer with the line variable, apply the style variable, add to map
L.geoJSON(myLines, {
    style: myStyle
}).addTo(map);

// make a blank geojson to use later
var myLayer = L.geoJSON().addTo(map);
// add the feature point variable on the blank geojson
myLayer.addData(geojsonFeature);

// make polygon features with geojson and coordinate arrays
var states = [{
    "type": "Feature",
    "properties": {"party": "Republican"},
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-104.05, 48.99],
            [-97.22,  48.98],
            [-96.58,  45.94],
            [-104.03, 45.94],
            [-104.05, 48.99]
        ]]
    }
}, {
    "type": "Feature",
    "properties": {"party": "Democrat"},
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-109.05, 41.00],
            [-102.06, 40.99],
            [-102.03, 36.99],
            [-109.04, 36.99],
            [-109.05, 41.00]
        ]]
    }
}];

// make a layer from one of the above arrays, style funtion uses 'party' property to return color options, add layer to map
L.geoJSON(states, {
    style: function(feature) {
        switch (feature.properties.party) {
            case 'Republican': return {color: "#ff0000"};
            case 'Democrat':   return {color: "#0000ff"};
        }
    }
}).addTo(map);

// options for styling point features as circle markers
var geojsonMarkerOptions = {
    radius: 8,            
    fillColor: "#ff7800",  
    color: "#000",        
    weight: 1,            
    opacity: 1,           
    fillOpacity: 0.8      
};

// create a geojson layer from the above variable
// pointToLayer option converts points to circle markers 
// add to map
L.geoJSON(geojsonFeature, {
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, geojsonMarkerOptions);
    }
}).addTo(map);

// callback function to pass to leaflet as an option, looks at each feature looking for "popupContent" property, then binds a pop upw ith that content
function onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent);
    }
}

// another gepjson feature representing a point with properties
var geojsonFeature = {
    "type": "Feature",
    "properties": {
        "name": "Coors Field",
        "amenity": "Baseball Stadium",
        "popupContent": "This is where the Rockies play!"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-104.99404, 39.75621]
    }
};

// make a layer with it and pass the callback function to leaflet to bind pop ups, add to map
L.geoJSON(geojsonFeature, {
    onEachFeature: onEachFeature
}).addTo(map);

// makes features with custom property 'show on map'
var someFeatures = [{
    "type": "Feature",
    "properties": {
        "name": "Coors Field",
        "show_on_map": true
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-104.99404, 39.75621]
    }
}, {
    "type": "Feature",
    "properties": {
        "name": "Busch Field",
        "show_on_map": false
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-104.98404, 39.74621]
    }
}];

// pass that to leaflet, use the filter to look for that custom property and add to map if true
L.geoJSON(someFeatures, {
    filter: function(feature, layer) {
        return feature.properties.show_on_map;
    }
}).addTo(map);
