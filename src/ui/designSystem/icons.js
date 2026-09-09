// A small, stylised icon pack -- emoji-based (zero extra bytes, zero
// external font/SVG sprite to load, renders identically everywhere) but
// centralised here so every page/hub picks its icon from one place instead
// of hardcoding emoji ad hoc. See GameIcon.jsx for the component that
// renders one of these consistently (fixed size, aria-hidden).
export const icons = {
  hotel: "🏨",
  clients: "👥",
  staff: "👔",
  business: "💰",
  marketing: "📣",
  services: "🍽️",
  esg: "🌱",
  development: "🏗️",
  career: "🎮",
  sandbox: "🏗",
  challenges: "⚡",
  scenarios: "🧪",
  academy: "🎓",
  tfe: "📚",
  competition: "🏆",
  pro: "📈",
  briefing: "☀️",
  review: "🌙",
  decisions: "🧭",
  attention: "⚠️",
  warning: "⚠️",
  alert: "🔔",
  opportunity: "✨",
  weather: "☁️",
  market: "📊",
  occupancy: "🛏️",
  cash: "💵",
  reputation: "⭐",
  reception: "🛎️",
  restaurant: "🍽️",
  housekeeping: "🧹",
  backOffice: "🗂️",
  guest: "🧳",
  incident: "❗",
};

export function getIcon(name) {
  return icons[name] || "•";
}

export default icons;
