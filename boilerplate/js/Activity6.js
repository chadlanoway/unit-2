// Declare map variable globally so all functions have access
var map;
var minValue;

// Step 1: Create the map
function createMap(){
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

// Calculate the minimum value 
function calculateMinValue(data){

    var allValues = [];
    
    // Loop through each city
    for (var city of data.features){
        // Loop through each year (1985 to 2015 by 5)
        for (var year = 1985; year <= 2015; year += 5){
            // Get population for current year
            var value = city.properties[String(year)];
            // Only include nonzero values, there's a few <1000 pop so 0
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
    
    // Cap the maximum radius 
    var maxRadius = 20; 
    return Math.min(radius, maxRadius);
}

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes) {
    // Determine which attribute to visualize using the first attribute in the array
    var attribute = attributes[0];
    console.log(attribute); // Check which attribute is being used

    // Create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    // Get the attribute value and convert it to a number
    var attValue = Number(feature.properties[attribute]);

    // Calculate the radius based on the attribute value
    options.radius = calcPropRadius(attValue);

    // Create the circle marker
    var layer = L.circleMarker(latlng, options);

    // Build the popup content string
    var popupContent = "<p><b>City:</b> " + feature.properties["Region, subregion, country or area"] + "</p>";
    popupContent += "<p><b>Population in " + attribute + ":</b> " + feature.properties[attribute] + " thousand</p>";

    // Bind the popup to the layer
    layer.bindPopup(popupContent);

    return layer;
}

//Add circle markers for point features to the map
function createPropSymbols(data, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);

    //Make a layer to pass to getBounds
    var geojsonLayer = L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
    // Zoom the map to the bounds of the geojson layer
    map.fitBounds(geojsonLayer.getBounds());
};

function getData(){
    fetch("data/LatPop.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            //create an attributes array
           var attributes = processData(json);
           minValue = calculateMinValue(json);
           createPropSymbols(json, attributes);
           createSequenceControls(attributes);
       })
}

function createSequenceControls(attributes){
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend', slider);

    // Set slider attributes
    var rangeSlider = document.querySelector(".range-slider");
    rangeSlider.max = attributes.length - 1; // using length instead of a hard-coded value
    rangeSlider.min = 0;
    rangeSlider.value = 0;
    rangeSlider.step = 1;

    // Add buttons
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse">Reverse</button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward">Forward</button>');

    // Click listener for buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = parseInt(rangeSlider.value);
            if (step.id == 'forward'){
                index++;
                // Wrap around if past the last attribute
                index = index > attributes.length - 1 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                // Wrap around if below the first attribute
                index = index < 0 ? attributes.length - 1 : index;
            }
            // Update slider and proportional symbols
            rangeSlider.value = index;
            updatePropSymbols(attributes[index]);
        });
    });

    // Input listener for slider
    rangeSlider.addEventListener('input', function(){
        var index = parseInt(this.value);
        updatePropSymbols(attributes[index]);
    });
}


function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        // ugly but works for this
        if (/^\d{4}$/.test(attribute)) {
            attributes.push(attribute);
        }
    };

    //check result
    console.log(attributes);

    return attributes;
};

//Step 10: Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute) {
    map.eachLayer(function(layer) {
        if (layer.feature && layer.feature.properties[attribute]) {
            // Access feature properties
            var props = layer.feature.properties;

            // Update each feature's radius based on the new attribute value
            var radius = calcPropRadius(Number(props[attribute]));
            layer.setRadius(radius);

            // Build the updated popup content string
            var popupContent = "<p><b>City:</b> " + props["Region, subregion, country or area"] + "</p>";
            popupContent += "<p><b>Population in " + attribute + ":</b> " + props[attribute] + " thousand</p>";

            // If the layer already has a popup, update its content
            var popup = layer.getPopup();
            if (popup) {
                popup.setContent(popupContent).update();
            }
        }
    });
}


document.addEventListener('DOMContentLoaded', createMap);
