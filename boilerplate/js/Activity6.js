class MapApp {
    constructor(mapId, dataUrl) {
      this.mapId = mapId;
      this.dataUrl = dataUrl;
      this.map = null;
      this.minValue = null;
      this.attributes = [];
      this.initMap();
    }
  
    // initialize the map and load data
    initMap() {
      this.map = L.map(this.mapId, {
        center: [0, 0],
        zoom: 2
      });
  
      // add OSM base tile layer
      L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      }).addTo(this.map);
  
      this.getData();
    }
  
    // fetch and process the geojson
    getData() {
      fetch(this.dataUrl)
        .then(response => response.json())
        .then(data => {
          this.attributes = this.processData(data);
          this.minValue = this.calculateMinValue(data);
          this.createPropSymbols(data);
          this.createSequenceControls();
        });
    }
  
    // array of attributes 
    processData(data) {
      let attributes = [];
      let properties = data.features[0].properties;
      for (let attribute in properties) {
        if (/^\d{4}$/.test(attribute)) {
          attributes.push(attribute);
        }
      }
      console.log("Attributes:", attributes);
      return attributes;
    }
  
    // calculate the minimum population value
    calculateMinValue(data) {
      let allValues = [];
      data.features.forEach(city => {
        for (let year = 1985; year <= 2015; year += 5) {
          let value = city.properties[String(year)];
          if (value > 0) {
            allValues.push(value);
          }
        }
      });
      const minValue = Math.min(...allValues);
      console.log("minValue:", minValue);
      return minValue;
    }
  
    // calculate the radius of each proportional symbol
    calcPropRadius(attValue) {
      const minRadius = 2;
      if (attValue === 0) {
        return minRadius * 0.5;
      }
      let radius = 1.0083 * Math.pow(attValue / this.minValue, 0.5715) * minRadius;
      const maxRadius = 20;
      return Math.min(radius, maxRadius);
    }
  
    // create circle markers for each point
    pointToLayer(feature, latlng, attribute) {
      const options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      };
  
      let attValue = Number(feature.properties[attribute]);
      options.radius = this.calcPropRadius(attValue);
  
      let layer = L.circleMarker(latlng, options);
      
      // format the popup
      const popupContent = new PopupContent(feature.properties, attribute);
      layer.bindPopup(popupContent.formatted);
  
      return layer;
    }
  
    // create and add the geojson layer
    createPropSymbols(data) {
      const geojsonLayer = L.geoJson(data, {
        pointToLayer: (feature, latlng) => this.pointToLayer(feature, latlng, this.attributes[0])
      }).addTo(this.map);
      
      // zoom the map to the bounds 
      this.map.fitBounds(geojsonLayer.getBounds());
      
      // Store the geojsonLayer reference if you later need to update each feature
      this.geojsonLayer = geojsonLayer;
    }
  
    // update the proportional symbols for a new attribute 
    updatePropSymbols(attribute) {
      this.geojsonLayer.eachLayer(layer => {
        if (layer.feature && layer.feature.properties[attribute]) {
          const props = layer.feature.properties;
          const newRadius = this.calcPropRadius(Number(props[attribute]));
          layer.setRadius(newRadius);
  
          // update popup
          const popupContent = new PopupContent(props, attribute);
          let popup = layer.getPopup();
          if (popup) {
            popup.setContent(popupContent.formatted).update();
          }
        }
      });
    }
  
    // slider and button controls
    createSequenceControls() {
      const panel = document.querySelector("#panel");
  
      // slider element
      const slider = document.createElement("input");
      slider.setAttribute("type", "range");
      slider.classList.add("range-slider");
      slider.max = this.attributes.length - 1;
      slider.min = 0;
      slider.value = 0;
      slider.step = 1;
      panel.appendChild(slider);
  
      // forward and reverse buttons
      const forwardBtn = document.createElement("button");
      forwardBtn.textContent = "Forward";
      forwardBtn.classList.add("step");
      forwardBtn.id = "forward";
      panel.appendChild(forwardBtn);
  
      const reverseBtn = document.createElement("button");
      reverseBtn.textContent = "Reverse";
      reverseBtn.classList.add("step");
      reverseBtn.id = "reverse";
      panel.appendChild(reverseBtn);
  
      // button click events
      panel.querySelectorAll(".step").forEach(btn => {
        btn.addEventListener("click", () => {
          let index = parseInt(slider.value);
          if (btn.id === "forward") {
            index++;
            index = index > this.attributes.length - 1 ? 0 : index;
          } else if (btn.id === "reverse") {
            index--;
            index = index < 0 ? this.attributes.length - 1 : index;
          }
          slider.value = index;
          this.updatePropSymbols(this.attributes[index]);
        });
      });
  
      // slider listener
      slider.addEventListener("input", function () {
        const index = parseInt(this.value);
        this.updatePropSymbols(this.attributes[index]);
      }.bind(this));
    }
  }
  
  // class to format popup HTML content
  class PopupContent {
    constructor(properties, attribute) {
      this.properties = properties;
      this.attribute = attribute;
      this.year = attribute;
      this.population = properties[attribute];
      this.formatted = `<p><b>City:</b> ${this.properties["Region, subregion, country or area"]}</p>
                        <p><b>Population in ${this.year}:</b> ${this.population} million</p>`;
    }
  }
  
  // Instantiate the MapApp when the DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    const app = new MapApp("map", "data/LatPop.geojson");
  });
  