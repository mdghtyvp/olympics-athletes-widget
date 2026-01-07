// ===============================
// TOP-LEVEL CONSTANTS (MUST BE FIRST)
// ===============================

const container = document.getElementById('widget');
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzOsQZUMGopOGwtrR_o5hJzBinhIfOgcOpwxo7dtOMB0M8QQcDiBbKm-_fHaOAQegeQUw/exec';

let currentVersion = null;
let hasRendered = false;

// ===============================
// STATE HANDLING
// ===============================

function showState(message, type = '') {
  container.innerHTML = `
    <div class="state ${type}">${message}</div>
  `;
}

// ===============================
// DATA LOADING
// ===============================

function loadData() {
  if (!hasRendered) {
    showState('Loading athlete results…');
  }

  fetch(`${ENDPOINT}?t=${Date.now()}`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      if (!data.athletes || !data.athletes.length) {
        if (!hasRendered) {
          showState('No athlete data available.', 'empty');
        }
        return;
      }

      if (data.version !== currentVersion) {
        currentVersion = data.version;
        render(data);
        hasRendered = true;
      }
    })
    .catch(err => {
      console.error(err);
      if (!hasRendered) {
        showState('Results are temporarily unavailable.', 'error');
      }
    });
}

// ===============================
// RENDERING
// ===============================

function render(data) {
  const container = document.getElementById('widget');
  container.innerHTML = ''; // clear previous content

  // Create the responsive grid wrapper
  const grid = document.createElement('div');
  grid.className = 'athletes-grid';

  // Loop through athletes
  data.athletes.forEach(athlete => {
    // Sort events chronologically (ISO datetime assumed)
    const eventsSorted = (athlete.events || [])
      .filter(e => e.event_datetime_iso)
      .sort((a, b) => new Date(a.event_datetime_iso) - new Date(b.event_datetime_iso));

    // Determine if athlete has any medal
    const medalEvent = eventsSorted.find(e => e.medal);
    const hasMedal = Boolean(medalEvent);

    // Create athlete card
    const card = document.createElement('div');
    card.className = 'athlete-card';
    if (hasMedal) card.classList.add('has-medal');

    // Optional medal icon HTML
    const medalIconHTML = hasMedal
      ? `<img class="medal-icon" src="icons/medal-${medalEvent.medal}.svg" alt="${medalEvent.medal} medal" />`
      : '';

    // Card inner HTML
    card.innerHTML = `
      <div class="athlete-header">
        <img src="${athlete.headshot}" alt="${athlete.name}" />
        <div class="athlete-text">
          <h2 class="athlete-name">
            <span class="name-text">${athlete.name}</span>
            ${medalIconHTML}
          </h2>
          <div class="athlete-sport">${athlete.sport}, age ${athlete.age}</div>
          <div class="athlete-connection">${athlete.vtConnection}</div>
        </div>
      </div>

      <div class="events">
        ${renderEvents(eventsSorted)}
      </div>
    `;

    // Append card to grid
    grid.appendChild(card);
  });

  // Attach the grid to container
  container.appendChild(grid);
}


function renderEvents(events = []) {
  if (!events.length) return '';

  return events
    .sort((a, b) => new Date(a.event_datetime_iso) - new Date(b.event_datetime_iso))
    .map(event => {
      const medalText = event.medal ? `(${event.medal})` : '';
      return `
        <div class="event">
          <div class="event-name">${event.label} ${medalText}</div>
          ${event.datetime ? `<div class="event-time">${formatDate(event.datetime)}</div>` : ''}
          ${event.result ? `<div class="event-result">${event.result}</div>` : ''}
        </div>
      `;
    })
    .join('');
}


function renderEvent(event) {
  return `
    <div class="event ${event.completed ? 'completed' : 'upcoming'}">
      <div>
        ${event.label}<br />
        <small>${formatDate(event.datetime)}</small>
        ${event.result ? `<div>Result: ${event.result}</div>` : ''}
      </div>
      ${event.medal ? renderMedal(event.medal) : ''}
    </div>
  `;
}

function renderMedal(medal) {
  const label = medal.charAt(0).toUpperCase() + medal.slice(1);

  return `
    <div class="medal-wrapper" aria-label="${label} medal">
      <img
        src="icons/medal-${medal}.svg"
        alt="${label} medal"
        class="medal-icon"
      />
    </div>
  `;
}

// ===============================
// UTILITIES
// ===============================

function classifyEvents(events = []) {
  return events
    .map(event => ({
      ...event,
      completed: Boolean(event.result || event.medal)
    }))
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return new Date(a.datetime) - new Date(b.datetime);
    });
}

function formatDate(iso) {
  if (!iso) return '';

  const date = new Date(iso);

  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) + ' ET';
}


// ===============================
// KICKOFF (MUST BE LAST)
// ===============================

loadData();
setInterval(loadData, 60000);
