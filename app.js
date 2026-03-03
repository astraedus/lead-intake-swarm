const leads = [
  {
    company: "Northstar Dental Group",
    segment: "Healthcare / 18 employees",
    pain: "slow lead follow-up, missed callbacks, manual booking",
    score: 91,
    value: 16000,
    action: "Offer same-day automation teardown and a 20-minute routing walkthrough."
  },
  {
    company: "Orbit Legal Ops",
    segment: "Professional Services / 42 employees",
    pain: "proposal bottlenecks, fragmented intake, manual pricing copy",
    score: 78,
    value: 13500,
    action: "Send a scoped discovery map and book a process design session."
  },
  {
    company: "Cinder Commerce",
    segment: "Ecommerce / 9 employees",
    pain: "support backlog, no CRM automation, low response consistency",
    score: 54,
    value: 9000,
    action: "Lead with a smaller pilot focused on support triage and auto-replies."
  }
];

const leadList = document.getElementById("lead-list");
const barList = document.getElementById("bars");
const actionList = document.getElementById("action-list");

leads.forEach((lead) => {
  const leadCard = document.createElement("article");
  leadCard.className = "lead-card";
  leadCard.innerHTML = `
    <h3>${lead.company}</h3>
    <span class="item-meta">${lead.segment}</span>
    <span class="item-meta">${lead.pain}</span>
    <div class="score-row">
      <span class="item-meta">Lead score ${lead.score}/100</span>
      <span class="pill">${lead.score >= 75 ? "hot" : "warm"}</span>
    </div>
  `;
  leadList.appendChild(leadCard);

  const barItem = document.createElement("div");
  barItem.className = "bar-item";
  barItem.innerHTML = `
    <div class="bar-top">
      <span>${lead.company}</span>
      <strong>$${(lead.value / 1000).toFixed(1)}k</strong>
    </div>
    <div class="bar-track">
      <div class="bar-fill" style="width: ${lead.score}%"></div>
    </div>
  `;
  barList.appendChild(barItem);

  const actionCard = document.createElement("article");
  actionCard.className = "action";
  actionCard.innerHTML = `
    <h3>${lead.company}</h3>
    <p>${lead.action}</p>
  `;
  actionList.appendChild(actionCard);
});

