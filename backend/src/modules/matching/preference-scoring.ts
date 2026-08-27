import { TripPreferences } from '../trips/trips.types.js';

export interface PreferenceScoreResult {
  score: number;
  isEligible: boolean; // false if hard gender preference is violated
  reasons: string[];
}

/**
 * Computes preference compatibility score (0.0 - 1.0) and checks hard gender constraints
 */
export function calculatePreferenceScore(
  prefA: TripPreferences,
  prefB: TripPreferences,
  genderA?: string | null,
  genderB?: string | null
): PreferenceScoreResult {
  const reasons: string[] = [];

  // 1. Gender Preference Compatibility
  let genderScore = 1.0;
  let isEligible = true;

  const requiresSameGenderA = prefA.genderPreference === 'same_gender';
  const requiresSameGenderB = prefB.genderPreference === 'same_gender';

  if (requiresSameGenderA || requiresSameGenderB) {
    if (!genderA || !genderB || genderA !== genderB) {
      isEligible = false;
      return { score: 0.0, isEligible: false, reasons: ['Gender preference requirement not met'] };
    } else {
      reasons.push(`Same gender (${genderA}) verified`);
    }
  }

  // 2. Conversation Preference
  let conversationScore = 0.8;
  if (prefA.conversationPreference && prefB.conversationPreference) {
    if (prefA.conversationPreference === prefB.conversationPreference) {
      conversationScore = 1.0;
      reasons.push(`Both prefer ${prefA.conversationPreference} travel environment`);
    } else if (
      (prefA.conversationPreference === 'moderate' || prefB.conversationPreference === 'moderate')
    ) {
      conversationScore = 0.85;
    } else {
      conversationScore = 0.50;
    }
  }

  // 3. Smoking Policy
  let smokingScore = 1.0;
  if (prefA.smokingPreference === 'no' || prefB.smokingPreference === 'no') {
    if (prefA.smokingPreference === 'yes' || prefB.smokingPreference === 'yes') {
      smokingScore = 0.30;
    }
  }

  const score = genderScore * 0.40 + conversationScore * 0.35 + smokingScore * 0.25;

  return {
    score: Math.min(1.0, Math.max(0.0, score)),
    isEligible,
    reasons,
  };
}
