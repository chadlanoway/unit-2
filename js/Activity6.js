var dataStats = {};// datamanager class handles fetching and processing data
class DataManager {
    constructor(dataUrl) {
        this.dataUrl = dataUrl;
    }

    //function to fetch and process data
    fetchData() {
        return fetch(this.dataUrl)
            .then(response => response.json())
            .then(data => {
                // calculate stats on the data
                this.calcStats(data); // This will compute and store stats in your dataStats object
    
                const attributes = this.getAttributes(data);
                // Optionally, if you want to return specific stats like minValue,
                // you can reference dataStats.min if that's what you're after.
                return { data, attributes, stats: dataStats };
            });
    }    

    //function to build an array of attributes from the data
    getAttributes(data) {
        let attributes = [];
        let properties = data.features[0].properties;
        for (let attribute in properties) {
            if (/^\d{4}$/.test(attribute)) {
                attributes.push(attribute);
            }
        }
        return attributes;
    }
    /*
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
        return Math.min(...allValues);
    }
    */
    // function to get mean, max, min from the years
    calcStats(data) {
        var allValues = [];
        for (var city of data.features) {
            for (var year = 1985; year <= 2015; year += 5) {
                var value = city.properties[String(year)];
                // Only push values greater than 0 <-- need a cleaner way to deal with divide by 0 issue
                if (value > 0) {
                    allValues.push(value);
                }
            }
        }
        dataStats.min = Math.min(...allValues);
        dataStats.max = Math.max(...allValues);
        var sum = allValues.reduce((a, b) => a + b, 0);
        dataStats.mean = sum / allValues.length;
    }
    
}

 

// mapapp class does the map logic
class MapApp {
    constructor(mapId, dataUrl) {
        this.mapId = mapId;
        this.dataUrl = dataUrl;
        this.map = null;
        this.minValue = null;
        this.attributes = [];
        this.geojsonLayer = null;
        this.dataManager = new DataManager(dataUrl);
        this.initMap();
    }

    // initialize the map and load data
    initMap() {
        this.map = L.map(this.mapId, {
            center: [0, 0],
            zoom: 2
        });

        // add osm base tile layer and credit the data source
        L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
              '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Data: <a href="https://population.un.org/wup/downloads" target="_blank">United Nations World Population Prospects</a>'
      }).addTo(this.map);
      
        this.loadData();
    }

    // function to use datamanager to fetch and process data
    loadData() {
        this.dataManager.fetchData().then(({ data, attributes, stats }) => {
            this.attributes = attributes;
            this.minValue = stats.min;  // now set minValue from stats
            this.createPropSymbols(data);
            this.createSequenceControls();
            this.createLegend(attributes);
        });        
    }

    //function to calculate the radius of each proportional symbol
    calcPropRadius(attValue) {
        const minRadius = 2;
        const maxRadius = 40;
        if (attValue <= 0) return minRadius * 0.5;
        // Using logarithmic scaling:
        let scale = (Math.log(attValue) - Math.log(this.minValue)) / (Math.log(dataStats.max) - Math.log(this.minValue));
        let radius = minRadius + scale * (maxRadius - minRadius);
        return radius;
    }
    
    //function to create circle markers for each point
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
        const popupContent = new PopupContent(feature.properties, attribute);
        layer.bindPopup(popupContent.formatted);

        return layer;
    }

    //function to create and add the geojson layer
    createPropSymbols(data) {
        this.geojsonLayer = L.geoJson(data, {
            pointToLayer: (feature, latlng) =>
                this.pointToLayer(feature, latlng, this.attributes[0])
        }).addTo(this.map);

        // zoom the map to the bounds of the geojson layer
        this.map.fitBounds(this.geojsonLayer.getBounds());
    }

    //function to update the proportional symbols for a new attribute
    updatePropSymbols(attribute) {
        this.geojsonLayer.eachLayer(layer => {
            if (layer.feature && layer.feature.properties[attribute] !== undefined) {
                const props = layer.feature.properties;
                const newRadius = this.calcPropRadius(Number(props[attribute]));
                layer.setRadius(newRadius);
                const popupContent = new PopupContent(props, attribute);
                let popup = layer.getPopup();
                if (popup) {
                    popup.setContent(popupContent.formatted).update();
                }
            }
        });        
        // update the legend with the current attribute
        this.updateLegend(attribute);
    }
    // helper to get attribute stats
    getAttributeStats(attribute) {
        let values = [];
        this.geojsonLayer.eachLayer(layer => {
            let val = Number(layer.feature.properties[attribute]);
            if (!isNaN(val) && val > 0) {
              values.push(val);
            }
          });
          
        return {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length
        };
      }
      
