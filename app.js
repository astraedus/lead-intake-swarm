const territories = [
  {
    name: "New York Metro",
    shortName: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    region: "Northeast",
    serviceMix: "HVAC, plumbing, emergency response",
    crews: 11,
    baselineStops: 26,
    anchorAccount: "Union Square Facilities"
  },
  {
    name: "Dallas-Fort Worth",
    shortName: "Dallas",
    latitude: 32.7767,
    longitude: -96.797,
    region: "South Central",
    serviceMix: "HVAC, roofing, same-day repairs",
    crews: 9,
    baselineStops: 22,
    anchorAccount: "Legacy Retail Group"
  },
  {
    name: "Seattle Corridor",
    shortName: "Seattle",
    latitude: 47.6062,
    longitude: -122.3321,
    region: "Pacific Northwest",
    serviceMix: "Electrical, inspection, recurring visits",
    crews: 8,
    baselineStops: 18,
    anchorAccount: "Harbor Industrial Park"
  },
  {
    name: "Phoenix Valley",
    shortName: "Phoenix",
    latitude: 33.4484,
    longitude: -112.074,
    region: "Southwest",
    serviceMix: "Cooling systems, maintenance contracts",
    crews: 10,
    baselineStops: 24,
    anchorAccount: "Desert Point Medical"
  }
];

const fallbackWeather = {
  "New York": [
    { temp: 11, rain: 48, wind: 21 },
    { temp: 9, rain: 72, wind: 26 },
    { temp: 8, rain: 55, wind: 19 }
  ],
  "Dallas": [
    { temp: 22, rain: 18, wind: 24 },
    { temp: 24, rain: 26, wind: 29 },
    { temp: 23, rain: 14, wind: 22 }
  ],
  "Seattle": [
    { temp: 8, rain: 66, wind: 16 },
    { temp: 9, rain: 82, wind: 20 },
    { temp: 10, rain: 58, wind: 18 }
  ],
  "Phoenix": [
    { temp: 30, rain: 8, wind: 12 },
    { temp: 32, rain: 6, wind: 14 },
    { temp: 34, rain: 4, wind: 15 }
  ]
};

const els = {
  liveStamp: document.getElementById("live-stamp"),
  signalTape: document.getElementById("signal-tape"),
  heroStatus: document.getElementById("hero-status"),
  heroSummary: document.getElementById("hero-summary"),
  executiveRisk: document.getElementById("executive-risk"),
  executiveSafe: document.getElementById("executive-safe"),
  executiveShift: document.getElementById("executive-shift"),
  revenueRisk: document.getElementById("revenue-risk"),
  safeZone: document.getElementById("safe-zone"),
  crewShift: document.getElementById("crew-shift"),
  responseMode: document.getElementById("response-mode"),
  metricBand: document.getElementById("metric-band"),
  territoryGrid: document.getElementById("territory-grid"),
  priorityList: document.getElementById("priority-list"),
  dispatchCopy: document.getElementById("dispatch-copy"),
  trendGrid: document.getElementById("trend-grid"),
  accountList: document.getElementById("account-list"),
  automationList: document.getElementById("automation-list"),
  avgTicket: document.getElementById("avg-ticket"),
  avgTicketValue: document.getElementById("avg-ticket-value"),
  jobsDay: document.getElementById("jobs-day"),
  jobsDayValue: document.getElementById("jobs-day-value"),
  slaRisk: document.getElementById("sla-risk"),
  slaRiskValue: document.getElementById("sla-risk-value"),
  simFocus: document.getElementById("sim-focus"),
  simExposure: document.getElementById("sim-exposure"),
  simShift: document.getElementById("sim-shift"),
  simRecover: document.getElementById("sim-recover"),
  simMargin: document.getElementById("sim-margin")
};

let latestRows = [];

[
  "live weather ingestion",
  "route compression scoring",
  "account risk surfacing",
  "dispatch automation triggers",
  "revenue protection planning"
].forEach((label) => {
  const chip = document.createElement("span");
  chip.className = "signal-chip";
  chip.textContent = label;
  els.signalTape.appendChild(chip);
});

