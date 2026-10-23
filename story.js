const STORIES = {
  hub: {
    arrival: 'A paper pin drops onto the field map. The beacon sweeps across the island, and a radio crackles to life.',
    voice: 'MARA, FIELD COORDINATOR',
    greeting: '“You made it. The board is more than a map—it remembers places people have tried to erase.”',
    clue: [
      '“This beacon used to flash twice before dawn. Last week, someone changed the pattern.”',
      '“I found this wedged beneath the map table. The ink is still fresh: ‘Look where the river cuts the stone.’”',
      'CLUE ADDED · A field note points toward an old river crossing.',
    ],
  },
  desert: {
    arrival: 'Heat shimmers above the Giza Plateau. A torn survey sheet is pinned beneath a brass compass.',
    voice: 'NADIA, SITE RESEARCHER',
    greeting: '“I was mapping the west path when I heard a hollow knock from inside the old survey marker.”',
    clue: [
      '“The marker is not a tomb. It is a boundary stone—and somebody turned it toward the Sphinx.”',
      '“There is a strip of blue thread in the crack. It matches the thread on the missing expedition journal.”',
      'CLUE ADDED · Blue thread links the marker to a missing journal.',
    ],
  },
  snow: {
    arrival: 'The trail climbs into the thin air below Everest. Prayer flags snap over a fresh line of boot prints.',
    voice: 'TENZIN, TRAIL GUIDE',
    greeting: '“The weather changed in minutes. Someone left camp in a hurry, but they walked toward the storm.”',
    clue: [
      '“These prints stop at the ridge. There is no return trail, even though the snow fell after them.”',
      '“A brass button was caught in the ice. It has the same beacon mark as the one back at the island.”',
      'CLUE ADDED · A marked brass button connects the ridge to the beacon.',
    ],
  },
};

