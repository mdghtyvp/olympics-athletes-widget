const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzOsQZUMGopOGwtrR_o5hJzBinhIfOgcOpwxo7dtOMB0M8QQcDiBbKm-_fHaOAQegeQUw/exec';

let currentVersion = null;

function loadData() {
  fetch(`${ENDPOINT}?t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {
      if (data.version !== currentVersion) {
        currentVersion = data.version;
        render(data);
      }
    })
    .catch(console.error);
}

// Initial load
loadData();

// Poll every 60 seconds
setInterval(loadData, 60000);

function render(data) {
  const container = document.getElementById('widget');

  data.athletes.forEach(athlete => {
    const el = document.createElement('div');
    el.className = 'athlete';

    el.innerHTML = `
      <div class="athlete-header">
        <img src="${athlete.headshot}" alt="${athlete.name}" />
        <div>
          <strong>${athlete.name}</strong><br />
          ${athlete.sport}, age ${athlete.age}<br />
          <em>${athlete.vtConnection}</em>
        </div>
      </div>
      <div class="events">
        ${renderEvents(athlete.events)}
      </div>
    `;

    container.appendChild(el);
  });
}

function renderEvents(events = []) {
  if (!events.length) return '';

  return events.map(event => `
    <div class="event">
      <div>
        ${event.label}<br />
        <small>${formatDate(event.datetime)}</small>
        ${event.result ? `<div>Result: ${event.result}</div>` : ''}
      </div>
      ${event.medal ? `<div class="medal">${event.medal.toUpperCase()}</div>` : ''}
    </div>
  `).join('');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString();
}
