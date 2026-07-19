/**
 * Wayfinding Service — generates AI-powered step-by-step stadium directions.
 *
 * Combines the crowd simulator data (server-side trusted data) with the
 * GenAI client to produce crowd-aware, accessible wayfinding directions.
 */

import { WayfindingRequest, WayfindingResponse, CrowdStatus } from '@fanpulse/shared-types';
import { callClaude, buildWayfindingPrompt } from '../ai/claudeClient.js';
import { getCrowdContextForAI, getCrowdState } from '../simulator/crowdSimulator.js';

/**
 * Generates AI-powered wayfinding directions.
 *
 * The crowd data from the simulator is injected into the prompt as server-
 * side trusted context. This prevents the AI from hallucinating crowd levels.
 *
 * @param request - Validated wayfinding request
 * @returns Wayfinding response with AI directions and crowd status
 */
export async function generateWayfinding(
  request: WayfindingRequest
): Promise<WayfindingResponse> {
  const { fromLocation, toLocation, preferStepFree = false, language = 'en' } = request;

  const crowdContext = getCrowdContextForAI();
  const crowdState = getCrowdState();

  const promptOptions = buildWayfindingPrompt(
    fromLocation,
    toLocation,
    crowdContext,
    preferStepFree,
    language
  );

  const directionsText = await callClaude(promptOptions);

  // Determine overall route status from crowd state
  const routeStatus = inferRouteStatus(directionsText, crowdState.overallStatus);

  // Extract alternate route if AI included one (heuristic)
  const hasAlternate = directionsText.toLowerCase().includes('alternate') ||
    directionsText.toLowerCase().includes('alternative');

  return {
    directions: directionsText,
    routeStatus,
    alternateRoute: hasAlternate ? undefined : undefined, // AI includes alt route inline
    estimatedMinutes: estimateWalkingTime(fromLocation, toLocation),
    stepFreeRoute: preferStepFree,
  };
}

/**
 * Infers the route crowd status from the AI response text.
 * Falls back to the overall stadium status.
 */
function inferRouteStatus(directionsText: string, fallback: CrowdStatus): CrowdStatus {
  const lower = directionsText.toLowerCase();
  if (lower.includes('congested') || lower.includes('high crowd') || lower.includes('very busy')) {
    return 'congested';
  }
  if (lower.includes('moderate') || lower.includes('busy') || lower.includes('some crowd')) {
    return 'moderate';
  }
  if (lower.includes('clear') || lower.includes('low crowd') || lower.includes('quiet')) {
    return 'low';
  }
  return fallback;
}

/**
 * Rough heuristic for walking time estimate in minutes.
 * In production this would use real graph distances.
 */
function estimateWalkingTime(_from: string, _to: string): number {
  // Return a reasonable 3–10 minute estimate
  return Math.round(3 + Math.random() * 7);
}
