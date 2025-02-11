/* Map of GeoJSON data from 2025_TRANS_ATLANTIC_LAS_PALMAS_TO_ANTIGUA.gpx */
var middleCoord = null;  // Global variable to store the middle coordinate

var messageIcon = L.icon({
    iconUrl: 'img/message.png',  // Path to your PNG file
    iconSize: [30, 30],             // Set the icon size to 30x30 pixels
    iconAnchor: [15, 15]            // Center the icon on its coordinates
});

var greenIcon = L.icon({
    iconUrl: 'img/traffic_light_green.svg', // path to your green SVG
    iconSize: [30, 30],  // must match the SVG's viewBox or your chosen size
    iconAnchor: [15, 15] // center the icon on its coordinate
  });
  
  var redIcon = L.icon({
    iconUrl: 'img/traffic_light_red.svg',   // path to your red SVG
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
//declare map var in global scope
var map;
var Esri_OceanBasemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri',
	maxZoom: 13
});

// playing around with layering and transparency
var Stadia_StamenWatercolor = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.{ext}', {
	minZoom: 1,
	maxZoom: 16,
    opacity: 0.5,
	attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	ext: 'jpg'
});
  
//function to instantiate the Leaflet map
function createMap(){
    //create the map
    map = L.map('map', {
        center: [20, 0],
        zoom: 4
    });
    Esri_OceanBasemap.addTo(map);
    Stadia_StamenWatercolor.addTo(map);
    //call getData function
    getData();
};

function onEachFeature(feature, layer) {
    //no property named popupContent; instead, create html string with all properties
    var popupContent = "";
    if (feature.properties) {
        //loop to add feature property names and values to html string
        for (var property in feature.properties){
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }
        layer.bindPopup(popupContent);
    };
};

function getData() {
    // Load the GPX data
    fetch("data/2025_TRANS_ATLANTIC_LAS_PALMAS_ANTIGUA.gpx")
    .then(response => response.text())
    .then(gpxText => {
        const geojson = gpxToGeoJSON(gpxText);

        // Create a GeoJSON layer for the GPX data (waypoints + lines).
        L.geoJson(geojson, {
            style: function (feature) {
                if (feature.geometry.type === "LineString") {
                    return {
                        color: "#000000",    // Red color for the line
                        weight: 4,                       
                        dashArray: "5, 5",          // Line thickness
                        opacity: 0.7         // Line opacity
                    };
                }
            },
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: messageIcon });  // Use the custom icon
            },
            onEachFeature: onEachFeature
        }).addTo(map);        
        

        // Loop through each feature to check for LineString (i.e., tracks).
        geojson.features.forEach(feature => {
            if (feature.geometry.type === "LineString") {
                const coords = feature.geometry.coordinates;
                if (coords.length > 0) {
                    // Coordinates are in [lon, lat] order.
                    const originLatLng = L.latLng(coords[0][1], coords[0][0]);
                    const destinationLatLng = L.latLng(
                        coords[coords.length - 1][1],
                        coords[coords.length - 1][0]
                    );
                    // Find the middle coordinate
                    middleCoord = findMiddleOfLineString(coords);
                    map.setView([middleCoord.lat, middleCoord.lng], 5);

                    // Create markers for origin (green) and destination (red).
                    var originMarker = L.marker(originLatLng, { icon: greenIcon }).addTo(map);
                    var destinationMarker = L.marker(destinationLatLng, { icon: redIcon }).addTo(map);

                    // Reverse geocode to get an address and update each popup.
                    reverseGeocode(originLatLng, function(address) {
                        originMarker.bindPopup("<strong>Origin:</strong><br>" + address);
                    });
                    reverseGeocode(destinationLatLng, function(address) {
                        destinationMarker.bindPopup("<strong>Destination:</strong><br>" + address);
                    });
                }
            }
        });
    })
    .catch(error => console.error("Error loading GPX:", error));
}


