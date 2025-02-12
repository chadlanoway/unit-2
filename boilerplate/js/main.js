/* Map of GeoJSON data from 2025_TRANS_ATLANTIC_LAS_PALMAS_TO_ANTIGUA.gpx */

/*
 *GLOBALS
 */

var middleCoord = null;  // center of linestring

var messageIcon = L.icon({  // log entry icon
    iconUrl: 'img/message.png',  
    iconSize: [30, 30],             
    iconAnchor: [15, 15]           
});

var greenIcon = L.icon({ // origin icon
    iconUrl: 'img/traffic_light_green.svg',
    iconSize: [30, 30],  
    iconAnchor: [15, 15] 
  });
  
  var redIcon = L.icon({    //destination icon
    iconUrl: 'img/traffic_light_red.svg',   
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

// the map
var map;
// bottom layer for bathymetry
var Esri_OceanBasemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri',
	maxZoom: 13
});

// overlay the bottom layer for some color on the land and a bit of water over the bathymetry 
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

// function to get properties as string and make pop-ups
function onEachFeature(feature, layer) {
    var popupContent = "";
    if (feature.properties) {
        for (var property in feature.properties){
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }
        layer.bindPopup(popupContent);
    };
};

/* 
 * function to gather data and make layers
 *
 * 1- fetch a gpx with track points and way points containing text
 * 2- send it to function to convert to geojson linestring/points
 * 3- make an empty line layer with styles
 * 4- make and populate a point layer with pointToLayer
 * 5- run eachFeature to do the pop-ups
 * 6- loop through geojson and:
 * 6-1--- get linestring from the geojson
 * 6-2--- get the first and last set of coords (used for origin/dest)
 * 6-3--- find the center of it findMiddleOfLineString() and set the map view there
 * 6-4--- add origin/dest markers, geocoding to add data to pop-up
 * 7- add some labels, for some reason both the tilesets i like don't seem to have any
 * 
 */
function getData() {
    fetch("data/2025_TRANS_ATLANTIC_LAS_PALMAS_ANTIGUA.gpx") // 1
    .then(response => response.text())
    .then(gpxText => {
        const geojson = gpxToGeoJSON(gpxText);  // 2

        L.geoJson(geojson, {    // 3
            style: function (feature) {
                if (feature.geometry.type === "LineString") {
                    return {
                        color: "#000000",  
                        weight: 4,                       
                        dashArray: "5, 5",      
                        opacity: 0.7       
                    };
                }
            },
            pointToLayer: function (feature, latlng) {  // 4
                return L.marker(latlng, { icon: messageIcon });  
            },
            onEachFeature: onEachFeature    // 5
        }).addTo(map);              

        geojson.features.forEach(feature => {
            if (feature.geometry.type === "LineString") {   // 6-1
                const coords = feature.geometry.coordinates;
                if (coords.length > 0) {
                    const originLatLng = L.latLng(coords[0][1], coords[0][0]); // 6-2
                    const destinationLatLng = L.latLng(
                        coords[coords.length - 1][1],
                        coords[coords.length - 1][0]
                    );
                    middleCoord = findMiddleOfLineString(coords);   // 6-3
                    map.setView([middleCoord.lat, middleCoord.lng], 5);

                    var originMarker = L.marker(originLatLng, { icon: greenIcon }).addTo(map);  // 6-4
                    var destinationMarker = L.marker(destinationLatLng, { icon: redIcon }).addTo(map);

                    handleLocation(originMarker, originLatLng, "Origin");
                    handleLocation(destinationMarker, destinationLatLng, "Destination");                    
                }
            }
        });
    })
    .catch(error => console.error("Error loading GPX:", error));

    var Esri_Boundaries_Labels = L.tileLayer(   // 7
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', 
        {
          attribution: 'Labels © Esri',
          maxZoom: 13,
          opacity: 1
        }
      );
      
      Esri_Boundaries_Labels.addTo(map);
      
}

/*
 *  function to find wiki page using output string from reverseGeocode()
 */
