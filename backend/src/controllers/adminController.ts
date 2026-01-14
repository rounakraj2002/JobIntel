import { Request, Response } from 'express';
import { Job } from '../models/Job';
import { Source } from '../models/Source';
import { AuditLog } from '../models/AuditLog';
import { scrapeOnce } from '../services/playwrightScraper';
import { Snapshot } from '../models/Snapshot';
import { hashContent } from '../services/deltaDetector';
import { NotificationLog } from '../models/NotificationLog';
import { Revenue } from '../models/Revenue';
import { User } from '../models/User';
import { Application } from '../models/Application';

// Get dashboard statistics
export async function getAdminStats(_req: Request, res: Response) {
  try {
    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ status: 'published' });
    const pendingJobs = await Job.countDocuments({ status: 'pending' });
    
    const totalApplications = await Job.aggregate([
      { $group: { _id: null, total: { $sum: '$applicantsCount' } } }
    ]);
    
    const applicationsToday = await Job.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    const notificationsSent = await NotificationLog.countDocuments();

    // compute delivery stats
    const emailTotal = await NotificationLog.countDocuments({ channel: 'email' });
    const emailSent = await NotificationLog.countDocuments({ channel: 'email', status: 'sent' });
    const emailDelivery = emailTotal ? Number(((emailSent / emailTotal) * 100).toFixed(1)) : 0;

    const whatsappTotal = await NotificationLog.countDocuments({ channel: 'whatsapp' });
    const whatsappSent = await NotificationLog.countDocuments({ channel: 'whatsapp', status: 'sent' });
    const whatsappDelivery = whatsappTotal ? Number(((whatsappSent / whatsappTotal) * 100).toFixed(1)) : 0;

    const scheduledCount = await NotificationLog.countDocuments({ status: 'scheduled' });

    res.json({
      totalJobs,
      activeJobs,
      pendingJobs,
      totalApplications: totalApplications[0]?.total || 0,
      applicationsToday,
      notificationsSent,
      emailDelivery,
      whatsappDelivery,
      scheduledCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

// Get user analytics with stats and recent users
export async function getUserStats(_req: Request, res: Response) {
  try {
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ tier: 'premium' });
    const freeUsers = totalUsers - premiumUsers;
    
    // Applications today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const applicationsToday = await Application.countDocuments({
      createdAt: { $gte: today }
    });

    // Conversion rate (premium users / total users)
    const conversionRate = totalUsers > 0 ? Number(((premiumUsers / totalUsers) * 100).toFixed(1)) : 0;

    // Get recent users (last 20)
    const recentUsers = await User.find()
      .select('email name tier createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Count applications per user
    const userAppCounts = await Application.aggregate([
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const appCountMap = new Map(userAppCounts.map(doc => [doc._id?.toString(), doc.count]));

    // Get last active time for each user
    const userLastActive = await Application.aggregate([
      {
        $group: {
          _id: '$userId',
          lastActive: { $max: '$createdAt' }
        }
      }
    ]);
    
    const lastActiveMap = new Map(userLastActive.map(doc => [doc._id?.toString(), doc.lastActive]));

    // Format recent users with application counts and last active
    const enrichedRecentUsers = recentUsers.map(user => ({
      id: user._id?.toString(),
      name: user.name || 'Unknown',
      email: user.email,
      tier: user.tier || 'free',
      joinedAt: new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      applications: appCountMap.get(user._id?.toString()) || 0,
      lastActive: formatLastActive(lastActiveMap.get(user._id?.toString())),
    }));

    // Get user growth over last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const freeCount = await User.countDocuments({
        tier: { $ne: 'premium' },
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      const premiumCount = await User.countDocuments({
        tier: 'premium',
        createdAt: { $gte: date, $lt: nextDate }
      });

      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        free: freeCount,
        premium: premiumCount,
      });
    }

    res.json({
      stats: {
        totalUsers,
        premiumUsers,
        freeUsers,
        applicationsToday,
        conversionRate,
      },
      recentUsers: enrichedRecentUsers,
      growthData: last7Days,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('User stats error:', err);
    res.status(500).json({ error: String(err) });
  }
}

// Helper function to format last active time
function formatLastActive(date: Date | undefined): string {
  if (!date) return 'Never';
  
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get job analytics data
export async function getJobAnalytics(_req: Request, res: Response) {
  try {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const posted = await Job.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });

      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        posted,
      });
    }

    res.json(last7Days);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

