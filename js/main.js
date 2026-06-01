// === Define Base Layers ===
const defaultLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
    maxZoom: 19
});

// === Initialize Map with Satellite View by Default ===
var map = L.map('map', {
    center: [21.17, 72.83],
    zoom: 12,
    layers: [defaultLayer]
});



// === Globals ===
var gridLayer;
var independentLayer, cigaretteLayer, foodLayer, pcpLayer;
var currentOpacity = 0.6;

// === Cluster Color Map ===
var clusterColors = {
    "C1": "#ff4d4d",
    "C2": "#6666ff",
    "C3": "#66cc66",
    "C5": "#ffcc66",
    "C8": "#cc66cc"
};

function populateClusterLegend() {
    const legend = document.getElementById("clusterLegend");
    legend.innerHTML = "";

    const clusters = {
        "C1": "Urban Commercial Areas",
        "C2": "Industrial Zones",
        "C3": "Peri-Urban Settlements",
        "C5": "Central Residential",
        "C8": "Premium Townships"
    };

    for (let code in clusters) {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.marginBottom = "5px";

        const colorBox = document.createElement("div");
        colorBox.style.width = "15px";
        colorBox.style.height = "15px";
        colorBox.style.backgroundColor = clusterColors[code];
        colorBox.style.marginRight = "8px";
        colorBox.style.border = "1px solid black";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.style.marginRight = "5px";
        checkbox.dataset.clusterCode = code;

        checkbox.addEventListener('change', (e) => {
            const clusterCode = e.target.dataset.clusterCode;
            gridLayer.eachLayer(layer => {
                if ((layer.feature.properties.Cluster || layer.feature.properties.cluster) === clusterCode) {
                    if (e.target.checked) {
                        layer.setStyle({ fillOpacity: currentOpacity });
                    } else {
                        layer.setStyle({ fillOpacity: 0 });
                    }
                }
            });
        });

        const label = document.createElement("label");
        label.textContent = `${code}: ${clusters[code]}`;

        container.appendChild(colorBox);
        container.appendChild(checkbox);
        container.appendChild(label);
        legend.appendChild(container);
    }
}



function populateOutletCheckboxes() {
    const colors = {
        independent: 'red',
        cigarette: 'purple',
        food: 'green',
        pcp: 'blue'
    };
    const names = {
        independent: 'Independent',
        cigarette: 'Cigarette',
        food: 'Food',
        pcp: 'PCP'
    };

    ['independent', 'cigarette', 'food', 'pcp'].forEach(type => {
        const checkbox = document.getElementById(`${type}OutletCheckbox`);
        const label = checkbox.nextSibling;

        const colorDot = document.createElement("span");
        colorDot.style.display = "inline-block";
        colorDot.style.width = "10px";
        colorDot.style.height = "10px";
        colorDot.style.backgroundColor = colors[type];
        colorDot.style.marginRight = "5px";
        colorDot.style.borderRadius = "50%";

        label.parentNode.insertBefore(colorDot, label);
    });
}





function getClusterColor(clusterCode) {
    return clusterColors[clusterCode] || 'grey';
}

function getGapColor(gap) {
    const g = Math.max(0, Math.min(gap, )); // clamp gap between 0 and 75

    if (g <= 25) {
        // Green (0) -> Yellow (35)
        const ratio = g / 25;
        const r = Math.round(46 + ratio * (255 - 46));  // from 46 (green) to 255 (yellow)
        const gVal = Math.round(204 + ratio * (220 - 204));  // from 204 to 220
        const b = 64;  // constant (green)
        return `rgb(${r},${gVal},${b})`;
    } else {
        // Yellow (35) -> Red (75)
        const ratio = (g - 25) / 40;
        const r = 255;  // constant (red)
        const gVal = Math.round(220 - ratio * 220); // from 220 to 0
        const b = 0;
        return `rgb(${r},${gVal},${b})`;
    }
}


function bindGridPopup(feature, layer) {
    const props = feature.properties;


    // === Hover tooltip ===
    const gapValue = parseFloat(props.Gap ?? props.gap ?? 0).toFixed(2);
    layer.bindTooltip(`${props.ward_name || props.Ward_Name || 'NA'} | OS: ${gapValue}`, {
        permanent: false,
        direction: 'top'
    });
    

    const popup = `
    <b>Grid ID:</b> ${props.Grid_ID || props.grid_id || props.Grid_Id || 'NA'}<br>
    <b>Ward Name:</b> ${props.Ward_name || props.Ward_Name || 'NA'}<br>
    <b>Pop Density:</b> ${parseFloat(props.pop_density || props["Pop Density (#/km2)"] || 0).toFixed(2)}<br>
    <b>% Built Up:</b> ${parseFloat(props["% built up area"] || props["% Built Up"] || 0).toFixed(2)}<br>
    <b>Retail Potential Score:</b> ${parseFloat(props.retail_potential || props["Retail Potential Score"] || 0).toFixed(2)}<br><hr>
    <b>Opportunity Score:</b> ${parseFloat(props.Gap ?? props.gap ?? 0).toFixed(2)}
`;

    layer.bindPopup(popup);
}




