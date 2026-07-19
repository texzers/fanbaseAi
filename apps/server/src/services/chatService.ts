/**
 * Chat Service — manages fan concierge and ops assistant conversations.
 *
 * Maintains conversation history (limited to last N turns for token efficiency)
 * and orchestrates calls to the GenAI client.
 *
 * Conversation history is kept in-memory per session for this demo.
 * In production, store in DB with user session association.
 */

import { ChatMessage, ChatResponse, FanChatRequest, OpsChatRequest } from '@fanpulse/shared-types';
import {
  callClaude,
  buildFanConciergePrompt,
  buildOpsChatPrompt,
} from '../ai/claudeClient.js';
import { getCrowdContextForAI } from '../simulator/crowdSimulator.js';

/** Maximum conversation history turns to include in prompts (token efficiency). */
const MAX_HISTORY_TURNS = 10;

/** Generates a unique message ID. */
function makeMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Processes a fan concierge chat message.
 *
 * @param request - Fan chat request with message, language, and optional history
 * @returns Chat response with AI-generated message
 */
export async function processFanChatMessage(
  request: FanChatRequest
): Promise<ChatResponse> {
  const { message, language = 'en', conversationHistory = [], accessibilityMode = false } =
    request;

  // Limit history to prevent token bloat
  const limitedHistory = conversationHistory.slice(-MAX_HISTORY_TURNS);

  const promptOptions = buildFanConciergePrompt(message, language, accessibilityMode);

  const responseText = await callClaude({
    ...promptOptions,
    history: limitedHistory,
  });

  const responseMessage: ChatMessage = {
    id: makeMessageId(),
    role: 'assistant',
    content: responseText,
    timestamp: new Date().toISOString(),
    language,
  };

  return {
    message: responseMessage,
    suggestedActions: generateFanSuggestions(message),
  };
}

/**
 * Processes an ops assistant chat message.
 *
 * The crowd data from the simulator is injected as ground truth context,
 * ensuring the AI cannot hallucinate crowd statistics.
 *
 * @param request - Ops chat request with question and optional history
 * @returns Chat response grounded in current crowd data
 */
export async function processOpsChatMessage(
  request: OpsChatRequest
): Promise<ChatResponse> {
  const { message, conversationHistory = [] } = request;

  // Get current crowd data to ground the AI's response
  const crowdContext = getCrowdContextForAI();

  const limitedHistory = conversationHistory.slice(-MAX_HISTORY_TURNS);

  const promptOptions = buildOpsChatPrompt(message, crowdContext);

  const responseText = await callClaude({
    ...promptOptions,
    history: limitedHistory,
  });

  const responseMessage: ChatMessage = {
    id: makeMessageId(),
    role: 'assistant',
    content: responseText,
    timestamp: new Date().toISOString(),
  };

  return {
    message: responseMessage,
  };
}

/**
 * Generates contextual quick-reply suggestions for the fan based on their last message.
 * These are simple heuristic suggestions, not AI-generated, to keep latency low.
 */
function generateFanSuggestions(lastMessage: string): string[] {
  const msg = lastMessage.toLowerCase();

  if (msg.includes('seat') || msg.includes('section')) {
    return ['How do I reach my gate?', 'Where are the restrooms nearby?', 'What food is available?'];
  }
  if (msg.includes('food') || msg.includes('drink') || msg.includes('eat')) {
    return ['Show me the nearest food court', 'Are there vegetarian options?', 'How do I get to my seat?'];
  }
  if (msg.includes('transport') || msg.includes('metro') || msg.includes('bus')) {
    return ['What are the exit routes?', 'When does the last metro run?', 'Show carbon-saving options'];
  }
  if (msg.includes('access') || msg.includes('wheelchair') || msg.includes('disability')) {
    return ['Show step-free routes', 'Where are accessible restrooms?', 'Accessible seating availability'];
  }

  return ['How do I reach my seat?', 'Find nearest restroom', 'Transport options'];
}
