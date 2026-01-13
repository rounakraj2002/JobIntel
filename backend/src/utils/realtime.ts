import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || undefined;
let pubClient: IORedis | null = null;

function getPubClient() {
  if (!REDIS_URL) return null;
  if (!pubClient) {
    pubClient = new IORedis(REDIS_URL);
    pubClient.on('error', (e: any) => console.warn('redis pub error', e?.message || e));
  }
  return pubClient;
}

export function publishRealtime(channel: string, payload: any) {
  try {
    const client = getPubClient();
    if (!client) return; // Redis not configured — noop
    client.publish(channel, JSON.stringify(payload)).catch((err) => {
      console.warn('publishRealtime failed', err?.message || err);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('publishRealtime failed', err?.message || err);
  }
}

export default publishRealtime;
