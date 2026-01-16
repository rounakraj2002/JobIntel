import { Request, Response } from "express";
import { PageView } from "../models/PageView";
import { Visitor } from "../models/Visitor";

// Get visitor analytics
export async function getVisitorAnalytics(req: Request, res: Response) {
  try {
    const timeRange = req.query.timeRange as string || "24h";
    
    // Calculate date range
    let startDate = new Date();
    switch (timeRange) {
      case "1h":
        startDate.setHours(startDate.getHours() - 1);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "24h":
      default:
        startDate.setHours(startDate.getHours() - 24);
        break;
    }

    // Get metrics
    const totalVisitors = await Visitor.countDocuments({
      firstVisit: { $gte: startDate },
    });

    const activeVisitors = await Visitor.countDocuments({
      lastVisit: { $gte: startDate },
    });

    const totalPageViews = await PageView.countDocuments({
      timestamp: { $gte: startDate },
    });

    const totalClicks = await Visitor.aggregate([
      { $match: { firstVisit: { $gte: startDate } } },
      { $group: { _id: null, totalClicks: { $sum: "$clickCount" } } },
    ]);

    const clickCount = totalClicks[0]?.totalClicks || 0;

    // Top pages
    const topPages = await PageView.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: { _id: "$page", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { page: "$_id", count: 1, _id: 0 } },
    ]);

    // Hourly data for chart - aggregate visitors, pageviews, and clicks
    const hourlyData = await PageView.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" },
          },
          pageViews: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { hour: "$_id", pageViews: 1, _id: 0 } },
    ]);

    // Get visitor and click counts per hour
    const visitorHourlyData = await Visitor.aggregate([
      { $match: { lastVisit: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d %H:00", date: "$lastVisit" },
          },
          visitors: { $sum: 1 },
          clicks: { $sum: "$clickCount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Merge hourly data from visitors into pageviews
    const visitorMap = new Map(visitorHourlyData.map((v: any) => [v._id, { visitors: v.visitors, clicks: v.clicks }]));
    const mergedHourlyData = hourlyData.map((h: any) => ({
      hour: h.hour,
      pageViews: h.pageViews,
      visitors: visitorMap.get(h.hour)?.visitors || 0,
      clicks: visitorMap.get(h.hour)?.clicks || 0,
    }));

    // Recent visitors
    const recentVisitors = await Visitor.find({ lastVisit: { $gte: startDate } })
      .sort({ lastVisit: -1 })
      .limit(20)
      .select("sessionId userId ipAddress pageCount clickCount lastVisit pages")
      .lean();

    return res.json({
      summary: {
        totalVisitors,
        activeVisitors,
        totalPageViews,
        totalClicks: clickCount,
        avgPagesPerVisitor: totalVisitors > 0 ? (totalPageViews / totalVisitors).toFixed(2) : 0,
        avgClicksPerVisitor: totalVisitors > 0 ? (clickCount / totalVisitors).toFixed(2) : 0,
      },
      topPages,
      hourlyData: mergedHourlyData,
      recentVisitors,
      timeRange,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch analytics", details: err });
  }
}

// Get real-time visitor count
export async function getRealtimeVisitors(req: Request, res: Response) {
  try {
    // Active visitors in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const activeCount = await Visitor.countDocuments({
      lastVisit: { $gte: fiveMinutesAgo },
    });

    // Visitors right now (last minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const nowCount = await Visitor.countDocuments({
      lastVisit: { $gte: oneMinuteAgo },
    });

    // Total all-time visitors
    const totalAllTime = await Visitor.countDocuments();

    // Visitors today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await Visitor.countDocuments({
      firstVisit: { $gte: todayStart },
    });

    return res.json({
      now: nowCount,
      last5Minutes: activeCount,
      today: todayCount,
      allTime: totalAllTime,
      timestamp: new Date(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch realtime visitors", details: err });
  }
}

// Get page-specific analytics
export async function getPageAnalytics(req: Request, res: Response) {
  try {
    const page = req.query.page as string || "/";
    const timeRange = req.query.timeRange as string || "24h";

    let startDate = new Date();
    switch (timeRange) {
      case "1h":
        startDate.setHours(startDate.getHours() - 1);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "24h":
      default:
        startDate.setHours(startDate.getHours() - 24);
        break;
    }

    const viewCount = await PageView.countDocuments({
      page,
      timestamp: { $gte: startDate },
    });

    const uniqueVisitors = await PageView.countDocuments({
      page,
      timestamp: { $gte: startDate },
    }).distinct("sessionId");

    const referrers = await PageView.aggregate([
      { $match: { page, timestamp: { $gte: startDate }, referrer: { $exists: true } } },
      { $group: { _id: "$referrer", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { referrer: "$_id", count: 1, _id: 0 } },
    ]);

    return res.json({
      page,
      viewCount,
      uniqueVisitors: uniqueVisitors.length,
      referrers,
      timeRange,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch page analytics", details: err });
  }
}

// Track custom event/click
export async function trackEvent(req: Request, res: Response) {
  try {
    const { sessionId, page, eventType, eventData } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    // Update visitor click count
    const visitor = await Visitor.findOneAndUpdate(
      { sessionId },
      { $inc: { clickCount: 1 } },
      { new: true }
    );

    return res.json({ success: true, visitor });
  } catch (err) {
    return res.status(500).json({ error: "Failed to track event", details: err });
  }
}
