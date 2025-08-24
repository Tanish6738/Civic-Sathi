'use strict';

// AI-powered analytics controller
// Computes baseline metrics from reports then (optionally) enhances with Gemini.

const Report = require('../models/Report');
const User = require('../models/User');
const Category = require('../models/Category'); // kept for possible future enrichment
const Department = require('../models/Department'); // kept for future cross joins

let geminiModel = null;
function getGeminiModel() {
  if (geminiModel) return geminiModel;
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null; // fallback: return baseline only
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const client = new GoogleGenerativeAI(apiKey);
    geminiModel = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    return geminiModel;
  } catch (e) {
    console.error('[analytics] Gemini init failed:', e.message);
    return null;
  }
}

function daysAgo(days){ const d = new Date(); d.setDate(d.getDate()-days); return d; }
function avgHours(durations){ if(!durations.length) return 0; return +(durations.reduce((a,b)=>a+b,0)/durations.length/3600000).toFixed(2); }

exports.getAnalytics = async (req, res) => {
  try {
    if (!req.user || !['admin','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success:false, message:'Forbidden' });
    }
    // Params: rangeDays (default 90), granularity (day|week|month), compare=true to include previous period comparison
    const rangeDays = Math.min(Math.max(parseInt(req.query.rangeDays)||90, 7), 365);
    const granularity = ['day','week','month'].includes(req.query.granularity)? req.query.granularity : 'day';
    const includeCompare = String(req.query.compare).toLowerCase()==='true';

    const rangeStart = daysAgo(rangeDays);
    const compareStart = includeCompare? daysAgo(rangeDays*2) : rangeStart; // earlier start to cover prior period

    const reports = await Report.find({ createdAt: { $gte: compareStart }, status: { $ne: 'deleted' } })
      .populate('category','name')
      .populate('reporter','name email role')
      .populate('assignedTo','name email role')
      .lean();

    // Status counts
    const statusCounts = new Map();
    for (const r of reports) statusCounts.set(r.status,(statusCounts.get(r.status)||0)+1);
    const countsByStatus = [...statusCounts.entries()].map(([status,count])=>({ status, count })).sort((a,b)=>b.count-a.count);

    // Categories
    const catCounts = new Map();
    for (const r of reports){ const key = r.category?.name || 'Uncategorized'; catCounts.set(key,(catCounts.get(key)||0)+1); }
    const topCategories = [...catCounts.entries()].map(([category,count])=>({ category, count })).sort((a,b)=>b.count-a.count).slice(0,10);

    // Department load (string field on report)
    const deptCounts = new Map();
    for (const r of reports){ const key = r.department || 'Unassigned'; deptCounts.set(key,(deptCounts.get(key)||0)+1); }
    const departmentLoad = [...deptCounts.entries()].map(([department,count])=>({ department, count })).sort((a,b)=>b.count-a.count);

    // Generic bucketing helpers
    function periodKey(date){
      const d = new Date(date);
      if (granularity==='day') return d.toISOString().slice(0,10); // YYYY-MM-DD
      if (granularity==='week') {
        const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        // ISO week number
        const dayNum = tmp.getUTCDay() || 7; // 1..7
        tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(),0,1));
        const weekNo = Math.ceil((((tmp - yearStart)/86400000) + 1)/7);
        return `${tmp.getUTCFullYear()}-W${weekNo.toString().padStart(2,'0')}`;
      }
      return `${d.getUTCFullYear()}-${(d.getUTCMonth()+1).toString().padStart(2,'0')}`; // month
    }

    // Time series for selected range only
    const timeSeriesMap = new Map();
    const categoryTrendMap = new Map(); // category => Map(period=>count)
    const seriesReports = reports.filter(r=> r.createdAt >= rangeStart);
    for (const r of seriesReports){
      const key = periodKey(r.createdAt);
      if (!timeSeriesMap.has(key)) timeSeriesMap.set(key,{ period:key, newReports:0, closed:0 });
      const bucket = timeSeriesMap.get(key); bucket.newReports++;
      if (['verified','closed'].includes(r.status)) bucket.closed++;
      const catName = r.category?.name || 'Uncategorized';
      if (!categoryTrendMap.has(catName)) categoryTrendMap.set(catName,new Map());
      const ctMap = categoryTrendMap.get(catName);
      ctMap.set(key,(ctMap.get(key)||0)+1);
    }
    const timeSeries = [...timeSeriesMap.values()].sort((a,b)=> a.period.localeCompare(b.period));
    // Pick top 5 categories overall for trends
    const topCategoryNames = [...categoryTrendMap.entries()].map(([name,map])=>({ name, total:[...map.values()].reduce((a,b)=>a+b,0) }))
      .sort((a,b)=> b.total - a.total).slice(0,5).map(c=> c.name);
    const categoryTrends = topCategoryNames.map(name=>({
      category:name,
      series:[...categoryTrendMap.get(name).entries()].map(([period,count])=>({ period, count }))
        .sort((a,b)=> a.period.localeCompare(b.period))
    }));

    // Trend last 30 days (retain legacy field): slice from timeSeries if day granularity; otherwise approximate by last 30 calendar days
    let recentTrends = [];
    if (granularity==='day') {
      const last30 = daysAgo(30).toISOString().slice(0,10);
      recentTrends = timeSeries.filter(p=> p.period >= last30).map(p=> ({ date:p.period, reports:p.newReports }));
    } else {
      // derive synthetic daily aggregated from last 30 days separate from granularity choice
      const trendMap = new Map();
      for (const r of seriesReports.filter(r=> r.createdAt >= daysAgo(30))){
        const day = new Date(r.createdAt).toISOString().slice(0,10);
        trendMap.set(day,(trendMap.get(day)||0)+1);
      }
      recentTrends = [...trendMap.entries()].map(([date,reports])=>({ date, reports })).sort((a,b)=> a.date.localeCompare(b.date));
    }

    // Officer performance
    const officerMap = new Map();
    for (const r of reports){
      const assignees = Array.isArray(r.assignedTo)? r.assignedTo : [];
      for (const o of assignees){
        const id = String(o._id);
        if (!officerMap.has(id)) officerMap.set(id,{ officerId:id, officer:o.name, assigned:0, closed:0, durations:[] });
        const rec = officerMap.get(id); rec.assigned += 1;
        if (['verified','closed'].includes(r.status)) { rec.closed += 1; if(r.createdAt && r.updatedAt) rec.durations.push(new Date(r.updatedAt)-new Date(r.createdAt)); }
      }
    }
    const officerPerformance = [...officerMap.values()].map(o=>({
      officerId:o.officerId,
      officer:o.officer,
      assigned:o.assigned,
      closed:o.closed,
      closeRate: o.assigned? +(o.closed/o.assigned*100).toFixed(1):0,
      avgCloseTimeHours: avgHours(o.durations)
    })).sort((a,b)=> b.closed - a.closed).slice(0,15);

    // Reporter activity
    const reporterMap = new Map();
    for (const r of reports){ const rid = r.reporter?._id; if(!rid) continue; reporterMap.set(String(rid),(reporterMap.get(String(rid))||0)+1); }
    const userActivity = [...reporterMap.entries()].map(([userId,reportsCount])=>({ userId, user: reports.find(r=> String(r.reporter?._id)===userId)?.reporter?.name || 'Unknown', reports: reportsCount })).sort((a,b)=>b.reports-a.reports).slice(0,15);

    // Closure stats & backlog (open not closed/verified)
    const closureDurations = [];
    const openReports = [];
    for (const r of seriesReports){
      if (['verified','closed'].includes(r.status) && r.createdAt && r.updatedAt){
        const dur = new Date(r.updatedAt) - new Date(r.createdAt);
        if (dur>0) closureDurations.push(dur);
      } else if (!['verified','closed','deleted'].includes(r.status)) {
        openReports.push(r);
      }
    }
    closureDurations.sort((a,b)=> a-b);
    function percentile(p){ if(!closureDurations.length) return 0; const idx = Math.min(closureDurations.length-1, Math.floor(p/100*(closureDurations.length-1))); return +(closureDurations[idx]/3600000).toFixed(2); }
    const closureStats = {
      count: closureDurations.length,
      avgHours: avgHours(closureDurations),
      medianHours: percentile(50),
      p90Hours: percentile(90)
    };
    // Aging buckets for open reports
    const now = Date.now();
    const agingBuckets = { '0-2d':0,'3-7d':0,'8-30d':0,'31-90d':0,'90d+':0 };
    for (const r of openReports){
      const ageDays = (now - new Date(r.createdAt))/86400000;
      if (ageDays<=2) agingBuckets['0-2d']++; else if (ageDays<=7) agingBuckets['3-7d']++; else if (ageDays<=30) agingBuckets['8-30d']++; else if (ageDays<=90) agingBuckets['31-90d']++; else agingBuckets['90d+']++;
    }
    const backlogSummary = { open: openReports.length, agingBuckets };

    // Comparison previous period if requested
    let comparison = null;
    if (includeCompare){
      const prevStart = compareStart; // earlier start already includes both periods
      const prevEnd = rangeStart; // exclusive
      const prevReports = reports.filter(r=> r.createdAt < rangeStart);
      comparison = {
        current: { rangeDays, total: seriesReports.length },
        previous: { rangeDays, total: prevReports.length },
        diffTotal: seriesReports.length - prevReports.length,
        diffPct: prevReports.length? +(((seriesReports.length - prevReports.length)/prevReports.length)*100).toFixed(1) : null
      };
    }

    const baseline = {
      generatedAt: new Date().toISOString(),
      totalReports: reports.length,
      countsByStatus,
      topCategories,
      departmentLoad,
      officerPerformance,
      userActivity,
      recentTrends,
      timeSeries,
      categoryTrends,
      closureStats,
      backlogSummary,
      comparison,
      parameters: { rangeDays, granularity, compare: includeCompare },
      sampleReports: reports.slice(0,25).map(r=>({ id:r._id, title:r.title, status:r.status, category:r.category?.name||null, department:r.department||null, reporter:r.reporter?.name||null, createdAt:r.createdAt }))
    };

    const model = getGeminiModel();
    if (!model) {
      return res.json({ success:true, insights: baseline, model:'baseline' });
    }

    const prompt = [
      'You are an analytics assistant for municipal civic issue reports.',
      'Given the baseline JSON metrics below, produce an UPDATED JSON object with the SAME fields plus narrativeInsights (array of 5-10 concise, actionable bullet strings).',
      'Include: performance highlights, backlog risks (use backlogSummary & agingBuckets), closure efficiency (closureStats), notable category trends (categoryTrends), and comparison insights if present.',
      'You may add riskSignals (array of short risk notes) and trendSummary (short string).',
      'Return ONLY valid JSON (no markdown). Keep field names camelCase. Do not remove numeric fields.',
      'Baseline JSON:',
      JSON.stringify(baseline)
    ].join('\n');

    let enhanced = baseline;
    try {
      const result = await model.generateContent(prompt);
      const raw = result?.response?.text?.() || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = raw.trim().replace(/^```json|```$/g,'').replace(/^```|```$/g,'');
      const parsed = JSON.parse(cleaned);
      enhanced = { ...baseline, ...parsed };
      if (!Array.isArray(enhanced.narrativeInsights)) enhanced.narrativeInsights = [];
    } catch (e) {
      console.warn('[analytics] AI enhancement failed; using baseline:', e.message);
    }

    return res.json({ success:true, insights: enhanced, model:'gemini' });
  } catch (err) {
    console.error('[analytics] error:', err);
    return res.status(500).json({ success:false, message:'Internal server error' });
  }
};

