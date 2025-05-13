document.addEventListener("DOMContentLoaded", () => {
    fetch("https://nf00mihne3.execute-api.us-east-2.amazonaws.com/apistage/get-jobs")
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector("#jobs-table tbody");

            if (!Array.isArray(data) || data.length === 0) {
                tbody.innerHTML = "<tr><td colspan='6'>No approved jobs found.</td></tr>";
                return;
            }

            data.forEach(job => {
                const dateApproved = job.approved_at
                    ? new Date(job.approved_at).toLocaleDateString()
                    : "N/A";

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${job.name}</td>
                    <td>${job.title}</td>
                    <td>${job.type || 'N/A'}</td>
                    <td>${dateApproved}</td>
                    <td>${job.notes || 'None'}</td>
                    <td><a href="jobDetails.html?job_id=${job.job_id}">View Checklist</a></td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(err => {
            console.error("Error loading approved jobs:", err);
            const tbody = document.querySelector("#jobs-table tbody");
            tbody.innerHTML = "<tr><td colspan='6'>Error loading jobs.</td></tr>";
        });
});
