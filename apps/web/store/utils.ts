export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function demoAddress() {
  const hex = Array.from({ length: 40 }, () =>
    "0123456789abcdef".charAt(Math.floor(Math.random() * 16)),
  ).join("");
  return `0x${hex}`;
}

export function randomTx() {
  return "0x" + Math.random().toString(16).slice(2).padEnd(64, "0").slice(0, 64);
}
