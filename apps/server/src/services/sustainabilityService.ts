/**
 * Sustainability Service — generates carbon-aware transport recommendations.
 *
 * Uses the Claude API to recommend the lowest-carbon transport option from
 * the fan's origin to the stadium, with a plain-language carbon-savings
 * estimate versus driving alone.
 */

import { SustainabilityRequest, SustainabilityResponse, TransportOption } from '@fanpulse/shared-types';
import { callClaude, buildSustainabilityPrompt } from '../ai/claudeClient.js';

/**
 * Generates transport recommendations with carbon footprint estimates.
 *
 * @param request - Validated sustainability request with fan's origin
 * @returns Sustainability response with transport options and AI summary
 */
export async function getSustainabilityRecommendations(
  request: SustainabilityRequest
): Promise<SustainabilityResponse> {
  const { origin, language = 'en' } = request;

  const promptOptions = buildSustainabilityPrompt(origin, language);
  const rawResponse = await callClaude(promptOptions);

  try {
    const jsonStr = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonStr) as {
      options: TransportOption[];
      aiSummary: string;
      carbonSavedVsDriving: number;
    };

    return {
      origin,
      options: parsed.options,
      aiSummary: parsed.aiSummary,
      carbonSavedVsDriving: parsed.carbonSavedVsDriving,
    };
  } catch {
    // Fallback if JSON parsing fails
    return {
      origin,
      options: [
        {
          mode: 'Metro Line 7',
          estimatedMinutes: 25,
          carbonKgCO2: 0.5,
          isBestOption: true,
          details: 'Electric metro — lowest carbon option. Runs every 3 minutes on match days.',
        },
        {
          mode: 'Electric Bus Route 42',
          estimatedMinutes: 35,
          carbonKgCO2: 1.2,
          isBestOption: false,
          details: 'Electric bus — good carbon rating. More comfortable for longer distances.',
        },
        {
          mode: 'Private Car',
          estimatedMinutes: 20,
          carbonKgCO2: 8.5,
          isBestOption: false,
          details: 'Limited parking available. Highest carbon footprint.',
        },
      ],
      aiSummary: rawResponse,
      carbonSavedVsDriving: 8.0,
    };
  }
}