function forecastUrl(territory) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${territory.latitude}&longitude=${territory.longitude}&daily=temperature_2m_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=4`;
}

function formatMoney(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function dayLabel(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function riskScore(day) {
  const rainWeight = day.rain * 0.52;
  const windWeight = day.wind * 1.18;
  const heatPenalty = day.temp >= 34 ? 18 : day.temp >= 29 ? 10 : 0;
  const coldPenalty = day.temp <= 2 ? 12 : day.temp <= 6 ? 6 : 0;
  return Math.min(100, Math.round(rainWeight + windWeight + heatPenalty + coldPenalty));
}

function riskLabel(score) {
  if (score >= 75) {
    return "hard";
  }
  if (score >= 50) {
    return "watch";
  }
  return "clear";
}

function responseMode(score) {
  if (score >= 78) {
    return "storm lock";
  }
  if (score >= 58) {
    return "controlled watch";
  }
  return "open capacity";
}

function toneForScore(score) {
  if (score >= 75) {
    return "critical";
  }
  if (score >= 50) {
    return "watch";
  }
  return "clear";
}

function actionFor(row, safestRow) {
  if (row.tomorrow.score >= 75) {
    return `Compress ${row.shortName} to emergency and contract work only. Shift flexible calls toward ${safestRow.shortName} and trigger pre-arrival delay notices.`;
  }
  if (row.tomorrow.score >= 50) {
    return `Keep ${row.shortName} active, but front-load technician confirmations, shorten promise windows, and reserve overflow crews.`;
  }
  return `Use ${row.shortName} as the clean booking zone for elective jobs and absorb overflow from higher-friction markets.`;
}

function buildFallbackRow(territory) {
  const days = fallbackWeather[territory.shortName].map((day, index) => ({
    label: dayLabel(index + 1),
    temp: day.temp,
    rain: day.rain,
    wind: day.wind,
    score: riskScore(day)
  }));

  return enrichRow(territory, days, false);
}

function enrichRow(territory, days, live) {
  const tomorrow = days[0];
  const peakScore = Math.max(...days.map((day) => day.score));
  const rollingScore = Math.round(days.reduce((sum, day) => sum + day.score, 0) / days.length);
  const deployableCrews = Math.max(1, Math.round(territory.crews - tomorrow.score / 18));
  const delayedStops = Math.max(1, Math.round(territory.baselineStops * (tomorrow.score / 100) * 0.6));
  const riskRevenue = delayedStops * 420;

  return {
    ...territory,
    live,
    days,
    tomorrow,
    peakScore,
    rollingScore,
    deployableCrews,
    delayedStops,
    riskRevenue
  };
}

async function loadTerritory(territory) {
  try {
    const response = await fetch(forecastUrl(territory));

    if (!response.ok) {
      throw new Error(`Weather fetch failed for ${territory.shortName}`);
    }

    const payload = await response.json();
    const indexes = payload.daily.time.slice(1, 4).length ? [1, 2, 3] : [0, 1, 2];
    const days = indexes.map((index, dayIndex) => {
      const point = {
        temp: Math.round(payload.daily.temperature_2m_max[index]),
        rain: Math.round(payload.daily.precipitation_probability_max[index]),
        wind: Math.round(payload.daily.wind_speed_10m_max[index])
      };

      return {
        label: dayLabel(dayIndex + 1),
        ...point,
        score: riskScore(point)
      };
    });

    return enrichRow(territory, days, true);
  } catch (error) {
    return buildFallbackRow(territory);
  }
}

function totalRevenueRisk(rows) {
  return rows.reduce((sum, row) => sum + row.riskRevenue, 0);
}

function totalCrewShift(rows) {
  const busiest = rows[0];
  const cleanest = rows[rows.length - 1];
  return Math.max(1, Math.round((busiest.delayedStops - cleanest.delayedStops) / 3));
}

function renderMetricBand(rows) {
  const highest = rows[0];
  const lowest = rows[rows.length - 1];
  const cards = [
    {
      label: "Response mode",
      value: responseMode(highest.tomorrow.score),
      copy: `${highest.shortName} sets the operating posture for tomorrow's board.`,
      tone: toneForScore(highest.tomorrow.score)
    },
    {
      label: "Capacity released",
      value: `${lowest.deployableCrews} crews`,
      copy: `${lowest.shortName} can absorb overflow and same-day elective work.`,
      tone: "clear"
    },
    {
      label: "Delay pressure",
      value: `${highest.delayedStops} stops`,
      copy: `These jobs are the likeliest candidates for resequencing or customer notifications.`,
      tone: toneForScore(highest.tomorrow.score)
    },
    {
      label: "Data confidence",
      value: rows.every((row) => row.live) ? "live feed" : "mixed mode",
      copy: rows.every((row) => row.live) ? "All territories are using current forecast data." : "One or more territories are on fallback assumptions.",
      tone: rows.every((row) => row.live) ? "clear" : "watch"
    }
  ];

  els.metricBand.innerHTML = cards.map((card) => `
    <article class="metric-card" data-tone="${card.tone}">
      <span>${card.label}</span>
      <strong>${card.value}</strong>
      <p>${card.copy}</p>
    </article>
  `).join("");
}

