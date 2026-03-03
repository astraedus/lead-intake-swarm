const territories = [
  {
    name: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    segment: "Dense service territory with tight dispatch windows"
  },
  {
    name: "Dallas",
    latitude: 32.7767,
    longitude: -96.797,
    segment: "Fast suburban routing for HVAC and home-service teams"
  },
  {
    name: "Seattle",
    latitude: 47.6062,
    longitude: -122.3321,
    segment: "Rain-heavy field operations with crew scheduling risk"
  }
];

const leadList = document.getElementById("lead-list");
const barList = document.getElementById("bars");
const actionList = document.getElementById("action-list");
const signalTape = document.getElementById("signal-tape");
const sequenceRail = document.getElementById("sequence-rail");

[
  "live forecast scoring",
  "weather-sensitive dispatch",
  "same-day scheduling",
  "field-service automation"
].forEach((label) => {
  const chip = document.createElement("span");
  chip.className = "signal-chip";
  chip.textContent = label;
  signalTape.appendChild(chip);
});

function forecastUrl(territory) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${territory.latitude}&longitude=${territory.longitude}&daily=temperature_2m_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=3`;
}

function riskScore(day) {
  const rain = day.rain;
  const wind = day.wind;
  const heatPenalty = day.temp >= 32 ? 16 : day.temp >= 27 ? 8 : 0;
  return Math.min(Math.round(rain * 0.6 + wind * 1.4 + heatPenalty), 100);
}

function badgeLabel(score) {
  if (score >= 75) {
    return "hard";
  }
  if (score >= 50) {
    return "watch";
  }
  return "clear";
}

function actionFor(score, city) {
  if (score >= 75) {
    return `Keep only urgent jobs in ${city}, move routine calls elsewhere, and pre-warn customers about schedule compression.`;
  }
  if (score >= 50) {
    return `Keep ${city} open, but tighten technician windows and front-load confirmation messages.`;
  }
  return `Use ${city} as the easiest same-day booking zone and stack lower-friction jobs there.`;
}

function dayLabel(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short"
  });
}

function renderSequence(highest, lowest) {
  sequenceRail.innerHTML = "";
  const steps = [
    {
      stage: "01",
      title: "Pull forecast",
      text: "Grab 72-hour weather data for active service territories."
    },
    {
      stage: "02",
      title: "Score friction",
      text: "Blend rain probability, wind speed, and heat into one dispatch risk index."
    },
    {
      stage: "03",
      title: "Protect margin",
      text: `${highest.name} is the most expensive place to promise sloppy scheduling tomorrow.`
    },
    {
      stage: "04",
      title: "Route clean work",
      text: `${lowest.name} is the safest territory for same-day, non-emergency jobs.`
    }
  ];

  steps.forEach((item, index) => {
    const node = document.createElement("article");
    node.className = "sequence-step";
    node.style.animationDelay = `${index * 90}ms`;
    node.innerHTML = `
      <span>${item.stage}</span>
      <strong>${item.title}</strong>
      <p>${item.text}</p>
    `;
    sequenceRail.appendChild(node);
  });
}

function renderBoard(rows) {
  leadList.innerHTML = "";
  barList.innerHTML = "";
  actionList.innerHTML = "";

  rows.forEach((row) => {
    const leadCard = document.createElement("article");
    leadCard.className = "lead-card";
    leadCard.innerHTML = `
      <h3>${row.name}</h3>
      <span class="item-meta">${row.segment}</span>
      <span class="item-meta">Tomorrow: ${row.temp}°C, ${row.rain}% rain chance, ${row.wind} km/h wind</span>
      <div class="score-row">
        <span class="item-meta">Route score ${row.score}/100</span>
        <span class="pill">${badgeLabel(row.score)}</span>
      </div>
    `;
    leadList.appendChild(leadCard);

    const barItem = document.createElement("div");
    barItem.className = "bar-item";
    barItem.innerHTML = `
      <div class="bar-top">
        <span>${row.name}</span>
        <strong>${row.rain}% rain</strong>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${row.score}%"></div>
      </div>
    `;
    barList.appendChild(barItem);

    const actionCard = document.createElement("article");
    actionCard.className = "action";
    actionCard.innerHTML = `
      <h3>${row.name}</h3>
      <p>${row.action}</p>
    `;
    actionList.appendChild(actionCard);
  });
}

async function loadTerritory(territory) {
  const response = await fetch(forecastUrl(territory));
  if (!response.ok) {
    throw new Error(`Weather fetch failed for ${territory.name}`);
  }

  const payload = await response.json();
  const index = payload.daily.time[1] ? 1 : 0;
  const row = {
    name: territory.name,
    segment: territory.segment,
    temp: Math.round(payload.daily.temperature_2m_max[index]),
    rain: Math.round(payload.daily.precipitation_probability_max[index]),
    wind: Math.round(payload.daily.wind_speed_10m_max[index]),
    day: dayLabel(payload.daily.time[index])
  };
  row.score = riskScore(row);
  row.action = actionFor(row.score, row.name);
  return row;
}

async function main() {
  try {
    const rows = await Promise.all(territories.map(loadTerritory));
    rows.sort((a, b) => b.score - a.score);

    const highest = rows[0];
    const lowest = rows[rows.length - 1];

    document.getElementById("hero-status").textContent = `${highest.name} needs the tightest dispatch control`;
    document.getElementById("hero-summary").textContent = `${highest.name} carries the highest weather friction, while ${lowest.name} is the cleanest same-day booking zone for ${lowest.day}.`;
    document.getElementById("hero-risk-city").textContent = highest.name;
    document.getElementById("hero-clear-city").textContent = lowest.name;
    document.getElementById("hero-risk-index").textContent = String(highest.score);

    renderSequence(highest, lowest);
    renderBoard(rows);
  } catch (error) {
    document.getElementById("hero-status").textContent = "Live data unavailable";
    document.getElementById("hero-summary").textContent = error.message;
    sequenceRail.innerHTML = `
      <article class="sequence-step" style="opacity:1;transform:none">
        <span>error</span>
        <strong>Weather feed failed</strong>
        <p>The live forecast could not be loaded right now.</p>
      </article>
    `;
  }
}

main();
