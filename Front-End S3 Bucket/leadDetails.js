function getJobIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("job_id");
  }
  
  async function fetchLeadDetails(jobId) {
    try {
      const response = await fetch(`https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/get-lead-data?job_id=${jobId}`);
      if (!response.ok) throw new Error("Failed to fetch lead");
      const result = await response.json();
      const lead = JSON.parse(result.body);
      document.getElementById("lead-title").value = lead.title || "";
      document.getElementById("lead-address").value = lead.address || "";
      document.getElementById("lead-city").value = lead.city || "";
      document.getElementById("lead-state").value = lead.state || "";
      document.getElementById("lead-zip").value = lead.zip || "";
      document.getElementById("lead-status").value = lead.status || "";
      document.getElementById("lead-type").value = lead.type || "";
      document.getElementById("lead-notes").value = lead.notes || "";
    } catch (err) {
      console.error("Error loading lead:", err);
      alert("Could not load lead details.");
    }
  }
  
  async function fetchRoomSummary(estimateId) {
    try {
      const response = await fetch(`https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/get-rooms?estimate_id=${estimateId}`);
      const raw = await response.json();
      const parsed = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;
      const rooms = parsed.rooms || [];
      const roomCount = rooms.length;
      const totalCost = rooms.reduce((sum, room) => sum + parseFloat(room.cost || 0), 0);
      return { roomCount, totalCost };
    } catch (err) {
      console.error("Error fetching room summary:", err);
      return { roomCount: 0, totalCost: 0 };
    }
  }
  
  async function fetchEstimates(jobId) {
    try {
      const response = await fetch(`https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/get-estimates?job_id=${jobId}`);
      const result = await response.json();
      const parsed = typeof result.body === "string" ? JSON.parse(result.body) : result.body;
      const estimates = parsed.estimates || [];
  
      const estimateList = document.getElementById("estimate-list");
      estimateList.innerHTML = "";
  
      estimates.sort((a, b) => parseInt(b.version.slice(1)) - parseInt(a.version.slice(1)));
  
      for (const est of estimates) {
        const { roomCount, totalCost } = await fetchRoomSummary(est.estimate_id);
  
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.textContent = `${est.version} — ${roomCount} room(s), $${totalCost}`;
        button.onclick = () => openEstimateModal(est.estimate_id, est.version);
        li.appendChild(button);
  
        if (est === estimates[0]) {
          const deleteButton = document.createElement("button");
          deleteButton.textContent = "Delete Estimate";
          deleteButton.style.marginLeft = "8px";
          deleteButton.onclick = () => deleteEstimate(est.estimate_id);
          li.appendChild(deleteButton);
        }
  
        estimateList.appendChild(li);
      }
  
      if (estimates.length > 0) {
        const latest = estimates[0];
        document.getElementById("current-version").textContent = latest.version;
        document.getElementById("rooms-section").style.display = "block";
        fetchRooms(latest.estimate_id);
      }
    } catch (err) {
      console.error("Failed to load estimates:", err);
    }
  }
  async function fetchRooms(estimateId) {
    try {
      const response = await fetch(`https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/get-rooms?estimate_id=${estimateId}`);
      const raw = await response.json();
      const parsed = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;
      const rooms = parsed.rooms || [];
  
      const roomList = document.getElementById("room-list");
      roomList.innerHTML = "";
  
      if (rooms.length === 0) {
        roomList.innerHTML = "<p>No rooms found for this estimate.</p>";
        return;
      }
  
      rooms.forEach(room => {
        const div = document.createElement("div");
        div.classList.add("room-card");
        div.innerHTML = `
          <p><strong>Room Type:</strong> ${room.room_type}</p>
          <p><strong>Cost:</strong> $${room.cost}</p>
          <p><strong>Cabinet Line:</strong> ${room.cabinet_line}</p>
          <p><strong>Door Type:</strong> ${room.door_type}</p>
          <p><strong>Color:</strong> ${room.color}</p>
          <hr>
        `;
        roomList.appendChild(div);
      });
  
    } catch (err) {
      console.error("Error loading rooms:", err);
      alert("Failed to load rooms for this estimate.");
    }
  }
  
  async function refreshEstimatePreviewIfLatest(estimateId) {
    const response = await fetch(`https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/get-estimates?job_id=${getJobIdFromURL()}`);
    const result = await response.json();
    const parsed = typeof result.body === "string" ? JSON.parse(result.body) : result.body;
    const estimates = parsed.estimates || [];
    const latest = estimates.sort((a, b) => parseInt(b.version.slice(1)) - parseInt(a.version.slice(1)))[0];
    if (latest && latest.estimate_id === estimateId) {
      fetchRooms(estimateId);
    }
  }
  
  async function openEstimateModal(estimateId, version) {
    try {
      document.getElementById("modal-version").textContent = version;
      const response = await fetch(`https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/get-rooms?estimate_id=${estimateId}`);
      const raw = await response.json();
      const parsed = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;
      const rooms = parsed.rooms || [];
      const modalList = document.getElementById("modal-room-list");
      modalList.innerHTML = "";
  
      rooms.forEach(room => {
        const div = document.createElement("div");
        div.innerHTML = `
          <input type="hidden" class="room-id" value="${room.room_id}" />
          <label>Room Type: <input class="room-type" value="${room.room_type}" /></label><br>
          <label>Cost: <input type="number" class="room-cost" value="${room.cost}" /></label><br>
          <label>Cabinet Line: <input class="cabinet-line" value="${room.cabinet_line}" /></label><br>
          <label>Door Type: <input class="door-type" value="${room.door_type}" /></label><br>
          <label>Color: <input class="room-color" value="${room.color}" /></label>
          <button class="delete-room" onclick="deleteRoom(${room.room_id}, ${estimateId}, '${version}')">Delete Room</button>
          <hr>
        `;
        modalList.appendChild(div);
      });
  
      document.getElementById("save-estimate-changes").onclick = () => saveEstimateChanges(estimateId, version);
      document.getElementById("add-room-to-estimate").onclick = addRoomToEstimate;
      document.getElementById("estimate-modal").style.display = "block";
    } catch (err) {
      console.error("Error loading modal rooms:", err);
      alert("Could not load room data.");
    }
  }
  
  function addRoomToEstimate() {
    const modalList = document.getElementById("modal-room-list");
    const div = document.createElement("div");
    div.classList.add("new-room");
    div.innerHTML = `
      <input type="hidden" class="room-id" value="new" />
      <label>Room Type: <input class="room-type" value="" /></label><br>
      <label>Cost: <input type="number" class="room-cost" value="" /></label><br>
      <label>Cabinet Line: <input class="cabinet-line" value="" /></label><br>
      <label>Door Type: <input class="door-type" value="" /></label><br>
      <label>Color: <input class="room-color" value="" /></label>
      <hr>
    `;
    modalList.appendChild(div);
  }
  
  async function saveEstimateChanges(estimateId, version) {
    const entries = document.querySelectorAll("#modal-room-list > div");
    for (const div of entries) {
      const room_id = div.querySelector(".room-id").value;
      const room_type = div.querySelector(".room-type").value;
      const cost = parseFloat(div.querySelector(".room-cost").value);
      const cabinet_line = div.querySelector(".cabinet-line").value;
      const door_type = div.querySelector(".door-type").value;
      const color = div.querySelector(".room-color").value;
  
      const body = { room_type, cost, cabinet_line, door_type, color };
      try {
        if (room_id === "new") {
          body.estimate_id = estimateId;
          await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/create-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
        } else {
          body.room_id = room_id;
          await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/update-room", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
        }
      } catch (err) {
        console.error("Room save error:", err);
        alert("Error saving room. Try again.");
        return;
      }
    }
  
    alert("Estimate rooms saved.");
    await openEstimateModal(estimateId, version);
    await fetchEstimates(getJobIdFromURL());
    await refreshEstimatePreviewIfLatest(estimateId);
  }
  
  async function deleteRoom(roomId, estimateId, version) {
    if (!confirm("Are you sure you want to delete this room?")) return;
    try {
      await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/delete-room", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId })
      });
      await openEstimateModal(estimateId, version);
      await fetchEstimates(getJobIdFromURL());
    } catch (err) {
      console.error("Error deleting room:", err);
      alert("Failed to delete room.");
    }
  }
  
  async function deleteEstimate(estimateId) {
    if (!confirm("Are you sure you want to delete this estimate version?")) return;
    try {
      await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/delete-estimate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimate_id: estimateId })
      });
      await fetchEstimates(getJobIdFromURL());
    } catch (err) {
      console.error("Error deleting estimate:", err);
      alert("Failed to delete estimate.");
    }
  }
  
  document.addEventListener("DOMContentLoaded", function () {
    const jobId = getJobIdFromURL();
    if (!jobId) {
      alert("Missing job_id in URL");
      return;
    }
    fetchLeadDetails(jobId);
    fetchEstimates(jobId);
    document.getElementById("save-lead").addEventListener("click", function () {
      saveLeadDetails(jobId);
    });
    document.getElementById("create-estimate").addEventListener("click", function () {
      createNewEstimate(jobId);
    });
  });
  