/**
 * Vessel Health Score Calculator
 * Implements TRD Section 4.6 exactly.
 *
 * Rules:
 *  - Service is current (within interval)      → 100
 *  - Service due within 30 days                → 70
 *  - Service overdue by < 30 days              → 40
 *  - Service overdue by 30–90 days             → 20
 *  - Service overdue by > 90 days              → 0
 *  - No service date recorded                  → 50 (neutral)
 *
 * Health Score = average of all component scores
 *
 * Banding:
 *  80–100  → Good        (Green)
 *  50–79   → Fair        (Amber)
 *  0–49    → Needs Attention (Red)
 */

import type { BoatComponent, ComponentHealth, VesselHealthScore, HealthBand } from '../types';

export function scoreComponent(component: BoatComponent, now: Date = new Date()): ComponentHealth {
  const { id, name, lastServicedDate, serviceIntervalDays, lastChecked, nextDue } = component;

  // Determine effective dates — support both new schema and legacy fields
  const effectiveLastServiced = lastServicedDate || lastChecked;
  const effectiveInterval = serviceIntervalDays;

  // If no date recorded at all, return neutral score
  if (!effectiveLastServiced) {
    return {
      componentId: id,
      componentName: name,
      score: 50,
      status: 'no_data',
    };
  }

  const lastDate = new Date(effectiveLastServiced);

  // If legacy nextDue is provided and no interval, derive interval from last + next
  let intervalDays = effectiveInterval;
  if (!intervalDays && nextDue) {
    const nextDate = new Date(nextDue);
    intervalDays = Math.round((nextDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (!intervalDays || intervalDays <= 0) {
    return {
      componentId: id,
      componentName: name,
      score: 50,
      status: 'no_data',
    };
  }

  const dueDate = new Date(lastDate);
  dueDate.setDate(dueDate.getDate() + intervalDays);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilDue = Math.round((dueDate.getTime() - now.getTime()) / msPerDay);

  let score: number;
  let status: ComponentHealth['status'];

  if (daysUntilDue > 30) {
    score = 100;
    status = 'current';
  } else if (daysUntilDue >= 0) {
    score = 70;
    status = 'due_soon';
  } else if (daysUntilDue >= -30) {
    score = 40;
    status = 'overdue_lt30';
  } else if (daysUntilDue >= -90) {
    score = 20;
    status = 'overdue_30_90';
  } else {
    score = 0;
    status = 'overdue_gt90';
  }

  return {
    componentId: id,
    componentName: name,
    score,
    status,
    daysUntilDue,
  };
}

export function getBand(score: number): { band: HealthBand; bandLabel: string; bandColor: string } {
  if (score >= 80) {
    return { band: 'good', bandLabel: 'Good', bandColor: '#0D9B8A' };
  } else if (score >= 50) {
    return { band: 'fair', bandLabel: 'Fair', bandColor: '#C9943A' };
  } else {
    return { band: 'needs_attention', bandLabel: 'Needs Attention', bandColor: '#EF4444' };
  }
}

export function calculateVesselHealth(
  boatId: string,
  components: BoatComponent[],
  now: Date = new Date()
): VesselHealthScore {
  const activeComponents = components.filter(c => !c.deletedAt);

  if (activeComponents.length === 0) {
    return {
      boatId,
      score: 50,
      ...getBand(50),
      components: [],
      calculatedAt: now.toISOString(),
    };
  }

  const componentHealths = activeComponents.map(c => scoreComponent(c, now));
  const totalScore = componentHealths.reduce((sum, ch) => sum + ch.score, 0);
  const avgScore = Math.round(totalScore / componentHealths.length);

  return {
    boatId,
    score: avgScore,
    ...getBand(avgScore),
    components: componentHealths,
    calculatedAt: now.toISOString(),
  };
}

/** Derive a legacy status ('good' | 'attention' | 'critical') from component health */
export function componentStatusFromHealth(health: ComponentHealth): 'good' | 'attention' | 'critical' {
  if (health.score >= 70) return 'good';
  if (health.score >= 20) return 'attention';
  return 'critical';
}

/** Quick convenience: get health score number for a boat given its components */
export function getHealthScore(components: BoatComponent[]): number {
  if (!components || components.length === 0) return 50;
  const healths = components.filter(c => !c.deletedAt).map(c => scoreComponent(c));
  if (healths.length === 0) return 50;
  return Math.round(healths.reduce((s, h) => s + h.score, 0) / healths.length);
}

/** Format days until/since service for display */
export function formatDaysUntilDue(days?: number): string {
  if (days === undefined) return 'No data';
  if (days > 0) return `Due in ${days}d`;
  if (days === 0) return 'Due today';
  return `${Math.abs(days)}d overdue`;
}

/** Get colour class for a component health status */
export function statusColorClass(status: ComponentHealth['status']): string {
  switch (status) {
    case 'current': return 'text-teal-600';
    case 'due_soon': return 'text-amber-500';
    case 'overdue_lt30': return 'text-orange-500';
    case 'overdue_30_90': return 'text-red-500';
    case 'overdue_gt90': return 'text-red-700';
    default: return 'text-gray-400';
  }
}
