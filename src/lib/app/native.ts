/**
 * Talking to the phone from homehire.us inside the HomeHire app (mobile/). The app loads the live website,
 * so Capacitor's JavaScript library isn't bundled here; instead we call the native bridge the app injects
 * (window.Capacitor.nativePromise / nativeCallback). Every helper is a no-op in a normal browser.
 */
type Bridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  PluginHeaders?: { name: string }[];
  nativePromise?: (plugin: string, method: string, options?: object) => Promise<unknown>;
  nativeCallback?: (plugin: string, method: string, options: object, cb: (data: unknown, error?: unknown) => void) => string;
};

function bridge(): Bridge | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: Bridge }).Capacitor;
  return cap?.isNativePlatform?.() && cap.nativePromise ? cap : null;
}

export function nativePlatform(): "ios" | "android" | null {
  const p = bridge()?.getPlatform?.();
  return p === "ios" || p === "android" ? p : null;
}

/** True when the app was built with this native plugin. */
export function hasNativePlugin(name: string): boolean {
  return Boolean(bridge()?.PluginHeaders?.some((h) => h.name === name));
}

export async function callNative<T = unknown>(plugin: string, method: string, options: object = {}): Promise<T> {
  const cap = bridge();
  if (!cap?.nativePromise) throw new Error("Not running in the HomeHire app.");
  return (await cap.nativePromise(plugin, method, options)) as T;
}

/** Listen for a plugin event (e.g. App "resume"). */
export function onNative<T = unknown>(plugin: string, event: string, cb: (data: T) => void): void {
  bridge()?.nativeCallback?.(plugin, "addListener", { eventName: event }, (data) => cb(data as T));
}
