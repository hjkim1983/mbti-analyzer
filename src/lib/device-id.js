const STORAGE_KEY = "mbti_device_id";

async function generateFingerprint() {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset().toString(),
  ].join("|");

  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export async function getDeviceId() {
  if (typeof window === "undefined") return "server";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  const uuid = crypto.randomUUID();
  const fingerprint = await generateFingerprint();
  const deviceId = `${uuid}-${fingerprint}`;

  localStorage.setItem(STORAGE_KEY, deviceId);
  return deviceId;
}