// === Opacity Slider ===
function initOpacitySlider() {
    const slider = document.getElementById('opacitySlider');
    noUiSlider.create(slider, {
        start: [0.4],
        range: { 'min': 0, 'max': 1.0 },
        step: 0.05
    });
    slider.noUiSlider.on('update', function (values) {
        currentOpacity = parseFloat(values[0]);
        if (gridLayer) gridLayer.setStyle({ fillOpacity: currentOpacity });
    });
}

// === Retail Gap Filter Slider ===
function initGapFilterSlider() {
    const slider = document.getElementById('gapFilterSlider');
    noUiSlider.create(slider, {
        start: [0, 75],
        connect: true,
        range: { min: 0, max: 75 }
    });

    slider.noUiSlider.on('update', function (values) {
        const min = parseFloat(values[0]);
        const max = parseFloat(values[1]);
        if (gridLayer) {
            gridLayer.eachLayer(layer => {
                const gap = parseFloat(layer.feature.properties.Gap || 0); // <-- Correct field
                if (gap >= min && gap <= max) {
                    layer.setStyle({ fillOpacity: currentOpacity });
                } else {
                    layer.setStyle({ fillOpacity: 0 });
                }
            });
        }
    });
}






// === Retail Outlet Popups ===
function bindOutletPopup(layer, props, type) {
    console.log("Outlet Properties:", props);

    let popup = '';
    const outletName = props["outlet_name"] || props["Outlet Name"] || 'NA';

    if (type === 'independent') {
        popup = `<b>Potential Outlet</b><br>
                 <b>Name:</b> ${outletName}<br>
                 <b>Address:</b> ${props["address"] || props["Address"] || 'NA'}<br>
                 <b>Ward:</b> ${props["ward"] || props["Ward"] || 'NA'}`;
    } 
    else if (type === 'food' || type === 'pcp') {
        popup = `<b>ITC ${type.toUpperCase()} Store</b><br>
                 <b>Name:</b> ${props["outlet_name"] || props["Outlet Name"]}<br>
                 <b>WD Code:</b> ${props["wd"] || props["Wd"] || 'NA'}<br>
                 <b>Sales:</b> ${props["avg_sale"] || props["Avg Sale"] || 'NA'}<br>
                 <b>Type:</b> ${props["outlet_type"] || props["Outlet Type"] || 'NA'}<br>
                 <b>Channel:</b> ${props["channel"] || props["Channel"] || 'NA'}`;
    } 
    else if (type === 'cigarette') {
        popup = `<b>ITC Cigarette Store</b><br>
                 <b>Name:</b> ${props["outlet_name"] || props["Outlet Name"]}<br>
                 <b>WD Code:</b> ${props["wd"] || props["WD"] || 'NA'}<br>
                 <b>PC Type:</b> ${props["pc_outlet_type"] || props["Outlet Type"] || 'NA'}<br>`;
    }

    layer.bindPopup(popup);
    layer.bindTooltip(`${outletName} (${type.toUpperCase()})`);
}



// === Add Outlet Layers ===
function loadOutlets() {
    fetch('./js/outlet_layers/independent_outlets.geojson').then(res => res.json()).then(data => {
        document.getElementById('independentLabel').innerHTML = `
            <span class="legend-icon" style="background:red;"></span> Potential (${data.features.length})
        `;
        independentLayer = L.geoJson(data, {
            pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 4, color: 'white', weight: 0.5, fillColor: 'red', fillOpacity: 1.0, opacity: 1.0}),
            onEachFeature: (f, l) => bindOutletPopup(l, f.properties, 'independent')
        }).addTo(map);
    });
    
    fetch('./js/outlet_layers/cigarette_outlets.geojson').then(res => res.json()).then(data => {
        document.getElementById('cigaretteLabel').innerHTML = `
            <span class="legend-icon" style="background:purple;"></span> Cigarette (${data.features.length})
        `;
        cigaretteLayer = L.geoJson(data, {
            pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 4, color: 'white', weight: 0.5, fillColor: 'purple', fillOpacity: 1.0, opacity: 1.0 }),
            onEachFeature: (f, l) => bindOutletPopup(l, f.properties, 'cigarette')
        }).addTo(map);
    });
    
    fetch('./js/outlet_layers/food_outlets.geojson').then(res => res.json()).then(data => {
        const valid = data.features.filter(f => f.geometry);  // ✅ filter only valid geometry
        document.getElementById('foodLabel').innerHTML = `
            <span class="legend-icon" style="background:green;"></span> Food (${valid.length})
        `;
        foodLayer = L.geoJson(valid, {
            pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 4, color: 'white', weight: 0.5, fillColor: 'green', fillOpacity: 1.0, opacity: 1.0 }),
            onEachFeature: (f, l) => bindOutletPopup(l, f.properties, 'food')
        }).addTo(map);
    });
    
    
    fetch('./js/outlet_layers/pcp_outlets.geojson').then(res => res.json()).then(data => {
        const valid = data.features.filter(f => f.geometry);  // ✅
        document.getElementById('pcpLabel').innerHTML = `
            <span class="legend-icon" style="background:blue;"></span> PCP (${valid.length})
        `;
        pcpLayer = L.geoJson(valid, {
            pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 4, color: 'white', weight: 0.5, fillColor: 'blue', fillOpacity: 1.0, opacity: 1.0}),
            onEachFeature: (f, l) => bindOutletPopup(l, f.properties, 'pcp')
        }).addTo(map);
    });
    
    
}

