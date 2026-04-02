/**
 * Smart Matching Engine — Pure Scoring Utilities (Module 4)
 *
 * All functions are pure (no side effects, no imports from stores).
 * The same inputs always produce the same output.
 *
 * Future: replace scoreMatch() with an AI API call that returns
 * the same MatchResult shape — zero UI changes required.
 */

import type {
  Boat, ServiceProvider, BoatNeed, MatchResult, MatchFactorScores,
  MatchScoreBand, ProviderJobOpportunity, VesselHealthScore,
} from '../types';
import type { ProviderAvailability } from '../types';

// ─── Weights (must sum to 1.0) ────────────────────────────────────────────────

export const MATCH_WEIGHTS = {
  category:     0.30,
  proximity:    0.20,
  trust:        0.20,
  urgency:      0.15,
  boatType:     0.10,
  availability: 0.05,
} as const;

// ─── Band thresholds ──────────────────────────────────────────────────────────

export const BAND_THRESHOLDS = {
  best:  90,
  great: 75,
  good:  60,
  fair:  45,
} as const;

export const MIN_DISPLAY_SCORE = BAND_THRESHOLDS.fair;

// ─── Category affinity map ────────────────────────────────────────────────────
// Maps BoatNeed.serviceCategory → keywords that match in provider.categories[]

const CATEGORY_PROVIDER_KEYWORDS: Record<string, string[]> = {
  'Engine & Mechanical':     ['Engine', 'Mechanical', 'Diesel', 'Generator', 'Yanmar', 'Volvo', 'Inboard', 'Outboard'],
  'Electrical Systems':      ['Electrical', 'Electric', 'Battery', 'Solar', 'NMEA', 'Electronics'],
  'Hull & Exterior':         ['Hull', 'Fiberglass', 'Structural', 'Fairing', 'Osmosis', 'Diving', 'Hull Cleaning', 'Antifouling', 'Bottom'],
  'Rigging & Sails':         ['Rigging', 'Sails', 'Mast', 'Boom', 'Furling', 'Standing', 'Running'],
  'Electronics & Navigation':['Electronics', 'Navigation', 'Autopilot', 'Radar', 'AIS', 'GPS', 'NMEA', 'Chartplotter'],
  'Plumbing & Systems':      ['Plumbing', 'Systems', 'Mechanical', 'Thru-hull', 'Seacock'],
  'Safety & Surveys':        ['Survey', 'Safety', 'Inspection', 'Pre-Purchase', 'Insurance', 'NAMS', 'SAMS'],
  'Interior & Upholstery':   ['Detailing', 'Cleaning', 'Teak', 'Varnish', 'Interior', 'Polish', 'Upholstery'],
  'Seasonal Services':       ['Detailing', 'Cleaning', 'Seasonal', 'Commissioning', 'Winterisation', 'Winterization'],
  'Painting & Varnishing':   ['Paint', 'Antifouling', 'Varnish', 'Fairing', 'Fiberglass', 'Bottom'],
};

// ─── Component category → SERVICE_CATEGORIES ─────────────────────────────────

const COMPONENT_TO_SERVICE_CATEGORY: Record<string, string> = {
  'Engine':           'Engine & Mechanical',
  'Generator':        'Engine & Mechanical',
  'Stabilizers':      'Engine & Mechanical',
  'Stabilizer':       'Engine & Mechanical',
  'Diesel':           'Engine & Mechanical',
  'Hull':             'Hull & Exterior',
  'Hull & Bottom':    'Hull & Exterior',
  'Hull & Keel':      'Hull & Exterior',
  'Keel':             'Hull & Exterior',
  'Bottom':           'Hull & Exterior',
  'Electrical':       'Electrical Systems',
  'Electrical Systems': 'Electrical Systems',
  'Battery':          'Electrical Systems',
  'Solar':            'Electrical Systems',
  'Navigation':       'Electronics & Navigation',
  'Electronics':      'Electronics & Navigation',
  'Radar':            'Electronics & Navigation',
  'Chartplotter':     'Electronics & Navigation',
  'Autopilot':        'Electronics & Navigation',
  'Safety':           'Safety & Surveys',
  'Safety Equipment': 'Safety & Surveys',
  'Survey':           'Safety & Surveys',
  'Rigging':          'Rigging & Sails',
  'Sails':            'Rigging & Sails',
  'Sails & Running Rigging': 'Rigging & Sails',
  'Standing Rigging': 'Rigging & Sails',
  'Mast':             'Rigging & Sails',
  'Plumbing':         'Plumbing & Systems',
  'Interior':         'Interior & Upholstery',
  'Teak':             'Interior & Upholstery',
  'Paint':            'Painting & Varnishing',
};

