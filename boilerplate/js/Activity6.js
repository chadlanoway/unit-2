// datamanager class handles fetching and processing data
class DataManager {
    constructor(dataUrl) {
        this.dataUrl = dataUrl;
    }

    // fetch and process data
    fetchData() {
        return fetch(this.dataUrl)
            .then(response => response.json())
            .then(data => {
                const attributes = this.getAttributes(data);
                const minValue = this.calculateMinValue(data);
                return { data, attributes, minValue };
            });
    }

    // build an array of attributes from the data
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

        // add osm base tile layer
        L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; <a href="http://www.openstreetmap.org/copyright">openstreetmap contributors</a>'
        }).addTo(this.map);

        this.loadData();
    }

    // use datamanager to fetch and process data
    loadData() {
        this.dataManager.fetchData().then(({ data, attributes, minValue }) => {
            this.attributes = attributes;
            this.minValue = minValue;
            this.createPropSymbols(data);
            this.createSequenceControls();
            // call createlegend passing the attributes array
            this.createLegend(attributes);
        });
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
        const popupContent = new PopupContent(feature.properties, attribute);
        layer.bindPopup(popupContent.formatted);

        return layer;
    }

    // create and add the geojson layer
    createPropSymbols(data) {
        this.geojsonLayer = L.geoJson(data, {
            pointToLayer: (feature, latlng) =>
                this.pointToLayer(feature, latlng, this.attributes[0])
        }).addTo(this.map);

        // zoom the map to the bounds of the geojson layer
        this.map.fitBounds(this.geojsonLayer.getBounds());
    }

    // update the proportional symbols for a new attribute
    updatePropSymbols(attribute) {
        this.geojsonLayer.eachLayer(layer => {
            if (layer.feature && layer.feature.properties[attribute]) {
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

    // new method to update legend content dynamically
    updateLegend(attribute) {
        if (this.legendContainer) {
            // update the legend content to reflect the current attribute
            this.legendContainer.querySelector("#legend-year").innerHTML =
                "year: " + attribute;
        }
    }

    // add the sequence control to the map and set up its events
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

// sequencecontrol class extends l.control for custom sequence ui controls
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

        // create additional controls (buttons) and append them
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
        this.population = properties[attribute];
        this.formatted =
            '<p><b>city:</b> ' +
            this.properties["Region, subregion, country or area"] +
            "</p><p><b>population in " +
            this.year +
            ":</b> " +
            this.population +
            " million</p>";
    }
}

// instantiate the mapapp when the dom is loaded
document.addEventListener("DOMContentLoaded", () => {
    const app = new MapApp("map", "data/LatPop.geojson");
});