// Get user analytics
export async function getUserAnalytics(_req: Request, res: Response) {
  try {
    // Get last 6 months of data
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);

      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const jobsCount = await Job.countDocuments({
        createdAt: { $gte: date, $lt: nextMonth }
      });

      months.push({
        date: date.toLocaleDateString('en-US', { month: 'short' }),
        jobs: jobsCount,
      });
    }

    res.json(months);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

// Get revenue analytics
export async function getRevenueAnalytics(_req: Request, res: Response) {
  try {
    // Get revenue data from the last 6 months
    const months = [];
    let totalRevenue = 0;

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);

      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Get revenue from Revenue model
      const revenueData = await Revenue.aggregate([
        {
          $match: {
            createdAt: { $gte: date, $lt: nextMonth },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      const monthRevenue = revenueData[0]?.total || 0;
      const monthCount = revenueData[0]?.count || 0;
      totalRevenue += monthRevenue;

      months.push({
        date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
        transactionCount: monthCount,
      });
    }

    res.json({
      monthlyData: months,
      totalRevenue,
      averageMonthlyRevenue: totalRevenue / 6,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Revenue analytics error:', err);
    res.status(500).json({ error: String(err) });
  }
}

// Get notifications
export async function getNotifications(_req: Request, res: Response) {
  try {
    const notifications = await NotificationLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export async function listPendingJobs(_req: Request, res: Response) {
  const jobs = await Job.find({ status: 'pending' }).lean();
  res.json(jobs);
}

export async function approveJob(req: Request, res: Response) {
  const { id } = req.params;
  const job = await Job.findByIdAndUpdate(id, { status: 'published' }, { new: true }).lean();
  if (!job) return res.status(404).json({ message: 'Not found' });
  await AuditLog.create({ actor: req.user?.email || 'system', action: 'approve_job', meta: { jobId: id } });
  res.json(job);
}

export async function revenueReport(_req: Request, res: Response) {
  // Simple demo metrics
  const totalJobs = await Job.countDocuments();
  const published = await Job.countDocuments({ status: 'published' });
  const draft = await Job.countDocuments({ status: 'draft' });
  // No billing model yet — return zeros
  res.json({ totalJobs, published, draft, totalRevenue: 0 });
}

export async function auditLogs(_req: Request, res: Response) {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json(logs);
}

export async function gdprDeleteUser(req: Request, res: Response) {
  const { id } = req.params;
  // minimal deletion: remove user and related personal data (jobs/applications/referrals)
  const mongoose = require('mongoose');
  const User = mongoose.model('User');
  const Application = mongoose.model('Application');
  const Referral = mongoose.model('Referral');
  await User.findByIdAndDelete(id);
  await Application.deleteMany({ userId: id });
  await Referral.deleteMany({ userId: id });
  await AuditLog.create({ actor: req.user?.email || 'system', action: 'gdpr_delete', meta: { userId: id } });
  res.json({ ok: true });
}

export async function runCrawlers(req: Request, res: Response) {
  const sources = await Source.find({ enabled: true }).lean();
  const results: any[] = [];
  for (const s of sources) {
    try {
      const r: any = await scrapeOnce({ id: s._id?.toString(), url: s.url, selector: s.selector });
      // handle feed items if present
      if (r && Array.isArray(r.items)) {
        for (const item of r.items) {
          const url = item.url || item.link;
          const html = item.rawHtml || '';
          const h = hashContent(html);
          const existing = await Snapshot.findOne({ url }).lean();
          if (!existing || existing.hash !== h) {
            // post to ingest endpoint by creating Job directly for admin-run
            const job = await Job.create({ title: item.title || 'Ingested', rawHtml: html, meta: { sourceId: s._id, sourceUrl: url } });
            await Snapshot.findOneAndUpdate({ url }, { hash: h, lastSeen: new Date(), sourceId: s._id }, { upsert: true });
            results.push({ url, created: job._id });
          }
        }
      }
    } catch (e) {
      results.push({ source: s.url, error: String(e?.message || e) });
    }
  }
  await AuditLog.create({ actor: req.user?.email || 'system', action: 'run_crawlers', meta: { count: results.length } });
  res.json(results);
}
