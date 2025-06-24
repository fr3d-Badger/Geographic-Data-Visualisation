// Global references
let scatterChart;
const mapLayerByName = {}; // areaName -> Leaflet layer
let geojson;//references geojson layer for scatter graph interaction

// Initialize the map
const map = L.map('map').setView([53, -2.0333], 5.5);//Centred on England
//Adds OpenStreetMap tiles as the base layer for the choropleth
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// loading the geojson and displaying it on the map
fetch('engLAdensity.geojson')
  .then(response => response.json())
  .then(data => {
    geojson = L.geoJSON(data, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);
  });

// Gets colour based on population density
function getColor(d) {
  return d > 5400 ? '#f03b20' :
         d > 5100 ? '#cc071c' :
         d > 4800 ? '#d60c1e' :
         d > 4500 ? '#df1120' :
         d > 4200 ? '#e71622' :
         d > 3900 ? '#eb2120' :
         d > 3600 ? '#ee311d' :
         d > 3300 ? '#f1421a' :
         d > 3000 ? '#f45416' :
         d > 2700 ? '#f76613' :
         d > 2400 ? '#f97812' :
         d > 2100 ? '#fb8913' :
         d > 1800 ? '#fd9a18' :
         d > 1500 ? '#fea926' :
         d > 1200 ? '#feb739' :
         d > 900  ? '#ffc14d' :
         d > 600  ? '#ffcd61' :
         d > 400  ? '#ffd776' :
         d > 200  ? '#ffe28b' :
         d > 100  ? '#ffeda0' :
                   '#fff2b2';//if population is out of scale
}

// Style function for GeoJSON
function style(feature) {
  const density = parseFloat(feature.properties.popDensity_population) || 0;
  return {
    fillColor: getColor(density),
    weight: 0.5,
    opacity: 1,
    color: 'gray',
    fillOpacity: 1
  };
}

//function for event when hovering over map area
function highlightFeature(e) {
  const layer = e.target;
  //different style for when the area is hovered over so it stands out
  layer.setStyle({ weight: 3, 
                   color: 'black', 
                   fillOpacity: 1 });
    //highlighting the point on the scatter graph
    const name = layer.feature.properties.popDensity_geography;
    if (scatterChart) {
        const index = scatterChart.data.datasets[0].data.findIndex(d => d.areaName === name);
        if (index !== -1) {
        scatterChart.setActiveElements([{ datasetIndex: 0, index }]);
        scatterChart.tooltip.setActiveElements([{ datasetIndex: 0, index }], { x: 0, y: 0 });
        scatterChart.update();
        }
    }
}
//area style reseting when mouse leaves the area
function resetHighlight(e) {
    geojson.resetStyle(e.target);
    //removing the highlighted point from the chart
    if (scatterChart) {
        scatterChart.setActiveElements([]);
        scatterChart.tooltip.setActiveElements([], { x: 0, y: 0 });
        scatterChart.update();
    }
}

//Getting information for each area in the geojson
function onEachFeature(feature, layer) {
  const name = feature.properties.popDensity_geography;//name of each area
  const density = feature.properties.popDensity_population || 'Data unavailable';//population density
  const totalPop = feature.properties.popTotal || 'Data unavailable';//Total population
  //Pop up that appeaers when an area is clicked
  const popupContent = `<h4>${name}</h4><p>Population Density: ${density}</p><p><strong>Total Population:</strong> ${totalPop}</p>`;//contains pop total and pop density
  layer.bindPopup(popupContent);

  //Layer used to reference the area name so that it can be highlighted
  mapLayerByName[name] = layer;

  //Interactive features when mouse hovers over area
  layer.on({
    mouseover: e => {
      highlightFeature(e);
    },
    mouseout: e => {
      resetHighlight(e);
    }
  });
}

//SCATTER GRAPH

// Fetch data and create scatter graph
fetch('engLAdensity.geojson')
    .then(response => response.json())
    .then(geoData => {
        const scatterData = geoData.features.map(feature => {
        //changes string to numbers so they can be plotted
        const density = parseFloat(feature.properties.popDensity_population);
        const totalPop = parseInt(feature.properties.popTotal);
        const name = feature.properties.popDensity_geography;

        //only using valid data
        if (!isNaN(density) && !isNaN(totalPop)) {//checking if population and po density is a number
            return { x: density, 
                y: totalPop, 
                label: name, 
                areaName: name };//name that links with choropleth map
        }
}).filter(Boolean);//removes invalid values

    //creating scatter graph
    const ctx = document.getElementById('scatterChart').getContext('2d');
    scatterChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
            label: 'Areas',
            data: scatterData,
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            pointRadius: 3,
            pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            plugins: {
            tooltip: {
                callbacks: {
                    //when mouse is over point this will pop up similar to on the choropleth
                label: ctx => `${ctx.raw.label}: ${ctx.raw.x} ppl/km², ${ctx.raw.y.toLocaleString()} total`
            }
            },
                legend: {
                    display: false
                }
            },
        //when hovering over the graph points the map will also react
        onHover: function(event, activeElements) {
    if (!geojson) return;

    // Reset map style
    geojson.eachLayer(layer => geojson.resetStyle(layer));

    if (activeElements.length > 0) {
        // Get the index of the active element
        const index = activeElements[0].index;
        const areaName = scatterChart.data.datasets[0].data[index].areaName;

        // Find the layer associated with the hovered area name
        const layer = mapLayerByName[areaName];
        if (layer) {
            // Highlight area and trigger the popup
            layer.setStyle({ weight: 3, color: 'black', fillOpacity: 1 });
            layer.fire('mouseover'); // Fire mouseover event to show the popup
        }
    }
},
        scales: {
          x: {
            title: {
              display: true,
              text: 'Population Density (people per km²)'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Total Population'
            },
            beginAtZero: true
          }
        }
      }
    });
  });