/*
    // add the legend and store a reference to its container
    createLegend(attributes) {
        let LegendControl = L.Control.extend({
            options: {
                position: "bottomright"
            },
            onAdd: (map) => {
                let container = L.DomUtil.create("div", "legend-control-container");
                container.innerHTML = "<h4>Population Legend</h4>";
                container.innerHTML += "<p id='legend-year'>year: " + attributes[0] + "</p>";
                return container;
            }
        });

        // add the legend control to the map and store the container reference
        this.legendControl = new LegendControl();
        this.map.addControl(this.legendControl);

        // store the legend container element for later updates
        this.legendContainer = document.querySelector(".legend-control-container");
    }
*/

//function to make a legend that syncs the data with slider
createLegend(attributes) {
  const self = this;
  const LegendControl = L.Control.extend({
    options: { position: "bottomright" },
    onAdd: function () {
      // 1) Create the container
      const container = L.DomUtil.create("div", "legend-control-container");
      container.innerHTML = `
        <p class="temporalLegend">
          Population in <span class="year">${attributes[0]}</span>
        </p>`;

      // 2) Calculate stats for the initial attribute
      const stats = self.getAttributeStats(attributes[0]);
      const dataStatsLocal = {
        max: stats.max,
        mean: stats.mean,
        min: stats.min
      };

      // 3) make an svg thats tall enough for circles
        const svgWidth = 300;
        const svgHeight = 150;  
        const baseY = 120;      // careful, this can clip the image
        const circleX = 60;
        const textX = 150;

      // initial svg string
      let svg = `<svg id="attribute-legend" width="${svgWidth}" height="${svgHeight}">`;

      // 4) display circles in the order: max, mean, min
      const circles = ["max", "mean", "min"];

      // draw each circle near the bottom
      circles.forEach(key => {
        const value = dataStatsLocal[key];
        const radius = self.calcPropRadius(value);
        const cy = baseY - radius;

        svg += `
          <circle 
            class="legend-circle"
            id="${key}"
            cx="${circleX}"
            cy="${cy}"
            r="${radius}"
            fill="#F47821"
            fill-opacity="0.8"
            stroke="#000000"
          />
        `;
      });
      //reverse the label order
      const labelOrder = [...circles].reverse();
      // 5) place each text label near the bottom as well
      const lineSpacing = 20;
      let firstLineY = baseY - 5;
      //format the data 
      labelOrder.forEach((key, i) => {
        const value = dataStatsLocal[key];
        const formattedValue = formatPopulation(value);

        const textY = firstLineY - i * lineSpacing;

        svg += `
          <text
            id="${key}-text"
            x="${textX}"
            y="${textY}"
            font-size="14"
            fill="#000"
            dominant-baseline="alphabetic"
          >
            ${formattedValue}
          </text>
        `;
      });

      // Close the SVG string
      svg += "</svg>";

      // Insert the SVG into the container
      container.insertAdjacentHTML("beforeend", svg);

      return container;
    }
  });

  // Add the legend control to the map
  this.map.addControl(new LegendControl());
  // Store a reference for updates
  this.legendContainer = document.querySelector(".legend-control-container");
}

