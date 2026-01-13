import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { getCache, setCache } from './aiCache';

dotenv.config();

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

async function callOpenAISystemPrompt(system: string, userPrompt: string) {
  const payload = {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 800,
    temperature: 0.0,
  };

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const j = (await res.json()) as any;
  const text = j?.choices?.[0]?.message?.content;
  return text || '';
}

function simpleHeuristicParse(htmlOrText: string) {
  // Improved heuristic parser with JSON-LD and microdata helpers
  const out: any = { title: null, company: null, location: null, salary: null, description: null };
  const html = htmlOrText || '';

  // Helper: try extract JSON-LD JobPosting
  const extractJsonLd = (h: string) => {
    try {
      const matches = Array.from(h.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
      for (const m of matches) {
        try {
          const j = JSON.parse(m[1]);
          // handle array or single object
          const items = Array.isArray(j) ? j : [j];
          for (const it of items) {
            if (it['@type'] === 'JobPosting' || (Array.isArray(it['@type']) && it['@type'].includes('JobPosting'))) {
              return it;
            }
            // sometimes nested
            for (const k of Object.keys(it)) {
              const v = it[k];
              if (v && typeof v === 'object' && (v['@type'] === 'JobPosting' || (Array.isArray(v['@type']) && v['@type'].includes('JobPosting')))) return v;
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  const jsonld = extractJsonLd(html);
  if (jsonld) {
    out.title = jsonld.title || jsonld.name || out.title;
    out.company = (jsonld.hiringOrganization && (jsonld.hiringOrganization.name || jsonld.hiringOrganization['@name'])) || jsonld.employer || out.company;
    out.location = (jsonld.jobLocation && (jsonld.jobLocation.address || jsonld.jobLocation.address?.addressLocality)) || jsonld.jobLocation || out.location;
    out.salary = jsonld.baseSalary || jsonld.salary || out.salary;
    out.description = jsonld.description || out.description;
    out.confidence = 0.95;
    return out;
  }

  // Microdata simple extraction: look for itemscope itemtype JobPosting
  const microMatch = html.match(/<[^>]*itemscope[^>]*itemtype=["']([^"']*JobPosting[^"']*)["'][\s\S]*?>[\s\S]*?<\/[^>]+>/i);
  if (microMatch) {
    // attempt title via itemprop
    const titleM = html.match(/itemprop=["']title["'][^>]*>([^<]+)/i) || html.match(/<h1[^>]*>([^<]+)/i);
    if (titleM) out.title = (titleM[1] || '').trim();
    const companyM = html.match(/itemprop=["']hiringOrganization["'][^>]*>([\s\S]*?)<\/[^>]+>/i) || html.match(/itemprop=["']hiringOrganization["'][^>]*itemprop=["']name["'][^>]*>([^<]+)/i);
    if (companyM) out.company = (companyM[1] || '').trim();
    const locM = html.match(/itemprop=["']jobLocation["'][^>]*>([\s\S]*?)<\/[^>]+>/i) || html.match(/itemprop=["']addressLocality["'][^>]*>([^<]+)/i);
    if (locM) out.location = (locM[1] || '').trim();
    out.description = (html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 400);
    out.confidence = 0.8;
    return out;
  }

  // Fallback plain-text heuristics
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = text.split(/\.|\n/).map((l) => l.trim()).filter(Boolean);

  // title: prefer H1 or <title>
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  out.title = (h1 && h1[1].trim()) || (titleTag && titleTag[1].trim()) || (lines[0] ? lines[0].slice(0, 200) : null);

  // company heuristics: look for "at <Company>", "Join <Company>", "Apply at <Company>"
  const companyPatterns = [/\bat\s+([A-Z][A-Za-z0-9 &\-\.]{2,80})\b/i, /Join\s+([A-Z][A-Za-z0-9 &\-\.]{2,80})/i, /Apply\s+at\s+([A-Z][A-Za-z0-9 &\-\.]{2,80})/i, /Company:\s*([A-Z][A-Za-z0-9 &\-\.]{2,80})/i, /Employer:\s*([A-Z][A-Za-z0-9 &\-\.]{2,80})/i];
  for (const p of companyPatterns) {
    const m = text.match(p);
    if (m) {
      out.company = (m[1] || '').trim();
      break;
    }
  }

  // location heuristics
  if (/Remote|Work from home|Work from anywhere|WFH/i.test(text)) out.location = 'Remote';
  else {
    const locM = text.match(/in\s+([A-Z][a-zA-Z\s]{2,50})(,?\s*[A-Z]{2,3})?/);
    if (locM) out.location = (locM[1] || '').trim();
  }

  // salary
  const salaryM = text.match(/(₹|Rs\.?|\$|£)\s?([0-9,\.]{2,15})/);
  if (salaryM) out.salary = salaryM[0];

  out.description = lines.slice(0, 6).join('\n');
  out.confidence = 0.5;
  return out;
}

export async function parseJob(raw: { html?: string; text?: string }, useCache = true) {
  const key = `parse:${(raw.html || raw.text || '').slice(0, 1000)}`;
  if (useCache) {
    const c = getCache(key);
    if (c) return c;
  }

  const content = raw.html || raw.text || '';
  if (!OPENAI_KEY) {
    const res = simpleHeuristicParse(content);
    setCache(key, res, 60 * 5);
    return res;
  }

  try {
    const system = 'You are a job parsing assistant. Extract title, company, location, salary, and a short description in JSON.';
    const prompt = `Parse the following job page and return JSON with keys: title, company, location, salary, description.\n\nContent:\n${content.slice(0, 2000)}`;
    const text = await callOpenAISystemPrompt(system, prompt);
    const parsed = JSON.parse(text);
    setCache(key, parsed, 60 * 60);
    return parsed;
  } catch (e) {
    const fallback = simpleHeuristicParse(content);
    setCache(key, fallback, 60 * 5);
    return fallback;
  }
}

export async function matchCandidate(jobFields: any, candidateProfile: any) {
  const key = `match:${JSON.stringify(jobFields).slice(0, 500)}:${JSON.stringify(candidateProfile).slice(0,500)}`;
  const cached = getCache(key);
  if (cached) return cached;
  if (!OPENAI_KEY) {
    // simple overlap scoring
    const jdesc = (jobFields.description || '').toLowerCase();
    const skills = (candidateProfile.skills || []).map((s: string) => s.toLowerCase());
    let score = 0;
    for (const sk of skills) if (jdesc.includes(sk)) score += 1;
    const confidence = Math.min(1, score / (skills.length || 1));
    const out = { matchScore: confidence, reasons: ['keyword-overlap'], confidence };
    setCache(key, out, 60 * 10);
    return out;
  }

  try {
    const system = 'You are a job matching assistant. Given job fields and a candidate profile, return a JSON {matchScore, confidence, reasons[]}.';
    const prompt = `Job: ${JSON.stringify(jobFields).slice(0,1000)}\n\nCandidate: ${JSON.stringify(candidateProfile).slice(0,1000)}`;
    const text = await callOpenAISystemPrompt(system, prompt);
    const parsed = JSON.parse(text);
    setCache(key, parsed, 60 * 60);
    return parsed;
  } catch (e) {
    const fallback = { matchScore: 0, confidence: 0.2, reasons: [] };
    setCache(key, fallback, 60 * 5);
    return fallback;
  }
}

export async function generateCoverLetter(jobFields: any, candidateProfile: any) {
  const key = `cover:${JSON.stringify(jobFields).slice(0,500)}:${JSON.stringify(candidateProfile).slice(0,500)}`;
  const cached = getCache(key);
  if (cached) return cached;
  if (!OPENAI_KEY) {
    const letter = `Dear Hiring Team,\n\nI am writing to express my interest in the ${jobFields.title || 'role'} at ${jobFields.company || ''}. I have experience in ${(candidateProfile.skills || []).slice(0,5).join(', ')} and believe I can contribute to your team.\n\nSincerely,\n${candidateProfile.name || 'Candidate'}`;
    const out = { letter, confidence: 0.3 };
    setCache(key, out, 60 * 60);
    return out;
  }
  try {
    const system = 'You are a professional resume and cover letter writer. Produce a concise cover letter tailored to the job and candidate.';
    const prompt = `Write a short (3-5 paragraph) cover letter for the job: ${JSON.stringify(jobFields).slice(0,1000)} using candidate: ${JSON.stringify(candidateProfile).slice(0,1000)}`;
    const text = await callOpenAISystemPrompt(system, prompt);
    const out = { letter: text, confidence: 0.9 };
    setCache(key, out, 60 * 60);
    return out;
  } catch (e) {
    const fallback = { letter: `Dear Hiring Team,\n\nI am interested in the role.`, confidence: 0.2 };
    setCache(key, fallback, 60 * 5);
    return fallback;
  }
}

export default { parseJob, matchCandidate, generateCoverLetter };
