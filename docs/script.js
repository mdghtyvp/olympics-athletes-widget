// ===============================
// TOP-LEVEL CONSTANTS (MUST BE FIRST)
// ===============================

const container = document.getElementById('widget');
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzOsQZUMGopOGwtrR_o5hJzBinhIfOgcOpwxo7dtOMB0M8QQcDiBbKm-_fHaOAQegeQUw/exec';

let currentVersion = null;
let hasRendered = false;

const controlState = {
  sortMethod: 'event-soonest',
  activeSports: new Set(),
  cachedData: null
};

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
    showState('Loading athletes…');
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
// SORTING & FILTERING UTILITIES
// ===============================

function getLastName(athlete) {
  if (!athlete.name) return '';
  const parts = athlete.name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

function getEarliestUpcomingEvent(athlete) {
  const upcoming = athlete.events
    .filter(e => !e.result)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  return upcoming[0] || null;
}

function getEarliestCompletedEvent(athlete) {
  const completed = athlete.events
    .filter(e => e.result)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  return completed[0] || null;
}

function getEarliestEvent(athlete) {
  if (!athlete.events || !athlete.events.length) return null;
  return athlete.events
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0];
}

function getMedalScore(athlete) {
  let score = 0;
  athlete.events.forEach(event => {
    if (event.medal === 'gold') score += 1000;
    else if (event.medal === 'silver') score += 100;
    else if (event.medal === 'bronze') score += 10;
  });
  return score;
}

function sortAthletes(athletes, method) {
  const sorted = [...athletes];

  switch (method) {
    case 'event-soonest':
      return sorted.sort((a, b) => {
        const aUpcoming = getEarliestUpcomingEvent(a);
        const bUpcoming = getEarliestUpcomingEvent(b);

        if (aUpcoming && bUpcoming) {
          return new Date(aUpcoming.datetime) - new Date(bUpcoming.datetime);
        }
        if (aUpcoming && !bUpcoming) return -1;
        if (!aUpcoming && bUpcoming) return 1;

        const aCompleted = getEarliestCompletedEvent(a);
        const bCompleted = getEarliestCompletedEvent(b);

        if (aCompleted && bCompleted) {
          return new Date(aCompleted.datetime) - new Date(bCompleted.datetime);
        }
        if (aCompleted && !bCompleted) return -1;
        if (!aCompleted && bCompleted) return 1;

        return 0;
      });

    case 'event-oldest':
      return sorted.sort((a, b) => {
        const aEarliest = getEarliestEvent(a);
        const bEarliest = getEarliestEvent(b);

        if (!aEarliest && !bEarliest) return 0;
        if (!aEarliest) return 1;
        if (!bEarliest) return -1;

        return new Date(aEarliest.datetime) - new Date(bEarliest.datetime);
      });

    case 'athlete-az':
      return sorted.sort((a, b) => {
        return getLastName(a).localeCompare(getLastName(b));
      });

    case 'medal-wins':
      return sorted.sort((a, b) => {
        const scoreDiff = getMedalScore(b) - getMedalScore(a);
        if (scoreDiff !== 0) return scoreDiff;
        // Fallback to alphabetical by last name for same medal count
        return getLastName(a).localeCompare(getLastName(b));
      });

    default:
      return sorted;
  }
}

function getUniqueSports(athletes) {
  const sports = new Set();
  athletes.forEach(athlete => {
    if (athlete.sport) sports.add(athlete.sport);
  });
  return Array.from(sports).sort();
}

function filterAthletes(athletes) {
  if (controlState.activeSports.size === 0) {
    return [];
  }
  return athletes.filter(athlete =>
    controlState.activeSports.has(athlete.sport)
  );
}

// ===============================
// CONTROL RENDERING & INTERACTION
// ===============================

function getSportsFilterLabel(allSports) {
  const activeCount = controlState.activeSports.size;
  const totalCount = allSports.length;

  if (activeCount === totalCount) return 'All sports';
  if (activeCount === 1) return Array.from(controlState.activeSports)[0];
  return `${activeCount} sports`;
}

function renderControls(athletes) {
  const allSports = getUniqueSports(athletes);

  if (controlState.activeSports.size === 0) {
    allSports.forEach(sport => controlState.activeSports.add(sport));
  }

  const filterLabel = getSportsFilterLabel(allSports);

  return `
    <div class="controls-container">
      <div class="controls-wrapper">
        <div class="control-group">
          <label class="control-label" for="sort-select">Sort by</label>
          <select id="sort-select" class="sort-select">
            <option value="event-soonest" ${controlState.sortMethod === 'event-soonest' ? 'selected' : ''}>Event (soonest)</option>
            <option value="event-oldest" ${controlState.sortMethod === 'event-oldest' ? 'selected' : ''}>Event (oldest)</option>
            <option value="athlete-az" ${controlState.sortMethod === 'athlete-az' ? 'selected' : ''}>Athletes A→Z</option>
            <option value="medal-wins" ${controlState.sortMethod === 'medal-wins' ? 'selected' : ''}>Medal wins</option>
          </select>
        </div>

        <div class="control-group">
          <label class="control-label">Filter by sport</label>
          <div class="sports-filter">
            <button class="sports-filter-toggle" id="sports-filter-toggle" type="button">
              <span id="sports-filter-label">${filterLabel}</span>
              <span class="dropdown-arrow">▼</span>
            </button>
            <div class="sports-filter-menu" id="sports-filter-menu">
              ${allSports.map(sport => `
                <label class="sports-filter-option">
                  <input
                    type="checkbox"
                    value="${sport}"
                    ${controlState.activeSports.has(sport) ? 'checked' : ''}
                  />
                  <span>${sport}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachControlListeners(athletes) {
  const sortSelect = document.getElementById('sort-select');
  const filterToggle = document.getElementById('sports-filter-toggle');
  const filterMenu = document.getElementById('sports-filter-menu');
  const filterLabel = document.getElementById('sports-filter-label');

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      controlState.sortMethod = e.target.value;
      renderAthletes();
    });
  }

  if (filterToggle) {
    filterToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      filterMenu.classList.toggle('open');
      filterToggle.classList.toggle('open');
    });
  }

  if (filterMenu) {
    const checkboxes = filterMenu.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const sport = e.target.value;
        if (e.target.checked) {
          controlState.activeSports.add(sport);
        } else {
          controlState.activeSports.delete(sport);
        }

        const allSports = getUniqueSports(athletes);
        filterLabel.textContent = getSportsFilterLabel(allSports);
        renderAthletes();
      });
    });
  }

  document.addEventListener('click', (e) => {
    if (filterMenu && filterToggle) {
      if (!filterToggle.contains(e.target) && !filterMenu.contains(e.target)) {
        filterMenu.classList.remove('open');
        filterToggle.classList.remove('open');
      }
    }
  });
}

// ===============================
// RENDERING
// ===============================

function render(data) {
  controlState.cachedData = data;
  container.innerHTML = renderControls(data.athletes);
  renderAthletes();
  attachControlListeners(data.athletes);
}

function renderAthletes() {
  if (!controlState.cachedData) return;

  const athleteCards = container.querySelectorAll('.athlete');
  athleteCards.forEach(card => card.remove());

  let athletes = filterAthletes(controlState.cachedData.athletes);
  athletes = sortAthletes(athletes, controlState.sortMethod);

  if (athletes.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'state empty';
    emptyMessage.textContent = 'No athletes match the selected filters.';
    container.appendChild(emptyMessage);
    return;
  }

  athletes.forEach(athlete => {
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
