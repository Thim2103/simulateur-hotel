// Generic wrapper to make async loaders resilient: any error is logged and
// swallowed, returning fallbackData instead of throwing/rejecting.
export async function safeLoad(loaderFn, fallbackData, { label } = {}) {
  try {
    return await loaderFn();
  } catch (error) {
    console.error(label ? `[safeLoad] ${label} failed` : "[safeLoad] loader failed", error);
    return fallbackData;
  }
}
