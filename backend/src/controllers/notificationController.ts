import { Request, Response } from "express";
import { enqueueNotification } from "../queues/notificationQueue";
import { Application } from "../models/Application";
import { User } from "../models/User";
import { sendEmail, verifySMTP } from "../notifications/emailAdapter";
import mongoose from "mongoose";

export async function sendNotification(req: Request, res: Response) {
  try {
    const payload = req.body || {};

    // If jobId(s) specified, expand recipients to applicants of those job(s)
    const jobIds: string[] = [];
    if (payload.jobId) jobIds.push(payload.jobId);
    if (Array.isArray(payload.jobIds)) jobIds.push(...payload.jobIds);

    if (jobIds.length > 0) {
      // find applications for these jobs and collect distinct userIds
      const objectIds = jobIds.map((j) => new mongoose.Types.ObjectId(j));
      const apps = await Application.find({ jobId: { $in: objectIds } }).select('userId jobId').lean();
      const userIdSet = new Set<string>();
      for (const a of apps) {
        if (a.userId) userIdSet.add(a.userId.toString());
      }

      if (userIdSet.size === 0) {
        return res.status(200).json({ ok: true, queued: false, recipients: 0, message: 'No applicants found for provided job(s)' });
      }

      // enqueue for each recipient
      let enqueuedCount = 0;
      for (const uid of userIdSet) {
        // copy payload but set toUserId
        const individual = { ...payload, toUserId: uid, jobIds, jobId: jobIds.length === 1 ? jobIds[0] : undefined };
        await enqueueNotification(individual);
        enqueuedCount++;
      }

      return res.json({ ok: true, queued: true, recipients: enqueuedCount });
    }

    // If targetAudience specified (all/free/premium/ultra), expand to matching users
    if (payload.targetAudience) {
      const ta = payload.targetAudience;
      const q: any = {};
      if (ta !== 'all') q.tier = ta;
      // only select _id to avoid pulling entire docs
      const users = await User.find(q).select('_id').lean();
      if (!users || users.length === 0) {
        return res.status(200).json({ ok: true, queued: false, recipients: 0, message: 'No users found for provided audience' });
      }
      let enqueuedCount = 0;
      const unique = new Set<string>(users.map((u) => (u as any)._id.toString()));
      for (const uid of unique) {
        const individual = { ...payload, toUserId: uid };
        await enqueueNotification(individual);
        enqueuedCount++;
      }
      return res.json({ ok: true, queued: true, recipients: enqueuedCount });
    }

    // fallback: enqueue single notification as provided (e.g., toUserId)
    const result = await enqueueNotification(payload);
    return res.json({ ok: true, enqueued: result.queued });
  } catch (err) {
    return res.status(500).json({ error: "failed to enqueue notification", details: String(err) });
  }
}

// Preview recipients and samples without enqueuing
export async function previewNotification(req: Request, res: Response) {
  try {
    const payload = req.body || {};
    const result: any = { recipients: 0, sample: [] };

    // job-based
    const jobIds: string[] = [];
    if (payload.jobId) jobIds.push(payload.jobId);
    if (Array.isArray(payload.jobIds)) jobIds.push(...payload.jobIds);

    if (jobIds.length > 0) {
      const objectIds = jobIds.map((j) => new mongoose.Types.ObjectId(j));
      const apps = await Application.find({ jobId: { $in: objectIds } }).select('userId jobId').lean();
      const userIds = Array.from(new Set(apps.map((a) => a.userId && (a.userId as any).toString()).filter(Boolean)));
      result.recipients = userIds.length;
      // sample up to 5 users
      const sampleUsers = await mongoose.model('User').find({ _id: { $in: userIds.slice(0, 5) } }).select('email name').lean();
      result.sample = sampleUsers;
      return res.json(result);
    }

    // audience-based
    if (payload.targetAudience) {
      const ta = payload.targetAudience;
      const q: any = {};
      if (ta !== 'all') q.tier = ta;
      const users = await mongoose.model('User').find(q).select('_id email name').lean();
      result.recipients = users.length;
      result.sample = users.slice(0, 5);
      return res.json(result);
    }

    // fallback: specific toUserId
    if (payload.toUserId) {
      const u = await mongoose.model('User').findById(payload.toUserId).select('email name').lean();
      if (u) { result.recipients = 1; result.sample = [u]; }
      return res.json(result);
    }

    // unknown/broadcast fallback: return 0 with message
    return res.json({ recipients: 0, sample: [] });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}

// Admin test endpoint to send a single SMTP email
export async function testEmail(req: Request, res: Response) {
  try {
    const { to, subject, message } = req.body || {};
    if (!to || !subject) return res.status(400).json({ error: 'to and subject are required' });

    await sendEmail(to, subject, message || 'Test message from JobIntel');
    return res.json({ ok: true, message: 'Test email sent' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}

// Admin endpoint to verify SMTP connection/auth without sending
export async function verifySmtp(req: Request, res: Response) {
  try {
    const ok = await verifySMTP();
    return res.json({ ok: true, verified: !!ok });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}