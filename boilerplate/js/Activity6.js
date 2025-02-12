// Declare map variable globally so all functions have access
var map;
var minValue;

// Step 1: Create the map
function createMap(){
    // Create the map centered at [0, 0] with zoom level 2
    map = L.map('map', {
        center: [0, 0],
        zoom: 2
    });

    // Add OSM base tile layer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    // Call getData function
    getData();
}

// Calculate the minimum value (using only nonzero values)
function calculateMinValue(data){
    // Create empty array to store all nonzero data values
    var allValues = [];
    
    // Loop through each city
    for (var city of data.features){
        // Loop through each year (1985 to 2015 by 5)
        for (var year = 1985; year <= 2015; year += 5){
            // Get population for current year
            var value = city.properties[String(year)];
            // Only include nonzero values
            if (value > 0) {
                allValues.push(value);
            }
        }
    }
    // Get minimum value from our array
    var minValue = Math.min(...allValues);
    console.log("minValue:", minValue);
    return minValue;
}

// Calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    // Set a smaller base radius to reduce symbol sizes
    var minRadius = 2;

    // If the attribute value is 0, return a very small radius
    if (attValue === 0) {
        return minRadius * 0.5;
    }
    
    // Use the Flannery Appearance Compensation formula with a smaller base
    var radius = 1.0083 * Math.pow(attValue / minValue, 0.5715) * minRadius;
    
    // Cap the maximum radius to avoid very large symbols
    var maxRadius = 20; // Adjust this value as needed
    return Math.min(radius, maxRadius);
}

//function to convert markers to circle markers
function pointToLayer(feature, latlng){
    //Determine which attribute to visualize with proportional symbols
    var attribute = "2010";

    //create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    


     //build popup content string starting with city...Example 2.1 line 24
    var popupContent = "<p><b>City:</b> " + feature.properties["Region, subregion, country or area"] + "</p>";

     //add formatted attribute to popup content string
    var year = attribute;
    popupContent += "<p><b>Population in " + year + ":</b> " + feature.properties[attribute] + " million</p>";               
    //bind the popup to the circle marker
    layer.bindPopup(popupContent);

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: pointToLayer
    }).addTo(map);
};

// Step 2: Import GeoJSON data
function getData(){
    fetch("data/LatPop.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            //calculate minimum data value
            minValue = calculateMinValue(json);
            //call function to create proportional symbols
            createPropSymbols(json);
        });
}

document.addEventListener('DOMContentLoaded', createMap);