function renderTerritories(rows) {
  els.territoryGrid.innerHTML = rows.map((row) => `
    <article class="territory-card">
      <div class="territory-head">
        <div>
          <span>${row.region}</span>
          <h3>${row.name}</h3>
        </div>
        <span class="risk-pill risk-${riskLabel(row.tomorrow.score)}">${riskLabel(row.tomorrow.score)}</span>
      </div>
      <p>${row.serviceMix}</p>
      <div class="territory-meta">
        <span class="meta-chip">${row.live ? "live forecast" : "fallback model"}</span>
        <span class="meta-chip">${row.deployableCrews}/${row.crews} crews deployable</span>
        <span class="meta-chip">${row.delayedStops} stops likely to slip</span>
      </div>
      <div class="territory-stats">
        <div class="territory-stat">
          <span>Tomorrow</span>
          <strong>${row.tomorrow.temp}C</strong>
        </div>
        <div class="territory-stat">
          <span>Rain risk</span>
          <strong>${row.tomorrow.rain}%</strong>
        </div>
        <div class="territory-stat">
          <span>Wind load</span>
          <strong>${row.tomorrow.wind} km/h</strong>
        </div>
      </div>
      <div class="risk-days">
        ${row.days.map((day) => `
          <div class="risk-day">
            <span>${day.label}</span>
            <strong>${day.score}</strong>
            <div class="risk-meter">
              <div style="width: ${day.score}%"></div>
            </div>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function renderPriorities(rows) {
  const safestRow = rows[rows.length - 1];

  els.priorityList.innerHTML = rows.map((row) => `
    <article class="priority-card">
      <div class="priority-head">
        <div>
          <span>${row.anchorAccount}</span>
          <h3>${row.shortName}</h3>
        </div>
        <strong>${row.tomorrow.score}/100</strong>
      </div>
      <p>${actionFor(row, safestRow)}</p>
    </article>
  `).join("");

  els.dispatchCopy.textContent = `${safestRow.shortName} is the cleanest zone for same-day work. Reserve its open capacity for routine jobs pulled out of ${rows[0].shortName}.`;
}

function renderTrends(rows) {
  els.trendGrid.innerHTML = rows.map((row) => `
    <article class="trend-row">
      <div class="trend-head">
        <div>
          <span>${row.region}</span>
          <strong>${row.shortName}</strong>
        </div>
        <strong>Peak ${row.peakScore}</strong>
      </div>
      <div class="trend-bars">
        ${row.days.map((day) => `
          <div class="trend-bar">
            <span>${day.label}</span>
            <div class="trend-track">
              <div class="trend-fill" style="width: ${day.score}%"></div>
            </div>
            <strong>${day.score}</strong>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function buildAccounts(rows) {
  return rows.map((row) => ({
    market: row.shortName,
    account: row.anchorAccount,
    severity: row.tomorrow.score >= 75 ? "high" : row.tomorrow.score >= 50 ? "medium" : "low",
    copy: `${row.delayedStops} likely schedule collisions if bookings stay unchanged.`,
    value: formatMoney(row.riskRevenue)
  }));
}

function renderAccounts(rows) {
  const accounts = buildAccounts(rows);
  els.accountList.innerHTML = accounts.map((account) => `
    <article class="account-card" data-severity="${account.severity}">
      <div class="account-head">
        <div>
          <span>${account.market}</span>
          <h3>${account.account}</h3>
        </div>
        <strong>${account.value}</strong>
      </div>
      <p>${account.copy}</p>
    </article>
  `).join("");
}

function renderAutomations(rows) {
  const highest = rows[0];
  const lowest = rows[rows.length - 1];
  const steps = [
    {
      label: "Trigger 01",
      title: `Re-sequence ${highest.shortName}`,
      copy: `Move non-urgent work out of ${highest.shortName}, shorten promise windows, and alert dispatchers before the day starts.`
    },
    {
      label: "Trigger 02",
      title: "Customer notifications",
      copy: `Push delay notices for the ${highest.delayedStops} highest-risk stops so the first human touch is proactive, not reactive.`
    },
    {
      label: "Trigger 03",
      title: `Fill ${lowest.shortName}`,
      copy: `Route flexible same-day jobs into ${lowest.shortName} while it has the cleanest forecast and strongest crew availability.`
    },
    {
      label: "Trigger 04",
      title: "CRM + SLA logging",
      copy: "Write weather-based route changes back to tickets and flag accounts where an SLA breach is now probable."
    }
  ];

  els.automationList.innerHTML = steps.map((step) => `
    <article class="automation-step">
      <span>${step.label}</span>
      <h3>${step.title}</h3>
      <p>${step.copy}</p>
    </article>
  `).join("");
}

function renderExecutive(rows) {
  const highest = rows[0];
  const lowest = rows[rows.length - 1];
  const revenue = totalRevenueRisk(rows);
  const shift = totalCrewShift(rows);

  els.liveStamp.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  els.heroStatus.textContent = `${highest.shortName} needs schedule compression first`;
  els.heroSummary.textContent = `${highest.shortName} is carrying the sharpest weather friction over the next day, while ${lowest.shortName} is the safest zone to absorb elective work.`;
  els.executiveRisk.textContent = `${highest.shortName} ${highest.tomorrow.score}/100`;
  els.executiveSafe.textContent = lowest.shortName;
  els.executiveShift.textContent = `${shift} crews`;
  els.revenueRisk.textContent = formatMoney(revenue);
  els.safeZone.textContent = lowest.shortName;
  els.crewShift.textContent = String(shift);
  els.responseMode.textContent = responseMode(highest.tomorrow.score);
}

function updateSimulator() {
  if (!latestRows.length) {
    return;
  }

  const focus = latestRows[0];
  const avgTicket = Number(els.avgTicket.value);
  const jobs = Number(els.jobsDay.value);
  const tolerance = Number(els.slaRisk.value) / 100;
  const riskFactor = focus.tomorrow.score / 100;
  const exposure = avgTicket * jobs * riskFactor * (0.38 + tolerance * 0.5);
  const reroute = Math.max(1, Math.round(jobs * riskFactor * (0.34 + tolerance * 0.3)));
  const recovered = exposure * (0.28 + (1 - tolerance) * 0.24);
  const protectedCapacity = Math.min(96, Math.round((reroute / jobs) * 100 + focus.deployableCrews * 2));

  els.avgTicketValue.textContent = formatMoney(avgTicket);
  els.jobsDayValue.textContent = String(jobs);
  els.slaRiskValue.textContent = `${Math.round(tolerance * 100)}%`;
  els.simFocus.textContent = `Modeling ${focus.shortName}`;
  els.simExposure.textContent = formatMoney(exposure);
  els.simShift.textContent = String(reroute);
  els.simRecover.textContent = formatMoney(recovered);
  els.simMargin.textContent = `${protectedCapacity}%`;
}

async function main() {
  const rows = await Promise.all(territories.map(loadTerritory));
  rows.sort((a, b) => b.tomorrow.score - a.tomorrow.score);
  latestRows = rows;

  renderExecutive(rows);
  renderMetricBand(rows);
  renderTerritories(rows);
  renderPriorities(rows);
  renderTrends(rows);
  renderAccounts(rows);
  renderAutomations(rows);
  updateSimulator();
}

els.avgTicket.addEventListener("input", updateSimulator);
els.jobsDay.addEventListener("input", updateSimulator);
els.slaRisk.addEventListener("input", updateSimulator);

main().catch((error) => {
  els.heroStatus.textContent = "Unable to build dispatch brief";
  els.heroSummary.textContent = error.message;
});