function componentToServiceCategory(category: string): string {
  if (COMPONENT_TO_SERVICE_CATEGORY[category]) {
    return COMPONENT_TO_SERVICE_CATEGORY[category];
  }
  // Partial match
  for (const [key, val] of Object.entries(COMPONENT_TO_SERVICE_CATEGORY)) {
    if (category.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(category.toLowerCase())) {
      return val;
    }
  }
  return 'Engine & Mechanical'; // fallback
}

// ─── Boat type specialisation keywords ───────────────────────────────────────

const BOAT_TYPE_KEYWORDS: Record<string, string[]> = {
  sailing_yacht:   ['selden', 'harken', 'sail', 'rigging', 'furling', 'abyc', 'standing'],
  motor_yacht:     ['yanmar', 'diesel', 'volvo', 'twin', 'generator', 'abyc', 'inboard'],
  catamaran_sail:  ['catamaran', 'multi', 'offshore', 'selden', 'harken', 'sail'],
  catamaran_power: ['catamaran', 'twin', 'diesel', 'multi'],
  center_console:  ['outboard', 'yamaha', 'mercury', 'suzuki'],
  express_cruiser: ['volvo', 'mercruiser', 'diesel', 'inboard'],
  trawler:         ['diesel', 'generator', 'yanmar', 'keel'],
  sportfish:       ['outboard', 'diesel', 'twin'],
  pontoon:         ['outboard', 'pontoon'],
  runabout:        ['outboard', 'inboard'],
  other:           [],
};

// ─── Response time → notice hours ────────────────────────────────────────────

function parseResponseHours(responseTime: string | undefined): number {
  if (!responseTime) return 24;
  const rt = responseTime.toLowerCase();
  if (rt.includes('< 1 hour') || rt.includes('<1 hour')) return 1;
  if (rt.includes('< 2 hour') || rt.includes('<2 hour')) return 2;
  if (rt.includes('< 4 hour') || rt.includes('<4 hour')) return 4;
  if (rt.includes('< 12 hour'))                           return 8;
  if (rt.includes('< 24 hour') || rt.includes('same day')) return 12;
  if (rt.includes('1-2 day') || rt.includes('1–2 day'))  return 36;
  if (rt.includes('2-3 day') || rt.includes('2–3 day'))  return 60;
  return 24;
}

// ─── Derive BoatNeed[] from a boat + its VesselHealthScore ───────────────────

export function deriveBoatNeeds(boat: Boat, health: VesselHealthScore): BoatNeed[] {
  const activeComponents = boat.components.filter(c => !c.deletedAt);

  return health.components
    .map(ch => {
      const component = activeComponents.find(c => c.id === ch.componentId);
      if (!component) return null;

      const category = component.category || 'Engine';
      const serviceCategory = componentToServiceCategory(category);

      const urgencyLevel: BoatNeed['urgencyLevel'] =
        ch.status === 'overdue_gt90'  ? 'critical' :
        ch.status === 'overdue_30_90' ? 'high'     :
        ch.status === 'overdue_lt30'  ? 'medium'   :
        ch.status === 'due_soon'      ? 'low'       :
                                        'proactive';

      const needLabel = buildNeedLabel(component.name, ch.status, ch.daysUntilDue);

      return {
        id:              `${boat.id}:${component.id}`,
        boatId:          boat.id,
        boatName:        boat.name,
        componentId:     component.id,
        componentName:   component.name,
        category,
        serviceCategory,
        urgencyLevel,
        componentStatus: ch.status,
        daysUntilDue:    ch.daysUntilDue,
        needLabel,
      } satisfies BoatNeed;
    })
    .filter((n): n is BoatNeed => n !== null)
    .sort((a, b) => urgencyOrder(a.urgencyLevel) - urgencyOrder(b.urgencyLevel));
}

