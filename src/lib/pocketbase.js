import PocketBase from 'pocketbase';

// Use Vite's environment variable, falling back to localhost
const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'https://expert-angelfish.pikapod.net';

export const pb = new PocketBase(pbUrl);
