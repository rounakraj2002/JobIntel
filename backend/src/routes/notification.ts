import { Router } from "express";
import { sendNotification } from "../controllers/notificationController";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || undefined;

const router = Router();

router.post("/send", sendNotification);

// Server-Sent Events stream for realtime notifications
router.get('/stream', async (req, res) => {
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.flushHeaders && res.flushHeaders();

	const channels = ['realtime:notifications', 'realtime:applications', 'realtime:users'];

	if (!REDIS_URL) {
		// Redis not configured: keep the SSE connection alive with pings
		const iv = setInterval(() => {
			try { res.write(': ping\n\n'); } catch (e) { /* ignore */ }
		}, 15000);

		req.on('close', () => { clearInterval(iv); });

		return;
	}

	let sub: IORedis | null = null;
	try {
		sub = new IORedis(REDIS_URL);
		sub.on('error', (e) => console.warn('redis sub error', e?.message || e));

		const onMessage = (_chan: string, message: string) => {
			try {
				res.write(`data: ${message}\n\n`);
			} catch (err) {
				// ignore
			}
		};

		await sub.subscribe(...channels);
		sub.on('message', onMessage);

		req.on('close', () => {
			sub && sub.removeListener('message', onMessage);
			// unsubscribe from all subscribed channels then disconnect
			sub && sub.unsubscribe(...channels).finally(() => sub && sub.disconnect());
		});
	} catch (e) {
		console.warn('Failed to setup Redis subscriber for SSE:', e?.message || e);
		// Fall back to periodic pings to keep connection alive
		const iv = setInterval(() => { try { res.write(': ping\n\n'); } catch (err) { /* ignore */ } }, 15000);
		req.on('close', () => { clearInterval(iv); });
	}
});

export default router;
