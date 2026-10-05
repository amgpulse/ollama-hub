export function getSetting(key, fallback = '') {
  return localStorage.getItem(key) ?? fallback;
}

export function setSetting(key, value) {
  localStorage.setItem(key, value);
}