// Helper to format weekday short name
function weekdayShort(date){ return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(date).getDay()]; }

// GET /api/admin/call-activity
// Returns last 7 days call activity derived from reports (calls = non-draft, non-deleted reports; resolved = status in verified|closed)
exports.getCallActivity = async (req, res) => {
  try {
    if (!req.user || !['admin','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success:false, message:'Forbidden' });
    }
    const DAYS = 7;
    const now = new Date();
    const since14 = new Date(now); since14.setDate(now.getDate() - 14); // include prev window for diff
    const reports = await Report.find({ createdAt: { $gte: since14 }, status: { $ne: 'deleted' } })
      .select('status createdAt updatedAt')
      .lean();

    // Split into current window (last 7) and previous (7-14)
    const startCurrent = new Date(now); startCurrent.setDate(now.getDate() - (DAYS - 1)); startCurrent.setHours(0,0,0,0);
    const startPrev = new Date(startCurrent); startPrev.setDate(startCurrent.getDate() - DAYS);
    const endPrev = new Date(startCurrent); endPrev.setMilliseconds(endPrev.getMilliseconds()-1);

    function classify(r){ return r.status && r.status !== 'draft'; }
    function resolved(r){ return ['verified','closed'].includes(r.status); }

    // Build day buckets for current window
    const dayMap = new Map();
    for (let i=0;i<DAYS;i++){ const d = new Date(startCurrent); d.setDate(startCurrent.getDate()+i); const key = d.toISOString().slice(0,10); dayMap.set(key,{ date:key, day:weekdayShort(d), calls:0, resolved:0 }); }

    let currentCalls=0, currentResolved=0, prevCalls=0, prevResolved=0;
    for (const r of reports){
      const createdDay = new Date(r.createdAt);
      const key = createdDay.toISOString().slice(0,10);
      if (createdDay >= startCurrent) {
        if (classify(r)) { currentCalls++; const bucket = dayMap.get(key); if (bucket) bucket.calls++; }
        if (resolved(r)) { currentResolved++; const bucket = dayMap.get(key); if (bucket) bucket.resolved++; }
      } else if (createdDay >= startPrev && createdDay <= endPrev) {
        if (classify(r)) prevCalls++;
        if (resolved(r)) prevResolved++;
      }
    }

    const resolutionRate = currentCalls? Math.round(currentResolved/currentCalls*100) : 0;
    const prevRate = prevCalls? Math.round(prevResolved/prevCalls*100) : 0;
    const diffCallsPct = prevCalls? +(((currentCalls-prevCalls)/prevCalls)*100).toFixed(1) : null;
    const diffResolvedPct = prevResolved? +(((currentResolved-prevResolved)/prevResolved)*100).toFixed(1) : null;
    const diffResolutionPts = (resolutionRate - prevRate);

    return res.json({ success:true, data: {
      rangeDays: DAYS,
      daily: [...dayMap.values()],
      totals: {
        totalCalls: currentCalls,
        totalResolved: currentResolved,
        resolutionRate,
        diffCallsPct,
        diffResolvedPct,
        diffResolutionPts
      }
    }});
  } catch (err) {
    console.error('[call-activity] error:', err);
    return res.status(500).json({ success:false, message:'Internal server error' });
  }
};

// GET /api/admin/web-complaints
// Approximates "web complaints" using all reports; open = not resolved (verified/closed), closed = resolved.
exports.getWebComplaints = async (req, res) => {
  try {
    if (!req.user || !['admin','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success:false, message:'Forbidden' });
    }
    const DAYS = 7;
    const now = new Date();
    const since14 = new Date(now); since14.setDate(now.getDate() - 14);
    const reports = await Report.find({ createdAt: { $gte: since14 }, status: { $ne: 'deleted' } })
      .populate('category','name')
      .select('status createdAt category')
      .lean();

    const startCurrent = new Date(now); startCurrent.setDate(now.getDate() - (DAYS - 1)); startCurrent.setHours(0,0,0,0);
    const startPrev = new Date(startCurrent); startPrev.setDate(startCurrent.getDate() - DAYS);
    const endPrev = new Date(startCurrent); endPrev.setMilliseconds(endPrev.getMilliseconds()-1);

    function isClosed(r){ return ['verified','closed'].includes(r.status); }

    const dayMap = new Map();
    for (let i=0;i<DAYS;i++){ const d=new Date(startCurrent); d.setDate(startCurrent.getDate()+i); const key=d.toISOString().slice(0,10); dayMap.set(key,{ date:key, day:weekdayShort(d), total:0, open:0, closed:0 }); }

    let curTotal=0, curClosed=0, prevTotal=0, prevClosed=0;
    const catCounts = new Map();

    for (const r of reports){
      const createdDay = new Date(r.createdAt);
      const key = createdDay.toISOString().slice(0,10);
      const closed = isClosed(r);
      if (createdDay >= startCurrent) {
        curTotal++; if (closed) curClosed++;
        const bucket = dayMap.get(key); if (bucket){ bucket.total++; if (closed) bucket.closed++; else bucket.open++; }
        const catName = r.category?.name || 'Uncategorized';
        catCounts.set(catName,(catCounts.get(catName)||0)+1);
      } else if (createdDay >= startPrev && createdDay <= endPrev) {
        prevTotal++; if (closed) prevClosed++;
      }
    }

    const closeRate = curTotal? Math.round(curClosed/curTotal*100) : 0;
    const prevCloseRate = prevTotal? Math.round(prevClosed/prevTotal*100) : 0;
    const diffTotalPct = prevTotal? +(((curTotal-prevTotal)/prevTotal)*100).toFixed(1) : null;
    const diffClosedPct = prevClosed? +(((curClosed-prevClosed)/prevClosed)*100).toFixed(1) : null;
    const diffCloseRatePts = closeRate - prevCloseRate;

    const categoryBreakdown = [...catCounts.entries()].map(([name,value])=>({ name, value }))
      .sort((a,b)=> b.value - a.value).slice(0,12);

    return res.json({ success:true, data: {
      rangeDays: DAYS,
      daily: [...dayMap.values()],
      totals: { total: curTotal, open: curTotal - curClosed, closed: curClosed, closeRate, diffTotalPct, diffClosedPct, diffCloseRatePts },
      categoryBreakdown
    }});
  } catch (err) {
    console.error('[web-complaints] error:', err);
    return res.status(500).json({ success:false, message:'Internal server error' });
  }
};