/**
 * Reverse geocodes a given Leaflet LatLng using the Nominatim API.
 * @param {L.LatLng} latlng - The latitude and longitude of the point.
 * @param {Function} callback - Function to call with the resulting address.
 */
function reverseGeocode(latlng, callback) {
    // Nominatim requires a custom User-Agent or Referer header in production.
    // This example is for development/testing purposes.
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`;
    fetch(url)
       .then(response => response.json())
       .then(data => {
           const address = data.display_name || "Address not found";
           callback(address);
       })
       .catch(error => {
           console.error("Error during reverse geocoding:", error);
           callback("Unknown location");
       });
}


/**
 * Escapes ampersands that are not already part of an escape sequence.
 * @param {string} text - The raw XML string.
 * @returns {string} - The cleaned XML string.
 */
function cleanXml(text) {
    // The regex finds '&' not followed by 'amp;', 'lt;', 'gt;', 'quot;', or 'apos;'
    return text.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
  }
  
  /**
   * Converts a GPX string to a GeoJSON FeatureCollection.
   * @param {string} gpxText - The raw GPX XML as a string.
   * @returns {Object} - A GeoJSON FeatureCollection.
   */
  function gpxToGeoJSON(gpxText) {
    // Clean the XML text
    const cleanedText = cleanXml(gpxText);
  
    // Parse the cleaned XML string.
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(cleanedText, "application/xml");
  
    // Check for XML parsing errors.
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Error parsing GPX XML.");
    }
  
    // Determine the namespace (if any).
    const ns = xmlDoc.documentElement.namespaceURI;
  
    const features = [];
  
    // Helper to get elements by tag name with namespace if available.
    function getElements(parent, tagName) {
      return ns
        ? parent.getElementsByTagNameNS(ns, tagName)
        : parent.getElementsByTagName(tagName);
    }
  
    // Process track points (<trk>/<trkseg>/<trkpt>) into a LineString feature.
    const trkElements = getElements(xmlDoc, "trk");
    for (let trk of trkElements) {
      const trksegElements = getElements(trk, "trkseg");
      for (let trkseg of trksegElements) {
        const trkptElements = getElements(trkseg, "trkpt");
        const coords = [];
        for (let trkpt of trkptElements) {
          const lat = parseFloat(trkpt.getAttribute("lat"));
          const lon = parseFloat(trkpt.getAttribute("lon"));
          if (isNaN(lat) || isNaN(lon)) {
            console.error("Missing or invalid latitude or longitude attribute in a track point.");
            continue;
          }
          // GeoJSON requires [longitude, latitude]
          coords.push([lon, lat]);
        }
        if (coords.length) {
          features.push({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: coords,
            },
            properties: {},
          });
        }
      }
    }
  
    // Process waypoints (<wpt>) into Point features.
    const wptElements = getElements(xmlDoc, "wpt");
    for (let wpt of wptElements) {
      const lat = parseFloat(wpt.getAttribute("lat"));
      const lon = parseFloat(wpt.getAttribute("lon"));
      if (isNaN(lat) || isNaN(lon)) {
        console.error("Missing or invalid latitude or longitude attribute in a waypoint.");
        continue;
      }
      const properties = {};
  
      const nameElem = getElements(wpt, "name")[0];
      if (nameElem && nameElem.textContent) {
        properties.name = nameElem.textContent.trim();
      }
  
      const timeElem = getElements(wpt, "time")[0];
      if (timeElem && timeElem.textContent) {
        properties.time = timeElem.textContent.trim();
      }
  
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lon, lat],
        },
        properties: properties,
      });
    }
  
    return {
      type: "FeatureCollection",
      features: features,
    };
  }

  function findMiddleOfLineString(coords) {
    if (coords.length === 0) return null;

    // Find the middle index
    const middleIndex = Math.floor(coords.length / 2);

    // Coordinates are [lon, lat] format
    const middleCoord = {
        lat: coords[middleIndex][1],
        lng: coords[middleIndex][0]
    };

    return middleCoord;
}

  
  document.addEventListener('DOMContentLoaded',createMap)  