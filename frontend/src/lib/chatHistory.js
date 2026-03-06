const STORAGE_KEY = 'roots_chat_history';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function save(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function listChats() {
  const store = load();
  return Object.values(store).sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}

export function getChat(id) {
  return load()[id] ?? null;
}

export function saveChat(chat) {
  const store = load();
  store[chat.id] = chat;
  save(store);
}

export function updateChat(id, updates) {
  const store = load();
  if (store[id]) {
    store[id] = { ...store[id], ...updates };
    save(store);
  }
}

export function deleteChat(id) {
  const store = load();
  delete store[id];
  save(store);
}
