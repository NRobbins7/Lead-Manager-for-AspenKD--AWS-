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
          deleteButton.classList.add("delete-estimate");
          deleteButton.onclick = () => deleteEstimate(est.estimate_id);
          li.appendChild(deleteButton);
        }
        
  
        estimateList.appendChild(li);
      }
  
    } catch (err) {
      console.error("Failed to load estimates:", err);
    }
  }

  async function saveLocalStockChanges(estimateId) {
    const rows = document.querySelectorAll("#local-stock-body tr");
  
    const itemsToUpdate = [];
  
    rows.forEach(row => {
      const stockId = row.querySelector(".stock-id").value;
      const qty = row.querySelector(".stock-qty").value;
      const description = row.querySelector(".stock-description").value;
      const location = row.querySelector(".stock-location").value;
      const cost = parseFloat(row.querySelector(".stock-cost").value) || 0;
  
      itemsToUpdate.push({
        stock_id: stockId || null,
        qty,
        description,
        location,
        cost,
        estimate_id: estimateId
      });
    });
  
    const newItems = itemsToUpdate.filter(i => !i.stock_id);
    const existingItems = itemsToUpdate.filter(i => i.stock_id);
  
    if (newItems.length > 0) {
      await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/create-local-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimate_id: estimateId, items: newItems })
      });
    }
  
    for (const item of existingItems) {
      await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/update-local-stock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });
    }
  }
  
  async function createNewEstimate(jobId) {
    try {
      const response = await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/create-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId })
      });
  
      const parsed = await response.json();
  
      if (response.ok) {
        alert(`Estimate ${parsed.version} created successfully!`);
        document.getElementById("rooms-section").style.display = "block";
        document.getElementById("current-version").textContent = parsed.version;
        await fetchEstimates(jobId);
  
        if (parsed.version.toLowerCase() === "v1") {
          await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/create-local-stock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              estimate_id: parsed.estimate_id, 
              items: [{ qty: "", description: "", location: "", cost: 0 }] 
            })
          });
        } else {
          const previousEstimateId = window.lastEstimateId;
          if (previousEstimateId) {
            const stockRes = await fetch(`https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/get-local-stock?estimate_id=${previousEstimateId}`);
            const stockData = await stockRes.json();
            const stockParsed = stockData.body
              ? (typeof stockData.body === "string" ? JSON.parse(stockData.body) : stockData.body)
              : stockData;
            const itemsToCarry = stockParsed.map(item => ({
              qty: item.qty,
              description: item.description,
              location: item.location,
              cost: item.cost
            }));
            await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/create-local-stock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ estimate_id: parsed.estimate_id, items: itemsToCarry })
            });
          } else {
            await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/create-local-stock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                estimate_id: parsed.estimate_id, 
                items: [{ qty: "", description: "", location: "", cost: 0 }] 
              })
            });
          }
        }
  
        window.lastEstimateId = parsed.estimate_id;
        await openEstimateModal(parsed.estimate_id, parsed.version);
      } else {
        alert("Failed to create estimate: " + (parsed.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error creating estimate:", err);
      alert("Error: " + err.message);
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
  
  
  async function openEstimateModal(estimateId, version) {
    try {
      document.getElementById("modal-version").textContent = version;
  
      const metaRes = await fetch(`https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/get-estimate-details?estimate_id=${estimateId}`);
      const metaRaw = await metaRes.json();
      const metaParsed = metaRaw.body ? (typeof metaRaw.body === "string" ? JSON.parse(metaRaw.body) : metaRaw.body) : metaRaw;
  
      const roomsRes = await fetch(`https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/get-rooms?estimate_id=${estimateId}`);
      const roomsRaw = await roomsRes.json();
      const roomsParsed = roomsRaw.body ? (typeof roomsRaw.body === "string" ? JSON.parse(roomsRaw.body) : roomsRaw.body) : roomsRaw;
      const rooms = roomsParsed.rooms || [];
  
      const stockRes = await fetch(`https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/get-local-stock?estimate_id=${estimateId}`);
      const stockRaw = await stockRes.json();
      const stockParsed = stockRaw.body ? (typeof stockRaw.body === "string" ? JSON.parse(stockRaw.body) : stockRaw.body) : stockRaw;
  
      document.getElementById("estimate-modal").setAttribute("data-estimate-id", estimateId);
      document.getElementById("modal-estimate-status").value = metaParsed.status || "";
      document.getElementById("modal-duedate").value = metaParsed.duedate && metaParsed.duedate !== "0000-00-00" ? metaParsed.duedate : "";
  
      const followupContainer = document.getElementById("followup-container");
      const followupInput = document.getElementById("modal-followup");
  
      if ((metaParsed.status || "").toLowerCase() === "pending") {
        followupContainer.style.display = "block";
        followupInput.value = metaParsed.followup || "";
      } else {
        followupContainer.style.display = "none";
        followupInput.value = "";
      }
  
      const stockTableBody = document.getElementById("local-stock-body");
      stockTableBody.innerHTML = "";
  
      stockParsed.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><input class="stock-qty" value="${item.qty || ''}"></td>
          <td><input class="stock-description" value="${item.description || ''}"></td>
          <td><input class="stock-location" value="${item.location || ''}"></td>
          <td><input class="stock-cost" type="number" value="${item.cost || 0}"></td>
          <td>
            <button class="delete-stock-btn" data-stock-id="${item.stock_id}" style="background-color: #5a6f5e; color: white; padding: 5px 10px; border: none; border-radius: 4px;">Delete</button>
            <input type="hidden" class="stock-id" value="${item.stock_id}">
          </td>
        `;
        stockTableBody.appendChild(row);
      });
  
      document.querySelectorAll(".delete-stock-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const stockId = btn.dataset.stockId;
          const row = btn.closest("tr");
  
          if (stockId) {
            await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/delete-local-stock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ stock_id: stockId })
            });
          }
  
          row.remove();
        });
      });
  
      document.getElementById("add-local-stock").onclick = () => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><input class="stock-qty"></td>
          <td><input class="stock-description"></td>
          <td><input class="stock-location"></td>
          <td><input class="stock-cost" type="number" value="0"></td>
          <td>
            <button class="delete-stock-btn" style="background-color: #5a6f5e; color: white; padding: 5px 10px; border: none; border-radius: 4px;">Delete</button>
            <input type="hidden" class="stock-id" value="">
          </td>
        `;
        document.getElementById("local-stock-body").appendChild(row);
  
        row.querySelector(".delete-stock-btn").addEventListener("click", () => row.remove());
      };
  
      const tableBody = document.getElementById("room-table-body");
      tableBody.innerHTML = "";
  
      rooms.forEach(room => {
        const row = document.createElement("tr");
  
        row.innerHTML = `
          <input type="hidden" class="room-id" value="${room.room_id}" />
          <td><input class="room-po" value="${room.po || ''}"></td>
          <td><input class="room-type" value="${room.room_type || ''}"></td>
          <td><input class="room-cost" type="number" value="${room.cost || 0}"></td>
          <td><input class="room-cabinet-line" value="${room.cabinet_line || ''}"></td>
          <td><input class="room-door-type" value="${room.door_type || ''}"></td>
          <td><input class="room-color" value="${room.color || ''}"></td>
          <td><button class="delete-room-btn" data-room-id="${room.room_id}">Delete</button></td>
        `;
  
        tableBody.appendChild(row);
      });
  
      attachDeleteHandlers();
      document.getElementById("save-estimate-changes").onclick = () => saveEstimateChanges();
      document.getElementById("add-room-to-estimate").onclick = addRoomToEstimate;
  
      document.getElementById("estimate-modal").style.display = "block";
    } catch (err) {
      console.error("Error loading modal data:", err);
      alert("Could not load estimate data.");
    }
  }
  
  
  async function saveLeadDetails(jobId) {
    const title = document.getElementById("lead-title").value;
    const address = document.getElementById("lead-address").value;
    const city = document.getElementById("lead-city").value;
    const state = document.getElementById("lead-state").value;
    const zip = document.getElementById("lead-zip").value;
    const status = document.getElementById("lead-status").value;
    const type = document.getElementById("lead-type").value;
    const notes = document.getElementById("lead-notes").value;
  
    const body = {
      job_id: jobId,
      title,
      address,
      city,
      state,
      zip,
      status,
      type,
      notes
    };
  
    try {
      const response = await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/update-lead", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
  
      const result = await response.json();
      if (!response.ok) {
        alert("Failed to save lead info: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Save lead error:", err);
      alert("Error saving lead info.");
    }
  }
  function attachDeleteHandlers() {
    document.querySelectorAll(".delete-room-btn").forEach(button => {
      button.addEventListener("click", async (e) => {
        const roomId = e.target.getAttribute("data-room-id");
  
        if (!confirm("Delete this room?")) return;
  
        const response = await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/delete-room", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ room_id: parseInt(roomId) })
        });
  
        if (response.ok) {
          e.target.closest("tr").remove();
        } else {
          alert("Failed to delete room.");
        }
      });
    });
  }
  
  
  async function saveEstimateChanges() {
    console.log("Entered saveEstimateChanges");
  
    let estimateId = document.getElementById("estimate-modal").getAttribute("data-estimate-id");
    const status = document.getElementById("modal-estimate-status").value;
    const duedate = document.getElementById("modal-duedate").value;
    const followup = document.getElementById("modal-followup")?.value || null;
    const jobId = getJobIdFromURL();
  
    let version = document.getElementById("modal-version").textContent;
  
    if (status === "New Revision") {
      try {
        const createResponse = await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/create-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: jobId })
        });
  
        const createParsed = await createResponse.json();
        const newEstimateId = createParsed.estimate_id;
        const newVersion = createParsed.version;
  
        if (!newEstimateId || !newVersion) {
          alert("Failed to create new revision.");
          return;
        }
  
        document.getElementById("estimate-modal").setAttribute("data-estimate-id", newEstimateId);
        estimateId = newEstimateId;
        version = newVersion;
  
        await fetchEstimates(jobId);
        await openEstimateModal(newEstimateId, newVersion);
  
        return;
      } catch (err) {
        console.error("Error creating new revision:", err);
        alert("Error creating new revision.");
        return;
      }
    }
  
    if (!estimateId || estimateId === "undefined") {
      alert("Estimate ID is missing or invalid.");
      return;
    }
  
    estimateId = parseInt(estimateId);
  
    const rows = document.querySelectorAll("#room-table-body tr");
  
    for (const row of rows) {
      const po = row.querySelector(".room-po")?.value || "";
      const room_type = row.querySelector(".room-type")?.value || "";
      const cost = parseFloat(row.querySelector(".room-cost")?.value) || 0;
      const cabinet_line = row.querySelector(".room-cabinet-line")?.value || "";
      const door_type = row.querySelector(".room-door-type")?.value || "";
      const color = row.querySelector(".room-color")?.value || "";
  
      const room_id = row.querySelector(".room-id")?.value || "new"; // optional hidden input, if you add it later
  
      const body = {
        po,
        room_type,
        cost,
        cabinet_line,
        door_type,
        color
      };
  
      try {
        if (room_id === "new" || !room_id) {
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
  
    const estimateUpdatePayload = {
      estimate_id: estimateId,
      status,
      followup: status === "Pending" ? followup : null
    };
    if (duedate && duedate.trim() !== "") {
      estimateUpdatePayload.duedate = duedate;
    }
  
    await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/update-estimate", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(estimateUpdatePayload)
    });
  
    const leadUpdate = {
      job_id: jobId,
      title: document.getElementById("lead-title").value,
      address: document.getElementById("lead-address").value,
      city: document.getElementById("lead-city").value,
      state: document.getElementById("lead-state").value,
      zip: document.getElementById("lead-zip").value,
      status,
      type: document.getElementById("lead-type").value,
      notes: document.getElementById("lead-notes").value,
      followup: status === "Pending" ? followup : null,
      loss_reason: status === "Lost" ? prompt("Reason for lost lead?") || "" : null
    };
  
    await fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/update-lead", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadUpdate)
    });
    await saveLocalStockChanges(estimateId);

    alert("Changes saved.");
    await fetchEstimates(jobId);
    await openEstimateModal(estimateId, version);
  }
  
  function addRoomToEstimate() {
    const row = document.createElement("tr");
  
    row.innerHTML = `
      <input type="hidden" class="room-id" value="new" />
      <td><input class="room-po" /></td>
      <td><input class="room-type" /></td>
      <td><input class="room-cost" type="number" /></td>
      <td><input class="room-cabinet-line" /></td>
      <td><input class="room-door-type" /></td>
      <td><input class="room-color" /></td>
    `;
  
    document.getElementById("room-table-body").appendChild(row);
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
    
  });
  