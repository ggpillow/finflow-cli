export const createId = (prefix: string): string => {
  const uuid = globalThis.crypto.randomUUID();
  return `${prefix}_${uuid.replace(/-/g, '').slice(0, 8)}`;
};