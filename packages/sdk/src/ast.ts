import { FlagConfig, UserContext, EvaluationResult, Variation, Predicate } from '@/types/flag';
import { getBucket } from './murmur3';

function semverCompare(v1: string, v2: string): number {
  const p1 = v1.replace(/^[vV]/, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = v2.replace(/^[vV]/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a !== b) return a > b ? 1 : -1;
  }
  return 0;
}

export function evaluatePredicate(predicate: Predicate, context: UserContext): boolean {
  let contextValue: unknown = undefined;

  const attr = predicate.attribute.toLowerCase();
  if (attr === 'userid' || attr === 'user_id' || attr === 'id') {
    contextValue = context.userId;
  } else if (attr === 'email') {
    contextValue = context.email;
  } else if (attr === 'plan') {
    contextValue = context.plan;
  } else if (attr === 'country') {
    contextValue = context.country;
  } else if (attr === 'appversion' || attr === 'app_version') {
    contextValue = context.appVersion;
  } else if (attr === 'ip') {
    contextValue = context.ip;
  } else if (context.attributes && predicate.attribute in context.attributes) {
    contextValue = context.attributes[predicate.attribute];
  }

  if (contextValue === undefined || contextValue === null) {
    return false;
  }

  const strValue = String(contextValue);
  const numValue = Number(contextValue);

  switch (predicate.operator) {
    case 'EQUALS':
      return predicate.values.some(v => strValue.toLowerCase() === v.toLowerCase());

    case 'NOT_EQUALS':
      return predicate.values.every(v => strValue.toLowerCase() !== v.toLowerCase());

    case 'CONTAINS':
      return predicate.values.some(v => strValue.toLowerCase().includes(v.toLowerCase()));

    case 'NOT_CONTAINS':
      return predicate.values.every(v => !strValue.toLowerCase().includes(v.toLowerCase()));

    case 'STARTS_WITH':
      return predicate.values.some(v => strValue.toLowerCase().startsWith(v.toLowerCase()));

    case 'ENDS_WITH':
      return predicate.values.some(v => strValue.toLowerCase().endsWith(v.toLowerCase()));

    case 'IN':
      return predicate.values.some(v => strValue.toLowerCase() === v.toLowerCase());

    case 'NOT_IN':
      return predicate.values.every(v => strValue.toLowerCase() !== v.toLowerCase());

    case 'GREATER_THAN': {
      const target = Number(predicate.values[0]);
      return !isNaN(numValue) && !isNaN(target) && numValue > target;
    }

    case 'LESS_THAN': {
      const target = Number(predicate.values[0]);
      return !isNaN(numValue) && !isNaN(target) && numValue < target;
    }

    case 'SEMVER_GTE': {
      const target = predicate.values[0];
      return semverCompare(strValue, target) >= 0;
    }

    default:
      return false;
  }
}

function getVariation(flag: FlagConfig, variationId: string): Variation {
  const found = flag.variations.find(v => v.id === variationId);
  if (found) return found;
  return flag.variations.find(v => v.id === flag.defaultVariationId) || flag.variations[0];
}

export function evaluateFlag(flag: FlagConfig, context: UserContext): EvaluationResult {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  try {
    if (flag.isKillSwitched) {
      const defaultVar = getVariation(flag, flag.defaultVariationId);
      const duration = (typeof performance !== 'undefined' ? (performance.now() - startTime) : 0.005) * 1000;
      return {
        variationId: defaultVar.id,
        value: defaultVar.value,
        reason: 'KILL_SWITCH',
        durationMicroseconds: Math.max(1, Math.round(duration)),
        cached: true,
      };
    }

    if (flag.targetLists && flag.targetLists.length > 0) {
      for (const target of flag.targetLists) {
        if (target.entities.includes(context.userId) || (context.email && target.entities.includes(context.email))) {
          const v = getVariation(flag, target.variationId);
          const duration = (typeof performance !== 'undefined' ? (performance.now() - startTime) : 0.008) * 1000;
          return {
            variationId: v.id,
            value: v.value,
            reason: 'TARGET_LIST',
            durationMicroseconds: Math.max(1, Math.round(duration)),
            cached: true,
          };
        }
      }
    }

    if (flag.rules && flag.rules.length > 0) {
      for (const rule of flag.rules) {
        let isMatch = false;

        if (rule.predicates.length === 0) {
          isMatch = true;
        } else if (rule.combinator === 'AND') {
          isMatch = rule.predicates.every(p => evaluatePredicate(p, context));
        } else {
          isMatch = rule.predicates.some(p => evaluatePredicate(p, context));
        }

        if (isMatch) {
          if (rule.rolloutPercentage !== undefined && rule.rolloutPercentage < 100) {
            const { bucket } = getBucket(context.userId, flag.key, `${flag.salt}:${rule.id}`);
            if (bucket < rule.rolloutPercentage) {
              const v = getVariation(flag, rule.serveVariationId);
              const duration = (typeof performance !== 'undefined' ? (performance.now() - startTime) : 0.009) * 1000;
              return {
                variationId: v.id,
                value: v.value,
                reason: 'RULE_MATCH',
                matchedRuleId: rule.id,
                bucket,
                durationMicroseconds: Math.max(1, Math.round(duration)),
                cached: true,
              };
            }
            continue;
          }

          const v = getVariation(flag, rule.serveVariationId);
          const duration = (typeof performance !== 'undefined' ? (performance.now() - startTime) : 0.007) * 1000;
          return {
            variationId: v.id,
            value: v.value,
            reason: 'RULE_MATCH',
            matchedRuleId: rule.id,
            durationMicroseconds: Math.max(1, Math.round(duration)),
            cached: true,
          };
        }
      }
    }

    if (flag.rollout && flag.rollout.length > 0) {
      const { bucket } = getBucket(context.userId, flag.key, flag.salt);
      let cumulative = 0;

      for (const dist of flag.rollout) {
        cumulative += dist.percentage;
        if (bucket < cumulative) {
          const v = getVariation(flag, dist.variationId);
          const duration = (typeof performance !== 'undefined' ? (performance.now() - startTime) : 0.008) * 1000;
          return {
            variationId: v.id,
            value: v.value,
            reason: 'PERCENTAGE_ROLLOUT',
            bucket,
            durationMicroseconds: Math.max(1, Math.round(duration)),
            cached: true,
          };
        }
      }
    }

    const defaultVar = getVariation(flag, flag.defaultVariationId);
    const duration = (typeof performance !== 'undefined' ? (performance.now() - startTime) : 0.006) * 1000;
    return {
      variationId: defaultVar.id,
      value: defaultVar.value,
      reason: 'FALLTHROUGH',
      durationMicroseconds: Math.max(1, Math.round(duration)),
      cached: true,
    };
  } catch (err) {
    console.error(`Evaluation failed for flag ${flag.key}:`, err);
    const defaultVar = getVariation(flag, flag.defaultVariationId);
    return {
      variationId: defaultVar.id,
      value: defaultVar.value,
      reason: 'POISON_PILL_FALLBACK',
      durationMicroseconds: 1,
      cached: false,
    };
  }
}
