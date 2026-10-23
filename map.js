import { DESTINATIONS } from './destinations.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export function setupMap({ currentZone, getCurrentDestination = () => currentZone, onSelect, onClose }) {
  const overlay = document.getElementById('map');
  const board = document.getElementById('map-board');
  const closeBtn = document.getElementById('btn-close-map');
  if (!overlay || !board || !closeBtn) throw new Error('Map UI elements are missing from the page.');

  const toolbar = document.createElement('section');
  toolbar.className = 'board-tools';
  toolbar.setAttribute('aria-label', 'Search and filter destinations');
  toolbar.innerHTML = `
    <label class="destination-search-label" for="destination-search">SEARCH LOCATIONS</label>
    <div class="destination-search-wrap">
      <input id="destination-search" class="destination-search" type="search" maxlength="48"
        placeholder="Country, landmark, city, or coordinates…" autocomplete="off">
      <button class="board-tool-button search-clear" type="button" aria-label="Clear search">CLEAR</button>
    </div>
    <div class="alphabet-filter" role="group" aria-label="Filter by first letter"></div>
    <div class="onscreen-keyboard" role="group" aria-label="Clickable on-screen keyboard"></div>
  `;
  board.before(toolbar);

  const searchInput = toolbar.querySelector('.destination-search');
  const alphabet = toolbar.querySelector('.alphabet-filter');
  const keyboard = toolbar.querySelector('.onscreen-keyboard');
  if (!searchInput || !alphabet || !keyboard) throw new Error('Destination search controls could not be created.');

  let activeLetter = '';

  function matches(destination) {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const content = [
      destination.country,
      destination.location,
      destination.coordinates,
      destination.terrain,
    ].join(' ').toLocaleLowerCase();
    const letterMatches = !activeLetter ||
      destination.country.toLocaleUpperCase().startsWith(activeLetter) ||
      destination.location.toLocaleUpperCase().startsWith(activeLetter);
    return (!query || content.includes(query)) && letterMatches;
  }

  function renderKeyboard() {
    keyboard.replaceChildren();
    KEY_ROWS.forEach((row) => {
      const rowElement = document.createElement('div');
      rowElement.className = 'keyboard-row';
      for (const letter of row) {
        const key = document.createElement('button');
        key.className = 'keyboard-key';
        key.type = 'button';
        key.textContent = letter;
        key.setAttribute('aria-label', `Type ${letter}`);
        key.addEventListener('click', () => {
          searchInput.value += letter.toLocaleLowerCase();
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.focus();
        });
        rowElement.appendChild(key);
      }
      keyboard.appendChild(rowElement);
    });
    const actions = document.createElement('div');
    actions.className = 'keyboard-row keyboard-actions';
    [
      { label: 'SPACE', value: ' ', className: 'keyboard-key key-space' },
      { label: '⌫', value: 'backspace', className: 'keyboard-key key-delete' },
      { label: 'CLEAR', value: 'clear', className: 'keyboard-key key-clear' },
    ].forEach(({ label, value, className }) => {
      const key = document.createElement('button');
      key.className = className;
      key.type = 'button';
      key.textContent = label;
      key.addEventListener('click', () => {
        if (value === 'clear') searchInput.value = '';
        else if (value === 'backspace') searchInput.value = searchInput.value.slice(0, -1);
        else searchInput.value += value;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.focus();
      });
      actions.appendChild(key);
    });
    keyboard.appendChild(actions);
  }

  function renderAlphabet() {
    alphabet.replaceChildren();
    const all = document.createElement('button');
    all.className = `letter-filter${activeLetter ? '' : ' active'}`;
    all.type = 'button';
    all.textContent = 'ALL';
    all.dataset.letter = 'all';
    all.setAttribute('aria-pressed', String(!activeLetter));
    all.addEventListener('click', () => {
      activeLetter = '';
      render();
      alphabet.querySelector('[data-letter="all"]')?.focus();
    });
    alphabet.appendChild(all);
    ALPHABET.forEach((letter) => {
      const button = document.createElement('button');
      button.className = `letter-filter${activeLetter === letter ? ' active' : ''}`;
      button.type = 'button';
      button.textContent = letter;
      button.dataset.letter = letter;
      button.setAttribute('aria-pressed', String(activeLetter === letter));
      button.addEventListener('click', () => {
        activeLetter = activeLetter === letter ? '' : letter;
        render();
        alphabet.querySelector(`[data-letter="${letter}"]`)?.focus();
      });
      alphabet.appendChild(button);
    });
  }

  function render() {
    renderAlphabet();
    board.replaceChildren();

    const currentDestination = getCurrentDestination();
    const visibleDestinations = DESTINATIONS.filter(matches).sort((left, right) =>
      left.country.localeCompare(right.country) || left.location.localeCompare(right.location)
    );
    const atlas = document.createElement('div');
    atlas.className = 'atlas-map';
    atlas.setAttribute('role', 'group');
    atlas.setAttribute('aria-label', 'Stylized atlas showing the starter destinations');
    atlas.innerHTML = `
      <svg class="atlas-land" viewBox="0 0 800 480" aria-hidden="true">
        <path d="M74 132 112 92 173 79 211 102 202 139 227 165 203 192 180 235 151 255 132 223 111 215 93 181 68 167Z"/>
        <path d="m199 258 34 9 28 39-13 46-17 48-21-18-10-51-20-42Z"/>
        <path d="m347 119 32-29 54 4 24 22 43-7 37 23 55-3 39 28-8 31-46 8-13 30-34 1-19 34-38-11-22-35-36-1-28-36-43-5-10-30Z"/>
        <path d="m426 256 39-14 50 14 25 36-17 53-39 44-34-15-14-48-25-35Z"/>
        <path d="m585 301 34-17 34 13 12 23-39 16-36-10Z"/>
        <path d="m669 153 42-20 47 11 11 35-35 15-29-11-34 7Z"/>
        <path class="atlas-contour" d="M360 132c54-24 94 18 146-2s78 1 118 15M348 150c48-22 83 17 132 0s83-2 126 17M379 170c45-18 78 13 119 1s65-3 101 12M428 194c34-12 66 13 98 2s53 2 78 14M105 125c35-16 68 8 96-2m-112 26c36-14 69 9 103 0m-76 30c27-10 49 3 69-5"/>
      </svg>
      <div class="atlas-label atlas-label-west">ATLANTIC OCEAN</div>
      <div class="atlas-label atlas-label-east">ASIA</div>
      <div class="atlas-scale"><span></span> NOT TO SCALE</div>
      <div class="atlas-status">STARTER ATLAS · ${visibleDestinations.length} / ${DESTINATIONS.length} SHOWN</div>
    `;
    visibleDestinations.forEach((destination) => {
      const marker = document.createElement('button');
      marker.className = 'atlas-marker';
      marker.classList.toggle('active', destination.id === currentDestination);
      marker.type = 'button';
      marker.style.left = `${destination.marker[0]}%`;
      marker.style.top = `${destination.marker[1]}%`;
      marker.setAttribute('aria-label', `Select ${destination.location}, ${destination.country}${destination.id === currentDestination ? ', current stop' : ''}`);
      const dot = document.createElement('span');
      dot.className = 'atlas-dot';
      const label = document.createElement('span');
      label.className = 'atlas-marker-label';
      label.textContent = destination.location;
      marker.append(dot, label);
      marker.addEventListener('click', () => selectDestination(destination));
      atlas.appendChild(marker);
    });
    board.appendChild(atlas);

    const list = document.createElement('div');
    list.className = 'destination-list';
    const heading = document.createElement('div');
    heading.className = 'destination-list-heading';
    heading.textContent = 'PIN A PLACE TO VISIT';
    list.appendChild(heading);
    const count = document.createElement('div');
    count.className = 'destination-result-count';
    count.textContent = `${visibleDestinations.length} LOCATION${visibleDestinations.length === 1 ? '' : 'S'} · ${DESTINATIONS.length} IN STARTER CATALOG`;
    list.appendChild(count);

    if (visibleDestinations.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'destination-empty';
      empty.textContent = 'No locations match. Try another search or letter.';
      list.appendChild(empty);
    }

    visibleDestinations.forEach((destination) => {
      const card = document.createElement('button');
      card.className = 'destination-card';
      card.type = 'button';
      card.classList.toggle('active', destination.id === currentDestination);
      card.setAttribute('aria-current', destination.id === currentDestination ? 'location' : 'false');
      const country = document.createElement('span');
      country.className = 'destination-country';
      country.textContent = destination.country;
      const location = document.createElement('strong');
      location.textContent = destination.location;
      const coordinates = document.createElement('span');
      coordinates.className = 'destination-coordinates';
      coordinates.textContent = destination.coordinates;
      const terrain = document.createElement('span');
      terrain.className = 'destination-terrain';
      terrain.textContent = destination.terrain;
      const action = document.createElement('span');
      action.className = 'destination-action';
      action.textContent = destination.id === currentDestination ? 'CURRENT STOP' : 'OPEN FIELD NOTES  →';
      card.append(country, location, coordinates, terrain, action);
      card.addEventListener('click', () => selectDestination(destination));
      list.appendChild(card);
    });
    board.appendChild(list);
  }

  function selectDestination(destination) {
    overlay.classList.add('hidden');
    onSelect(destination.id, destination);
  }

  toolbar.querySelector('.search-clear')?.addEventListener('click', () => {
    searchInput.value = '';
    activeLetter = '';
    render();
    searchInput.focus();
  });
  searchInput.addEventListener('input', render);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (searchInput.value || activeLetter) {
        event.stopPropagation();
        searchInput.value = '';
        activeLetter = '';
        render();
        searchInput.focus();
      }
    }
  });
  closeBtn.onclick = () => {
    overlay.classList.add('hidden');
    onClose?.();
  };

  renderKeyboard();
  render();
  return {
    open() {
      render();
      overlay.classList.remove('hidden');
      searchInput.focus();
    },
    close() {
      overlay.classList.add('hidden');
    },
    isOpen() {
      return !overlay.classList.contains('hidden');
    },
  };
}