function urgencyOrder(u: BoatNeed['urgencyLevel']): number {
  return { critical: 0, high: 1, medium: 2, low: 3, proactive: 4 }[u];
}

function buildNeedLabel(name: string, status: string, daysUntilDue?: number): string {
  const abs = Math.abs(daysUntilDue ?? 0);
  switch (status) {
    case 'overdue_gt90':  return `${name} — ${abs} days overdue`;
    case 'overdue_30_90': return `${name} — ${abs} days overdue`;
    case 'overdue_lt30':  return `${name} — ${abs} days overdue`;
    case 'due_soon':      return `${name} — due in ${daysUntilDue} days`;
    case 'current':       return `${name} — up to date`;
    default:              return `${name} — no service data`;
  }
}

// ─── Factor: Category Match (0-100) ──────────────────────────────────────────

function scoreCategoryMatch(need: BoatNeed, provider: ServiceProvider): number {
  const keywords = CATEGORY_PROVIDER_KEYWORDS[need.serviceCategory] ?? [];
  const providerCats = provider.categories.map(c => c.toLowerCase());

  const exactMatch = keywords.some(kw =>
    providerCats.some(pc => pc === kw.toLowerCase() || pc.includes(kw.toLowerCase()) || kw.toLowerCase().includes(pc))
  );
  if (exactMatch) return 100;

  // Related: provider has any term from an adjacent category
  const allKeywords = Object.values(CATEGORY_PROVIDER_KEYWORDS).flat().map(k => k.toLowerCase());
  const hasAnyKeyword = providerCats.some(pc => allKeywords.includes(pc));
  if (hasAnyKeyword) return 30;

  return 0;
}

// ─── Factor: Proximity (0-100) ───────────────────────────────────────────────

function scoreProximity(provider: ServiceProvider): number {
  const dist = provider.distance ?? 10;
  if (dist <= 3)  return 100;
  if (dist <= 7)  return 85;
  if (dist <= 15) return 65;
  if (dist <= 25) return 40;
  if (dist <= 40) return 20;
  return 5;
}

// ─── Factor: Trust (0-100) ───────────────────────────────────────────────────

function scoreTrust(provider: ServiceProvider, trustOverride?: number): number {
  if (trustOverride !== undefined) return trustOverride;
  // Derive from rating + verified status
  const base = (provider.rating / 5) * 80;
  const verifiedBonus = provider.verified ? 15 : 0;
  const jobsBonus = Math.min(provider.completedJobs / 200, 5);
  return Math.min(100, Math.round(base + verifiedBonus + jobsBonus));
}

// ─── Factor: Urgency Alignment (0-100) ───────────────────────────────────────

function scoreUrgencyAlignment(
  need: BoatNeed,
  provider: ServiceProvider,
  availability: ProviderAvailability[],
): number {
  const noticeHours = (() => {
    const avail = availability.find(a => a.providerId === provider.id);
    if (avail?.minNoticeHours !== undefined) return avail.minNoticeHours;
    return parseResponseHours(provider.responseTime);
  })();

  switch (need.urgencyLevel) {
    case 'critical': {
      if (noticeHours <= 2)  return 100;
      if (noticeHours <= 4)  return 90;
      if (noticeHours <= 12) return 75;
      if (noticeHours <= 24) return 55;
      if (noticeHours <= 48) return 35;
      return 20;
    }
    case 'high': {
      if (noticeHours <= 4)  return 100;
      if (noticeHours <= 12) return 90;
      if (noticeHours <= 24) return 80;
      if (noticeHours <= 48) return 60;
      return 40;
    }
    case 'medium': return 90;
    case 'low':    return 100;
    case 'proactive': return 100;
    default:       return 70;
  }
}

// ─── Factor: Boat Type Specialisation (0-100) ────────────────────────────────