export function setupStory({ onClose, onCinematic, onTalking }) {
  const overlay = document.getElementById('story');
  const art = document.getElementById('story-art');
  const eyebrow = document.getElementById('story-eyebrow');
  const title = document.getElementById('story-title');
  const speaker = document.getElementById('story-speaker');
  const line = document.getElementById('story-line');
  const choices = document.getElementById('story-choices');
  const progress = document.getElementById('story-progress');
  const voiceButton = document.getElementById('story-voice');
  const continueButton = document.getElementById('story-continue');
  if (![overlay, art, eyebrow, title, speaker, line, choices, progress, voiceButton, continueButton].every(Boolean)) {
    throw new Error('Story UI elements are missing from the page.');
  }

  let pages = [];
  let pageIndex = 0;
  let onFinish = null;
  let mode = 'pages';
  let conversationZone = null;
  let pageFinalText = 'ENTER LOCATION';
  let cinematicActive = false;
  let typingTimer = 0;
  let typing = false;
  let speechToken = 0;
  let latestSpeech = '';
  const speechAvailable = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let voiceEnabled = speechAvailable;
  voiceButton.disabled = !speechAvailable;
  voiceButton.textContent = speechAvailable ? 'VOICE: ON' : 'VOICE UNAVAILABLE';

  function stopVoice() {
    speechToken++;
    if (speechAvailable) window.speechSynthesis.cancel();
    onTalking?.(false);
  }

  function speak(text) {
    latestSpeech = text;
    if (!voiceEnabled || !text) return;
    window.speechSynthesis.cancel();
    const token = ++speechToken;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.onend = () => {
      if (token === speechToken) onTalking?.(false);
    };
    utterance.onerror = () => {
      if (token === speechToken) onTalking?.(false);
    };
    window.speechSynthesis.speak(utterance);
  }

  function showSubtitle(text, spokenText = text, animate = true) {
    window.clearInterval(typingTimer);
    typing = false;
    line.dataset.fullText = text;
    line.textContent = '';
    if (!animate) {
      line.textContent = text;
      updateFooter();
      return;
    }
    typing = true;
    onTalking?.(true);
    speak(spokenText);
    const characters = Array.from(text);
    let visibleCount = 0;
    typingTimer = window.setInterval(() => {
      visibleCount = Math.min(visibleCount + 2, characters.length);
      line.textContent = characters.slice(0, visibleCount).join('');
      if (visibleCount >= characters.length) {
        window.clearInterval(typingTimer);
        typingTimer = 0;
        typing = false;
        if (!voiceEnabled || !speechAvailable) onTalking?.(false);
        updateFooter();
      }
    }, 18);
    updateFooter();
  }

  function finishTyping() {
    if (!typing) return;
    window.clearInterval(typingTimer);
    typingTimer = 0;
    typing = false;
    line.textContent = line.dataset.fullText ?? line.textContent;
    if (!voiceEnabled || !speechAvailable) onTalking?.(false);
    updateFooter();
  }

  function updateFooter() {
    progress.textContent = pages.length
      ? `${String(Math.min(pageIndex + 1, pages.length)).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`
      : 'FIELD INTERVIEW';
    if (mode === 'pages') {
      continueButton.textContent = pageIndex === pages.length - 1 ? pageFinalText : 'CONTINUE  →';
    } else if (mode === 'choices') {
      continueButton.textContent = 'CHOOSE A RESPONSE';
      continueButton.disabled = true;
    } else if (mode === 'start') {
      continueButton.textContent = 'START SEARCH';
      continueButton.disabled = typing;
    } else if (mode === 'search') {
      continueButton.textContent = 'KEEP SEARCHING';
      continueButton.disabled = typing;
    } else {
      continueButton.textContent = 'BACK TO THE FIELD';
      continueButton.disabled = typing;
    }
    if (mode === 'pages') continueButton.disabled = typing;
  }

  function showPage() {
    const page = pages[pageIndex] ?? '';
    showSubtitle(page, page, cinematicActive);
    updateFooter();
  }

  function open(zone, label, titleText, text, buttonMode = 'finish', cinematic = false) {
    const destination = zone.destination ?? STORIES[zone.id];
    if (!destination) throw new RangeError(`No story is defined for zone: ${zone.id}`);
    window.clearInterval(typingTimer);
    typingTimer = 0;
    typing = false;
    stopVoice();
    conversationZone = zone;
    pages = [];
    pageIndex = 0;
    mode = buttonMode;
    onFinish = null;
    choices.replaceChildren();
    art.dataset.zone = zone.destination?.zoneId ?? zone.id;
    art.dataset.landmark = zone.landmark.type;
    eyebrow.textContent = label;
    title.textContent = titleText;
    speaker.textContent = destination.contact ?? destination.voice;
    line.textContent = text;
    line.dataset.fullText = text;
    continueButton.disabled = false;
    cinematicActive = cinematic;
    overlay.classList.toggle('cinematic', cinematic);
    if (cinematic) onCinematic?.(true, zone);
    updateFooter();
    overlay.classList.remove('hidden');
  }

  function close() {
    window.clearInterval(typingTimer);
    typingTimer = 0;
    typing = false;
    stopVoice();
    overlay.classList.add('hidden');
    overlay.classList.remove('cinematic');
    if (cinematicActive) onCinematic?.(false, conversationZone);
    cinematicActive = false;
    onFinish = null;
    onClose?.();
  }

  function addChoice(option) {
    const button = document.createElement('button');
    button.className = 'story-choice';
    button.type = 'button';
    button.textContent = option.label;
    button.addEventListener('click', () => {
      const mission = conversationZone.destination.mission;
      const text = `${option.reply}\n\n${mission.request}\n\nOBJECTIVE · ${conversationZone.destination.objective}`;
      showSubtitle(text, option.reply);
      choices.replaceChildren();
      mode = 'start';
      updateFooter();
      if (!typing) continueButton.focus();
    });
    choices.appendChild(button);
  }

  line.addEventListener('click', finishTyping);
  voiceButton.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    voiceButton.textContent = `VOICE: ${voiceEnabled ? 'ON' : 'OFF'}`;
    if (!voiceEnabled) stopVoice();
    else if (latestSpeech) speak(latestSpeech);
  });

  continueButton.addEventListener('click', () => {
    if (typing) return;
    if (mode === 'pages') {
      if (pageIndex < pages.length - 1) {
        pageIndex++;
        showPage();
        return;
      }
      onFinish?.();
      close();
      return;
    }
    if (mode === 'choices') return;
    if (mode === 'start') onFinish?.();
    close();
  });

  return {
    showArrival(zone) {
      const story = zone.destination ?? STORIES[zone.id];
      open(zone, 'FIELD DISPATCH · ARRIVAL', zone.landmark.label, story.arrival);
      mode = 'pages';
      pages = [story.arrival, story.greeting];
      pageIndex = 0;
      pageFinalText = 'ENTER LOCATION';
      showPage();
      continueButton.focus();
    },
    showInterview(zone, { active, completed, returning = false, onAccept }) {
      const story = zone.destination ?? STORIES[zone.id];
      if (completed) {
        open(
          zone,
          'MISSION COMPLETE · FIELD REWARD',
          story.mission.item,
          `${story.mission.returned}\n\nMISSION CLEARED · +${story.mission.reward} FIELD TOKENS`,
          'finish',
          true
        );
        showSubtitle(`${story.mission.returned}\n\nMISSION CLEARED · +${story.mission.reward} FIELD TOKENS`);
        return;
      }
      if (active) {
        const statusText = returning
          ? `“You found it! Bring the ${story.mission.item} back to me and I’ll take it from here.”`
          : `“You have the lead. ${story.objective}”\n\nSearch the marked landmark and press E to pick up the item.`;
        open(
          zone,
          returning ? 'FIELD INTERVIEW · ITEM RECOVERED' : 'FIELD INTERVIEW · ACTIVE MISSION',
          returning ? `BRING BACK THE ${story.mission.item}` : 'THE SEARCH IS ON',
          statusText,
          'search',
          true
        );
        showSubtitle(statusText);
        return;
      }
      open(zone, 'FIELD INTERVIEW · YOUR RESPONSE', 'WHAT WILL YOU ASK?', story.greeting, 'choices', true);
      onFinish = onAccept;
      showSubtitle(story.greeting);
      story.choices.forEach(addChoice);
      updateFooter();
      choices.querySelector('button')?.focus();
    },
    showFound(zone) {
      const story = zone.destination ?? STORIES[zone.id];
      open(
        zone,
        'LOOT FOUND · RETURN TO CONTACT',
        story.mission.item,
        '',
        'pages',
        true
      );
      pages = [
        `You recovered the ${story.mission.item} at the ${story.mission.landmark}.\n\nBring it back to ${story.contact.split(' · ')[0]} to complete the mission and claim ${story.mission.reward} field tokens.`,
      ];
      pageIndex = 0;
      pageFinalText = 'RETURN TO CONTACT';
      showPage();
    },
    showTurnIn(zone, onComplete) {
      const story = zone.destination ?? STORIES[zone.id];
      open(
        zone,
        'MISSION TURN-IN · REWARD',
        `${story.mission.item} DELIVERED`,
        '',
        'pages',
        true
      );
      pages = [
        story.mission.returned,
        `${story.clue[0]}\n\n${story.clue[1]}`,
        `${story.clue[2]}\n\nMISSION COMPLETE · +${story.mission.reward} FIELD TOKENS`,
      ];
      pageIndex = 0;
      pageFinalText = 'CLAIM REWARD';
      onFinish = onComplete;
      showPage();
    },
    close,
    isOpen() {
      return !overlay.classList.contains('hidden');
    },
  };
}
