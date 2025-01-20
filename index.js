"use strict";

const video = document.getElementById("video");
const captureButton = document.getElementById("captureButton");
const capturedImage = document.getElementById("capturedImage");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
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
    let rows = document.querySelectorAll('tbody tr');
    document.querySelector(".totalValue").style.color="rgb(0, 0, 0)";
    document.querySelector(".totalValue").innerHTML=`$ ${0.00}`;
    rows.forEach(row => {
        // Reset quantity to 0
        row.cells[1].textContent = '0'; 

        // Reset amount to $0.00
        row.cells[2].textContent = '$0.00';
    });
}

function roundUpToDollarFormat(amount) {
  return (Math.ceil(amount * 100) / 100).toFixed(2);
}

//Refresh Feed
document.querySelector("#refreshButton").addEventListener("click",()=>{
  capturedImage.style.display = "none";
  video.style.display = "block";
  console.log("Feed Refreshed");  
  resetQuantities();
})

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

      imageData=data.analysis

      let totalAmount=0;

      imageData.forEach(item=>{

       const itemTypeRow=document.querySelector(`#${item.item_type}`);  
       itemTypeRow.children[1].innerHTML=item.item_quantity;
       itemTypeRow.children[2].innerHTML=`$${roundUpToDollarFormat(item.item_quantity * itemTypeRow.children[2].classList)}`;
       totalAmount+=item.item_quantity * itemTypeRow.children[2].classList
      })
      document.querySelector(".totalValue").innerHTML=`$${roundUpToDollarFormat(totalAmount)}`;
      document.querySelector(".totalValue").style.color="#7300FF";

    } else {
      console.error("No analysis results received.");
    }
  })
  .catch((error) => {
    console.error(error);
  });
});
