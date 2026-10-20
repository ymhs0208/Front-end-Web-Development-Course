const paths = {
  award:
    '<circle cx="12" cy="9" r="6"/><path d="m8 14-2 8 6-3 6 3-2-8m-6-6 2-3 2 3-1 3h-2l-1-3Z"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  review: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/><path d="M12 7v5l3 2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3v2m-1 3h.01"/>',
  line: '<path d="M21 11a8 8 0 0 1-8 8H8l-5 3v-7a8 8 0 1 1 18-4Z"/><path d="M7 9h10M7 13h7"/>',
  phone:
    '<path d="m6 3 4 5-3 3c2 4 3 5 7 7l3-3 5 4c-1 6-6 5-11 2C5 17 1 11 2 6z"/>',
  shop: '<path d="M4 7h16l-1 14H5L4 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
};
export function tileIcon(name) {
  return `<span class="ios-tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.grid}</svg></span>`;
}
export function tile({ title, description, icon, color, href, start }) {
  const content = `${tileIcon(icon)}<strong>${title}</strong><span class="ios-tile-description">${description}</span>`;
  const classes = `ios-tile tile-${color}`;
  return href
    ? `<a class="${classes}" href="${href}">${content}</a>`
    : `<button class="${classes}" data-start="${start}">${content}</button>`;
}
