document.addEventListener("DOMContentLoaded", () => {
    const headerHTML = `
        <div id="main-header">
            <button onclick="location.href='index.html'">Active Leads</button>
            <button onclick="location.href='currentJobs.html'">Sold Jobs</button>
        </div>
    `;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = headerHTML;
    document.body.prepend(wrapper);
});
