// src/modules/moderation/services/aiModerationService.js

// --- Configuration ---
const PROFANITY_THRESHOLD = 0.8;

// Simple wordlists with weights. In a real app, this would be more extensive.
const HATE_SPEECH_WORDS = {
  word1: 0.9, // Example hate speech words
  word2: 1.0
};

const PROFANITY_WORDS = {
  badword1: 0.5,
  badword2: 0.7
};

// Regex to catch variations
const PROFANITY_REGEX = [
  /f\*[ck]{2}/i
  // Add more complex regex patterns here
];

/**
 * @summary Analyze text content for moderation flags.
 * @description Scans text for profanity and hate speech using wordlists and regex.
 * @param {string} text - The text content to be analyzed.
 * @returns {Promise<object>} - A promise that resolves to an analysis result { score, flagged, details }.
 */
const analyzeText = async (text) => {
  if (!text || typeof text !== 'string') {
    return { score: 0, flagged: false, details: { reason: 'No text provided.' } };
  }

  let score = 0;
  const matchedWords = new Set();
  const lowerCaseText = text.toLowerCase();

  // 1. Check against hate speech wordlist (high severity)
  for (const word in HATE_SPEECH_WORDS) {
    if (lowerCaseText.includes(word)) {
      score += HATE_SPEECH_WORDS[word];
      matchedWords.add(word);
    }
  }

  // 2. Check against profanity wordlist
  for (const word in PROFANITY_WORDS) {
    if (lowerCaseText.includes(word)) {
      score += PROFANITY_WORDS[word];
      matchedWords.add(word);
    }
  }

  // 3. Check against regex patterns
  for (const regex of PROFANITY_REGEX) {
    if (regex.test(lowerCaseText)) {
      score += 0.5; // Add a fixed score for regex matches
      matchedWords.add(regex.toString());
    }
  }

  // Normalize score (cap at 1.0 for consistency)
  const finalScore = Math.min(score, 1.0);
  const flagged = finalScore >= PROFANITY_THRESHOLD;

  return {
    score: finalScore,
    flagged,
    details: {
      matched: Array.from(matchedWords),
      threshold: PROFANITY_THRESHOLD
    }
  };
};

/**
 * @summary (STUB) Analyze an image for moderation flags.
 * @description This is a placeholder for future image analysis functionality.
 * It will integrate with a third-party service like AWS Rekognition or Google Vision AI.
 * @param {string} imageUrl - The URL of the image to be analyzed.
 * @returns {Promise<object>} - A promise that resolves to the image analysis result.
 */
const analyzeImage = async (imageUrl) => {
  console.log(`[STUB] Analyzing image at: ${imageUrl}`);
  // In the future, this function will:
  // 1. Call a third-party AI service.
  // 2. Analyze the response for labels (e.g., 'Violence', 'Nudity').
  // 3. Return a score and flagged status similar to analyzeText.
  return Promise.resolve({ score: 0, flagged: false, details: { reason: 'Image analysis not implemented.' } });
};

/**
 * @summary Automatically flags content if its analysis score exceeds a threshold.
 * @description A convenience wrapper around the specific analysis functions.
 * @param {string} content - The content to analyze (text for now).
 * @param {string} contentType - The type of content ('text', 'image').
 * @returns {Promise<boolean>} - A promise that resolves to true if the content should be flagged.
 */
const shouldFlagContent = async (content, contentType = 'text') => {
  let result;
  if (contentType === 'text') {
    result = await analyzeText(content);
  } else if (contentType === 'image') {
    result = await analyzeImage(content); // content would be imageUrl
  } else {
    return false; // Unsupported type
  }

  return result.flagged;
};

module.exports = {
  analyzeText,
  analyzeImage,
  shouldFlagContent,
  PROFANITY_THRESHOLD // Export for tests
};
