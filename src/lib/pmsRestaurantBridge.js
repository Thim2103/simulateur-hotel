const PMS_EVENT_NAME = "hotel:pms-event";
let events = [];

function readEvents() {
  return events;
}

export function publishPmsEvent(type, payload = {}) {
  if (typeof window === "undefined") return null;

  const event = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    occurredAt: new Date().toISOString(),
  };
  events = [...readEvents(), event].slice(-100);
  window.dispatchEvent(new CustomEvent(PMS_EVENT_NAME, { detail: event }));
  return event;
}

export function getPmsEvents() {
  return readEvents();
}

export function subscribeToPmsEvents(listener) {
  if (typeof window === "undefined") return () => undefined;

  const handleEvent = (event) => listener(event.detail);
  window.addEventListener(PMS_EVENT_NAME, handleEvent);
  return () => {
    window.removeEventListener(PMS_EVENT_NAME, handleEvent);
  };
}
