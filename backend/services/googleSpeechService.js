const { v2 } = require('@google-cloud/speech');

/**
 * Google Cloud Speech-to-Text v2 service.
 * Uses the official Node.js SDK and Service Account authentication.
 */

// Initialize the v2 client with the regional endpoint for Chirp
// It will automatically pick up the GOOGLE_APPLICATION_CREDENTIALS env var
const client = new v2.SpeechClient({
  apiEndpoint: 'asia-southeast1-speech.googleapis.com',
});

const PROJECT_ID = 'carecommunity-497209';
const LOCATION = 'asia-southeast1'; // Chirp model is GA in this region
const RECOGNIZER_ID = '_'; // Default recognizer
const RECOGNIZER_PATH = `projects/${PROJECT_ID}/locations/${LOCATION}/recognizers/${RECOGNIZER_ID}`;

// Map frontend language codes to Google Cloud STT config
const LANGUAGE_CONFIG = {
  'en-US': { languageCodes: ['en-US'], model: 'chirp' },
  'hi-IN': { languageCodes: ['hi-IN'], model: 'chirp' },
  'as-IN': { languageCodes: ['as-IN'], model: 'chirp' }, // True Assamese via Chirp
};

/**
 * Transcribe base64-encoded audio using Google Cloud Speech-to-Text v2 API.
 *
 * @param {string} audioBase64 - The audio data as a base64 string.
 * @param {string} frontendLangCode - The language selected in the frontend.
 * @param {string} encoding - Audio encoding format (default: 'WEBM_OPUS').
 * @returns {Promise<string>} The transcribed text.
 */
async function transcribeAudio(audioBase64, frontendLangCode = 'en-US', encoding = 'WEBM_OPUS') {
  // Map to the correct v2 configuration
  const langConfig = LANGUAGE_CONFIG[frontendLangCode] || LANGUAGE_CONFIG['en-US'];

  const request = {
    recognizer: RECOGNIZER_PATH,
    config: {
      explicitDecodingConfig: {
        encoding: encoding,
        sampleRateHertz: 48000,
        audioChannelCount: 1,
      },
      languageCodes: langConfig.languageCodes,
      model: langConfig.model,
      features: {
        enableAutomaticPunctuation: true,
      }
    },
    content: audioBase64,
  };

  try {
    const [response] = await client.recognize(request);
    
    // Extract transcription from response
    if (response.results && response.results.length > 0) {
      const transcript = response.results
        .map((r) => r.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim();
      return transcript;
    } else {
      return ''; // No speech detected
    }
  } catch (err) {
    throw new Error(`Google STT SDK Error: ${err.message}`);
  }
}

module.exports = { transcribeAudio, LANGUAGE_CONFIG };