// funnction to update the legend labels when the button or slider is interacted with
updateLegend(attribute) {
    if (this.legendContainer) {
      // update the legend year text
      this.legendContainer.querySelector(".year").innerHTML = attribute;
  
      // get new stats for the current attribute
      const stats = this.getAttributeStats(attribute);
      const circleValues = { max: stats.max, mean: stats.mean, min: stats.min };
  
      //size the circles
      Object.keys(circleValues).forEach(key => {
        const newRadius = this.calcPropRadius(circleValues[key]);
        const circleElem = this.legendContainer.querySelector("#" + key);
        if (circleElem) {
          circleElem.setAttribute("r", newRadius);
        }
      });
  
      // update each legend text label with the new population value
      const circles = ["max", "mean", "min"];
      circles.forEach(key => {
        const textElem = this.legendContainer.querySelector("#" + key + "-text");
        if (textElem) {
          const value = circleValues[key];
          const formattedValue = formatPopulation(value);
          textElem.textContent = formattedValue;
        }
      });
    }
  }
  

    // function to add the sequence control to the map and set up its events
    createSequenceControls() {
        // add the custom sequencecontrol to the map
        this.map.addControl(new SequenceControl({ position: "bottomleft" }));

        // set up the slider properties after it's been added to the dom
        let slider = document.querySelector(".range-slider");
        slider.max = this.attributes.length - 1;
        slider.min = 0;
        slider.value = 0;
        slider.step = 1;

        // add event listener for the slider
        slider.addEventListener("input", (e) => {
            let index = parseInt(e.target.value, 10);
            this.updatePropSymbols(this.attributes[index]);
        });

        // add event listener for the reverse button
        document.querySelector("#reverse").addEventListener("click", () => {
            let index = parseInt(slider.value, 10);
            index = index <= 0 ? this.attributes.length - 1 : index - 1;
            slider.value = index;
            this.updatePropSymbols(this.attributes[index]);
        });

        // add event listener for the forward button
        document.querySelector("#forward").addEventListener("click", () => {
            let index = parseInt(slider.value, 10);
            index = index >= this.attributes.length - 1 ? 0 : index + 1;
            slider.value = index;
            this.updatePropSymbols(this.attributes[index]);
        });
    }
}

// sequencecontrol class extends l.control
class SequenceControl extends L.Control {
    constructor(options) {
        super(options);
    }

    // onadd is called when the control is added to the map
    onAdd(map) {
        // create the control container div with a specific class name
        let container = L.DomUtil.create("div", "sequence-control-container");

        // disable any mouse event listeners for the container
        L.DomEvent.disableClickPropagation(container);

        // create the slider and insert it into the container
        container.insertAdjacentHTML("beforeend", '<input class="range-slider" type="range">');

        // create additional controls and append them
        container.insertAdjacentHTML("beforeend", '<button class="step" id="reverse">&#9668;</button>');
        container.insertAdjacentHTML("beforeend", '<button class="step" id="forward">&#9658;</button>');

        return container;
    }
}

// popupcontent class formats the popup html content
class PopupContent {
    constructor(properties, attribute) {
      this.properties = properties;
      this.attribute = attribute;
      this.year = attribute;
      // make sure the population value is a number
      this.population = Number(properties[attribute]);
      
      const formattedPopulation = formatPopulation(this.population);
      
      this.formatted =
        `<p><b>city:</b> ${this.properties["Region, subregion, country or area"]}</p>` +
        `<p><b>population in ${this.year}:</b> ${formattedPopulation}</p>`;
    }
  }  

// function to format population values
function formatPopulation(value) {
    if (value >= 1000) {
        return (value / 1000).toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }) + " million";
    } else {
        return value.toLocaleString() + " thousand";
    }
}

// instantiate the mapapp when the dom is loaded
document.addEventListener("DOMContentLoaded", () => {
    const app = new MapApp("map", "data/LatPop.geojson");
});