function scoreBoatTypeSpecialisation(boat: Boat, provider: ServiceProvider): number {
  const boatType = boat.boatType ?? 'other';
  const keywords = (BOAT_TYPE_KEYWORDS[boatType] ?? []).map(k => k.toLowerCase());
  if (keywords.length === 0) return 50;

  const certStr = (provider.certifications ?? []).join(' ').toLowerCase();
  const catStr  = (provider.categories ?? []).join(' ').toLowerCase();
  const descStr = (provider.description ?? '').toLowerCase();
  const combined = `${certStr} ${catStr} ${descStr}`;

  const exactHits = keywords.filter(kw => combined.includes(kw)).length;
  if (exactHits >= 2) return 100;
  if (exactHits === 1) return 65;
  return 35;
}

// ─── Factor: Availability (0-100) ────────────────────────────────────────────

function scoreAvailability(provider: ServiceProvider, availability: ProviderAvailability[]): number {
  const avail = availability.filter(a => a.providerId === provider.id && a.isActive);
  if (avail.length > 0) return 100;
  // Assume most providers have some availability if not explicitly listed
  return 65;
}

// ─── Match Reason Generation ──────────────────────────────────────────────────

function generateMatchReasons(
  factors: MatchFactorScores,
  provider: ServiceProvider,
  need: BoatNeed,
): string[] {
  const reasons: Array<{ score: number; reason: string }> = [];

  if (factors.category >= 100) {
    const certStr = (provider.certifications ?? []).join(', ');
    if (certStr && certStr.length < 40) {
      reasons.push({ score: factors.category + 2, reason: certStr.split(',')[0].trim() });
    } else {
      reasons.push({ score: factors.category, reason: `${need.serviceCategory} specialist` });
    }
  } else if (factors.category >= 60) {
    reasons.push({ score: factors.category, reason: 'Related service expertise' });
  }

  if (factors.proximity >= 85) {
    reasons.push({ score: factors.proximity, reason: `${provider.distance} mi away` });
  } else if (factors.proximity >= 65) {
    reasons.push({ score: factors.proximity, reason: `${provider.distance} mi away` });
  }

  if (factors.trust >= 85) {
    reasons.push({
      score: factors.trust,
      reason: `${provider.rating}★ · ${provider.completedJobs.toLocaleString()} jobs`,
    });
  } else if (factors.trust >= 70) {
    reasons.push({ score: factors.trust, reason: `${provider.rating}★ rating` });
  }

  if (factors.urgency >= 90 && need.urgencyLevel === 'critical') {
    reasons.push({ score: factors.urgency, reason: `Available for urgent jobs` });
  }

  if (factors.boatType >= 65) {
    reasons.push({ score: factors.boatType, reason: `Boat type specialist` });
  }

  if (provider.verified) {
    reasons.push({ score: 60, reason: 'Verified provider' });
  }

  const top = reasons
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(r => r.reason);

  return top.length > 0 ? top : [`${need.serviceCategory} specialist`];
}

// ─── Core: scoreMatch ─────────────────────────────────────────────────────────

export function scoreMatch(
  need: BoatNeed,
  provider: ServiceProvider,
  boat: Boat,
  availability: ProviderAvailability[],
  trustOverride?: number,
): MatchResult {
  const factors: MatchFactorScores = {
    category:     scoreCategoryMatch(need, provider),
    proximity:    scoreProximity(provider),
    trust:        scoreTrust(provider, trustOverride),
    urgency:      scoreUrgencyAlignment(need, provider, availability),
    boatType:     scoreBoatTypeSpecialisation(boat, provider),
    availability: scoreAvailability(provider, availability),
  };

  const matchScore = Math.round(
    factors.category     * MATCH_WEIGHTS.category     +
    factors.proximity    * MATCH_WEIGHTS.proximity     +
    factors.trust        * MATCH_WEIGHTS.trust         +
    factors.urgency      * MATCH_WEIGHTS.urgency       +
    factors.boatType     * MATCH_WEIGHTS.boatType      +
    factors.availability * MATCH_WEIGHTS.availability
  );

  const band = getMatchBand(matchScore);
  const matchReasons = generateMatchReasons(factors, provider, need);

  return {
    providerId:   provider.id,
    boatId:       boat.id,
    needId:       need.id,
    needLabel:    need.needLabel,
    matchScore,
    band,
    factorScores: factors,
    matchReasons,
    matchSummary: matchReasons.slice(0, 2).join(' · '),
    computedAt:   new Date().toISOString(),
  };
}