function getWikipediaInfo(placeName, callback) {
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts|pageimages&exintro=true&titles=${encodeURIComponent(placeName)}&pithumbsize=400`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const pages = data.query.pages;
            const page = Object.values(pages)[0]; 

            const description = page.extract || "No description available.";
            const imageUrl = page.thumbnail ? page.thumbnail.source : null;

            callback({ description, imageUrl });
        })
        .catch(error => {
            console.error("Error fetching Wikipedia info:", error);
            callback({ description: "No description available.", imageUrl: null });
        });
}

/*
 *  function to reverse geocode coordinates
 *  don't let advisarial nation states get ahold of my mapbox key....
 */
const MAPBOX_API_KEY = 'pk.eyJ1IjoiNTlub3J0aGx0ZCIsImEiOiJjbHBxc3oyaXUwMzcyMmpycTh4NXhoaXdxIn0.B5kKfrsYmKeyNTAunWK2Yg'; 

function reverseGeocode(latlng, callback) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${latlng.lng},${latlng.lat}.json?access_token=${MAPBOX_API_KEY}&types=poi,place,locality,neighborhood`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.features && data.features.length > 0) {
                const bestMatch = data.features[0];
                const address = bestMatch.place_name || "Address not found";
                callback(address, bestMatch);  
            } else {
                callback("Unknown location", null);
            }
        })
        .catch(error => {
            console.error("Error during Mapbox reverse geocoding:", error);
            callback("Unknown location", null);
        });
}

/*
 *  function to load pop-up with wiki info for a location and bind to a marker
 */
function handleLocation(marker, latlng, label) {
    reverseGeocode(latlng, function (address, feature) {
        const placeName = feature ? feature.text : address;

        getWikipediaInfo(placeName, function (info) {
            if (info.description === "No description available.") {
                searchWikipedia(placeName, function (searchInfo) {
                    const popupContent = `
                        <div class="custom-popup">
                            <strong>${label}: ${searchInfo.title || placeName}</strong><br>${address}<br><br>
                            ${searchInfo.imageUrl ? `<img src="${searchInfo.imageUrl}" style="width:100%;">` : ""}
                            <p>${searchInfo.description}</p>
                        </div>
                    `;
                    marker.bindPopup(popupContent);
                });
            } else {
                const popupContent = `
                    <div class="custom-popup">
                        <strong>${label}: ${placeName}</strong><br>${address}<br><br>
                        ${info.imageUrl ? `<img src="${info.imageUrl}" style="width:100%;">` : ""}
                        <p>${info.description}</p>
                    </div>
                `;
                marker.bindPopup(popupContent);
            }
        });
    });
}

/*
 *  function to retrieve wiki data from page
 */
function searchWikipedia(query, callback) {
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const searchResults = data.query.search;

            if (searchResults.length > 0) {
                // Skip disambiguation pages
                const bestMatch = searchResults.find(result => !result.title.includes("disambiguation")) || searchResults[0];

                getWikipediaInfo(bestMatch.title, callback);
            } else {
                callback({ description: "No description available.", imageUrl: null });
            }
        })
        .catch(error => {
            console.error("Error with Wikipedia search:", error);
            callback({ description: "No description available.", imageUrl: null });
        });
}

/*
 *  helper to escape a bunch of '&' in the gpx
 */
function cleanXml(text) {
    return text.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
  }
  
  /*
   *  converts gpx to geojson
   */
  function gpxToGeoJSON(gpxText) {
  
    const cleanedText = cleanXml(gpxText);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(cleanedText, "application/xml");
  
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Error parsing GPX XML.");
    }
    // look for xmlns tag at root
    const ns = xmlDoc.documentElement.namespaceURI;
  
    const features = [];
  
    /*
    *  helper in case namspace (xmlns) is in the gpx
    */
    function getElements(parent, tagName) {
      return ns
        ? parent.getElementsByTagNameNS(ns, tagName)
        : parent.getElementsByTagName(tagName);
    }
  
    // make track points (<trk>/<trkseg>/<trkpt>) into a linestring
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
  
    // make waypoints (<wpt>) into points
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

/*
 *  helper to find center coord of linestring
 */
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