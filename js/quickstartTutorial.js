// creates a new map instance, and setView centers and zooms the map per the parameters
var map = L.map('map').setView([51.505, -0.09], 13);

// set up a tile layer with a url to a template and any needed options, then add it to the map
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// create a marker at the specified coordinates, then add it to map
var marker = L.marker([51.5, -0.09]).addTo(map);

// make a circle overlay with  center, style options, and radius parameters, then add it
var circle = L.circle([51.508, -0.11], {
    color: 'red',       
    fillColor: '#f03',   
    fillOpacity: 0.5,     
    radius: 500         
}).addTo(map);

// make a polygon with an array of lat/lon (lon/lat if mapbox) points, add it to map
var polygon = L.polygon([
    [51.509, -0.08],
    [51.503, -0.06],
    [51.51, -0.047]
]).addTo(map);

// bind a popup containing HTML to the marker and open it
marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();

// same with the circle and polygon so that when clicked, they display the text
circle.bindPopup("I am a circle.");
polygon.bindPopup("I am a polygon.");

// create a standalone popup with parameters
var popup = L.popup()
    .setLatLng([51.513, -0.09])        
    .setContent("I am a standalone popup.") 
    .openOn(map); // this closes other pop ups and isnt bound to a marker                      

// empty popup for later
var popup = L.popup();

// triggers when the map is clicked.
function onMapClick(e) { // <-- leaflet passes an event object "e" that has details of the click, like lat/lon
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
}
    
// listen for clicks on the map and fire the above function
map.on('click', onMapClick);