// ─── Rank providers for a single need ────────────────────────────────────────

export function rankProvidersForNeed(
  need: BoatNeed,
  boat: Boat,
  providers: ServiceProvider[],
  availability: ProviderAvailability[],
  trustMap: Record<string, number> = {},
  limit = 5,
  minScore = MIN_DISPLAY_SCORE,
): MatchResult[] {
  return providers
    .map(p => scoreMatch(need, p, boat, availability, trustMap[p.id]))
    .filter(r => r.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

// ─── Compute all matches for all owner boats ──────────────────────────────────

export function computeOwnerMatches(
  boats: Boat[],
  healthScores: Record<string, VesselHealthScore>,
  providers: ServiceProvider[],
  availability: ProviderAvailability[],
  trustMap: Record<string, number> = {},
): { needs: BoatNeed[]; results: MatchResult[] } {
  const allNeeds: BoatNeed[] = [];
  const allResults: MatchResult[] = [];

  for (const boat of boats) {
    const health = healthScores[boat.id];
    if (!health) continue;
    const needs = deriveBoatNeeds(boat, health);
    allNeeds.push(...needs);

    for (const need of needs) {
      const results = rankProvidersForNeed(need, boat, providers, availability, trustMap);
      allResults.push(...results);
    }
  }

  return { needs: allNeeds, results: allResults };
}

// ─── Score a provider against a job opportunity (provider-side) ───────────────

export function scoreProviderForOpportunity(
  provider: ServiceProvider,
  opportunity: ProviderJobOpportunity,
  availability: ProviderAvailability[],
  trustOverride?: number,
): MatchResult {
  // Construct a synthetic BoatNeed and Boat for scoring
  const syntheticNeed: BoatNeed = {
    id:              `${opportunity.boatId}:${opportunity.id}`,
    boatId:          opportunity.boatId,
    boatName:        opportunity.boatName,
    componentName:   opportunity.componentName,
    category:        opportunity.componentName,
    serviceCategory: opportunity.serviceCategory,
    urgencyLevel:    opportunity.urgencyLevel,
    componentStatus: urgencyToStatus(opportunity.urgencyLevel),
    needLabel:       opportunity.needLabel,
  };

  const syntheticBoat = {
    id:        opportunity.boatId,
    boatType:  opportunity.boatType,
    homePort:  opportunity.homePort,
    components: [],
  } as unknown as Boat;

  return scoreMatch(syntheticNeed, provider, syntheticBoat, availability, trustOverride);
}

function urgencyToStatus(u: BoatNeed['urgencyLevel']): BoatNeed['componentStatus'] {
  return {
    critical:  'overdue_gt90',
    high:      'overdue_30_90',
    medium:    'overdue_lt30',
    low:       'due_soon',
    proactive: 'current',
  }[u] as BoatNeed['componentStatus'];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getMatchBand(score: number): MatchScoreBand {
  if (score >= BAND_THRESHOLDS.best)  return 'best';
  if (score >= BAND_THRESHOLDS.great) return 'great';
  if (score >= BAND_THRESHOLDS.good)  return 'good';
  return 'fair';
}

export function urgencyLabel(level: BoatNeed['urgencyLevel']): string {
  return { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', proactive: 'Proactive' }[level];
}

export function urgencyColor(level: BoatNeed['urgencyLevel']): string {
  return {
    critical:  'text-red-700 bg-red-50 border-red-200',
    high:      'text-amber-700 bg-amber-50 border-amber-200',
    medium:    'text-orange-700 bg-orange-50 border-orange-200',
    low:       'text-ocean-700 bg-ocean-50 border-ocean-200',
    proactive: 'text-gray-600 bg-gray-50 border-gray-200',
  }[level];
}

export function urgencyBarColor(level: BoatNeed['urgencyLevel']): string {
  return { critical: '#EF4444', high: '#F59E0B', medium: '#F97316', low: '#1A6B9A', proactive: '#9CA3AF' }[level];
}
