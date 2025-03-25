"use strict";

const video = document.getElementById("video");
const captureButton = document.getElementById("captureButton");
const capturedImage = document.getElementById("capturedImage");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const fact = document.querySelector(".fact");
let imageData;

// Access the camera
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((error) => {
    console.error("Error accessing the camera:", error);
    alert("Camera access denied or not available.");
  });

function resetQuantities() {
  // Select all table rows within the tbody
  let rows = document.querySelectorAll("tbody tr");
  document.querySelector(".totalValue").style.color = "rgb(0, 0, 0)";
  document.querySelector(".totalValue").innerHTML = `$ ${0.00}`;
  rows.forEach((row) => {
    // Reset quantity to 0
    row.cells[1].textContent = "0";

    // Reset amount to $0.00
    row.cells[2].textContent = "$0.00";
  });
}

function roundUpToDollarFormat(amount) {
  return (Math.ceil(amount * 100) / 100).toFixed(2);
}

// Refresh Feed
document.querySelector("#refreshButton").addEventListener("click", () => {
  capturedImage.style.display = "none";
  video.style.display = "block";
  console.log("Feed Refreshed");
  resetQuantities();

  // Hide recyclability section when feed is refreshed
  document.getElementById("recyclabilityResults").style.display = "none";
});

// Capture photo and display it
captureButton.addEventListener("click", () => {
  resetQuantities();
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert to data URL and display in the image element
  const imageDataURL = canvas.toDataURL("image/png");
  capturedImage.src = imageDataURL;

  capturedImage.style.display = "block";
  video.style.display = "none";

  fetch("https://vision-kj8o.onrender.com/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: imageDataURL }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message) {
        console.log("Server Response:", data.message);
      }
      if (data.analysis) {
        imageData = data.analysis;

        let totalAmount = 0;

        imageData.forEach((item) => {
          const itemTypeRow = document.querySelector(`#${item.item_type}`);
          itemTypeRow.children[1].innerHTML = item.item_quantity;
          itemTypeRow.children[2].innerHTML = `$${roundUpToDollarFormat(
            item.item_quantity * itemTypeRow.children[2].classList
          )}`;
          totalAmount += item.item_quantity * itemTypeRow.children[2].classList;
        });

        document.querySelector(".totalValue").innerHTML = `$${roundUpToDollarFormat(
          totalAmount
        )}`;
        document.querySelector(".totalValue").style.color = "#7300FF";

        // Recyclability section
        if (data.recyclability) {
          document.getElementById("recyclabilityResults").style.display = "block";
          document.getElementById("recyclabilityText").innerHTML = data.recyclability;
        } else {
          document.getElementById("recyclabilityResults").style.display = "none";
        }
      } else {
        console.error("No analysis results received.");
        alert("Please try again")
      }
    })
    .catch((error) => {
      console.error(error);
    });
});

let currentStream;
let useBackCamera = true; // Start with the back camera

// Function to Start the Camera
async function startCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop()); // Stop current stream
  }

  const constraints = {
    video: { facingMode: useBackCamera ? "environment" : "user" },
  };

  try {
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;
  } catch (error) {
    console.error("Error accessing camera:", error);
    alert("Camera access denied or not available.");
  }
}

// Start Camera on Page Load
startCamera();





// CHANGES FOR THE SIDEBAR

// Panel Toggle Functionality
const sidePanel = document.getElementById('sidePanel');
const panelToggle = document.getElementById('panelToggle');
const arrow = panelToggle.querySelector('.arrow');
const mainContent = document.getElementById('mainContent');
let panelOpen = false;

panelToggle.addEventListener('click', () => {
    panelOpen = !panelOpen;
    sidePanel.style.right = panelOpen ? '0' : '-350px';
    arrow.innerHTML = panelOpen ? '→' : '←';
    panelToggle.style.right = panelOpen ? '360px' : '20px';
    
    // Update button text based on state
    panelToggle.innerHTML = panelOpen ? 
        `<span class="arrow">→</span> Close Panel` : 
        `<span class="arrow">←</span> Depot Finder`;
    
    // Trigger map resize when panel toggles
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 300);
});

// Map Functionality
let map, userLat, userLon, currentRadius = 10;
let depotMarkers = [];

function initMap() {
    map = L.map('map', {
        zoomControl: true,
        attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap, &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Add zoom control with better position
    L.control.zoom({
        position: 'topright'
    }).addTo(map);
}

// Initialize empty map
initMap();

// Radius Control
document.getElementById('radiusSlider').addEventListener('input', function(e) {
    currentRadius = parseInt(e.target.value);
    document.getElementById('radiusValue').textContent = currentRadius + ' km';
    if(userLat && userLon) findNearbyDepots();
});

function findNearbyDepots() {
    // Clear existing markers
    depotMarkers.forEach(marker => map.removeLayer(marker));
    depotMarkers = [];

    const overpassQuery = `[out:json];
        node(around:${currentRadius * 1000}, ${userLat}, ${userLon})["amenity"="recycling"]["recycling:cans"="yes"];
        out;`;

    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('depotCount').textContent = data.elements.length;
            
            if (data.elements.length > 0) {
                const bounds = new L.LatLngBounds();
                
                data.elements.forEach(depot => {
                    const marker = L.marker([depot.lat, depot.lon], {
                        icon: L.icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41]
                        })
                    }).addTo(map).bindPopup(`
                        <b>${depot.tags.name || "Bottle Depot"}</b>
                        <br>
                        <a href="https://www.google.com/maps/dir/${userLat},${userLon}/${depot.lat},${depot.lon}" 
                           target="_blank" 
                           style="color: #7300ff; text-decoration: none; font-weight: 500;">
                           Get Directions →
                        </a>
                    `);
                    
                    depotMarkers.push(marker);
                    bounds.extend([depot.lat, depot.lon]);
                });
                
                // Add user location to bounds
                bounds.extend([userLat, userLon]);
                map.fitBounds(bounds, { padding: [50, 50] });
                
            } else {
                alert("No depots found in this radius. Try increasing the search area.");
            }
        })
        .catch(error => {
            console.error("Error fetching data:", error);
            alert("Error loading depot data. Please try again.");
        });
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function showPosition(position) {
    userLat = position.coords.latitude;
    userLon = position.coords.longitude;
    
    // Add user marker
    L.marker([userLat, userLon], {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
        })
    }).addTo(map).bindPopup("You are here!").openPopup();
    
    // Center map on user
    map.setView([userLat, userLon], 13);
    
    // Find nearby depots
    findNearbyDepots();
}

function showError(error) {
    let message = "Error getting location: ";
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message += "Location permission denied.";
            break;
        case error.POSITION_UNAVAILABLE:
            message += "Location unavailable.";
            break;
        case error.TIMEOUT:
            message += "Location request timed out.";
            break;
        default:
            message += "Unknown error.";
    }
    alert(message);
}