// === Checkbox Control ===
document.getElementById("independentOutletCheckbox").addEventListener('change', e => {
    if (independentLayer) e.target.checked ? map.addLayer(independentLayer) : map.removeLayer(independentLayer);
});
document.getElementById("cigaretteOutletCheckbox").addEventListener('change', e => {
    if (cigaretteLayer) e.target.checked ? map.addLayer(cigaretteLayer) : map.removeLayer(cigaretteLayer);
});
document.getElementById("foodOutletCheckbox").addEventListener('change', e => {
    if (foodLayer) e.target.checked ? map.addLayer(foodLayer) : map.removeLayer(foodLayer);
});
document.getElementById("pcpOutletCheckbox").addEventListener('change', e => {
    if (pcpLayer) e.target.checked ? map.addLayer(pcpLayer) : map.removeLayer(pcpLayer);
});

// === View Toggles ===
function switchToRetailGapView() {
    document.getElementById("gapSliderBox").style.display = "block";
    document.getElementById("clusterLegendBox").style.display = "none";

    document.querySelectorAll("#viewButtons button").forEach(btn => btn.classList.remove("active"));
    document.querySelector('button[onclick="switchToRetailGapView()"]').classList.add("active");

    if (gridLayer) map.removeLayer(gridLayer);

    fetch('./js/outlet_layers/grid_data.geojson')
    .then(res => res.json())
    .then(data => {
        gridLayer = L.geoJson(data, {
            style: f => ({
                color: 'black',
                weight: 0.5,
                fillOpacity: currentOpacity,
                fillColor: getGapColor(f.properties.Gap || 0)    // <<== THIS LINE CORRECTED
            }),
            onEachFeature: bindGridPopup
        }).addTo(map);

        // Bring outlet layers to front
        if (independentLayer) independentLayer.bringToFront();
        if (cigaretteLayer) cigaretteLayer.bringToFront();
        if (foodLayer) foodLayer.bringToFront();
        if (pcpLayer) pcpLayer.bringToFront();

        // Initialize/reinitialize Gap Slider
        const gapSlider = document.getElementById('gapFilterSlider');
        if (gapSlider.noUiSlider) gapSlider.noUiSlider.destroy();
        initGapFilterSlider();
    });
}



function switchToClusterView() {
    document.getElementById("gapSliderBox").style.display = "none";
    document.getElementById("clusterLegendBox").style.display = "block";


    document.querySelectorAll("#viewButtons button").forEach(btn => btn.classList.remove("active"));
    document.querySelector('button[onclick="switchToClusterView()"]').classList.add("active");
    if (gridLayer) map.removeLayer(gridLayer);

    fetch('./js/outlet_layers/grid_data.geojson')
    .then(res => res.json())
    .then(data => {
        gridLayer = L.geoJson(data, {
            style: f => ({
                color: 'black',
                weight: 0.5,
                fillOpacity: currentOpacity,
                fillColor: getClusterColor(f.properties.Cluster || f.properties.cluster)
            }),
            onEachFeature: bindGridPopup
        }).addTo(map);
        // Bring outlets to top
        if (independentLayer) independentLayer.bringToFront();
        if (cigaretteLayer) cigaretteLayer.bringToFront();
        if (foodLayer) foodLayer.bringToFront();
        if (pcpLayer) pcpLayer.bringToFront();
    });
}

// === Custom Basemap Toggle Buttons ===
document.getElementById('defaultBtn').addEventListener('click', () => {
    map.removeLayer(satelliteLayer);
    map.addLayer(defaultLayer);
    document.getElementById('defaultBtn').classList.add('active');
    document.getElementById('satelliteBtn').classList.remove('active');
});

document.getElementById('satelliteBtn').addEventListener('click', () => {
    map.removeLayer(defaultLayer);
    map.addLayer(satelliteLayer);
    document.getElementById('satelliteBtn').classList.add('active');
    document.getElementById('defaultBtn').classList.remove('active');
});







// === Init on Load ===
initOpacitySlider();
loadOutlets();
switchToClusterView();  // default view
populateClusterLegend();



