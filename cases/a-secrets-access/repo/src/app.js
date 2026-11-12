// Synthetic fixture. Reads configuration from the environment; contains no secret.
const databaseUrl = process.env.DATABASE_URL;
export function connect() { return { url: databaseUrl ? 'configured' : 'missing' }; }
