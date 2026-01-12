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
  container.innerHTML = '';

  data.athletes.forEach(athlete => {
    const el = document.createElement('div');
    el.className = 'athlete';

    el.innerHTML = `
      <div class="athlete-header">
        <img src="${athlete.headshot}" alt="${athlete.name}" />
        <div class="athlete-info">
          <h2 class="athlete-name">${athlete.name} <span class="athlete-age">(${athlete.age})</span></h2>
          <div class="athlete-sport">${athlete.sport}</div>
          <p class="athlete-connection">${athlete.vtConnection}</p>
        </div>
      </div>
      <div class="events">
        ${renderEvents(classifyEvents(athlete.events))}
      </div>
    `;

    container.appendChild(el);
  });
}

function renderEvents(events = []) {
  if (!events.length) return '';

  const upcoming = events.filter(e => !e.completed);
  const completed = events.filter(e => e.completed);

  let html = '';

  if (upcoming.length) {
    html += `<div class="event-group"><h3 class="event-group-header">Upcoming</h3>`;
    html += upcoming.map(renderEvent).join('');
    html += `</div>`;
  }

  if (completed.length) {
    html += `<div class="event-group"><h3 class="event-group-header">Results</h3>`;
    html += completed.map(renderEvent).join('');
    html += `</div>`;
  }

  return html;
}

function renderEvent(event) {
  const medalClass = event.medal ? 'has-medal' : '';
  const medalLabel = event.medal ? ` (${event.medal.charAt(0).toUpperCase() + event.medal.slice(1)})` : '';

  return `
    <div class="event ${event.completed ? 'completed' : 'upcoming'} ${medalClass}">
      <div class="event-label">${event.label}</div>
      <div class="event-datetime-result">
        ${event.result ? `${event.result}${medalLabel}` : formatDate(event.datetime)}
      </div>
      ${event.medal ? renderMedal(event.medal) : ''}
    </div>
  `;
}

function renderMedal(medal) {
  const label = medal.charAt(0).toUpperCase() + medal.slice(1);

  return `
    <div class="medal-badge medal-${medal}" aria-label="${label} medal" role="img"></div>
  `;
}

// ===============================
// UTILITIES
// ===============================

function classifyEvents(events = []) {
  return events
    .map(event => ({
      ...event,
      completed: Boolean(event.result)
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
