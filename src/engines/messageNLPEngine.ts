/**
 * MESSAGE NLP ENGINE — Lightweight Message Classification
 * Analyzes fisherman/Coast Guard messages for severity, urgency, keywords
 * Uses simple keyword matching and pattern recognition
 * Helps prioritize critical alerts for overwhelmed operators
 */

export type MessageSeverity = 'low' | 'medium' | 'high' | 'critical';
export type MessageCategory = 'distress' | 'violation_alert' | 'compliance' | 'operational' | 'other';

export interface ClassifiedMessage {
  text: string;
  severity: MessageSeverity;
  category: MessageCategory;
  keywords: string[];
  confidence: number;
  tamilTranslation?: string;
}

const CRITICAL_KEYWORDS = [
  'distress', 'sinking', 'fire', 'emergency', 'mayday',
  'medical', 'injury', 'help', 'rescue', 'danger',
  'collision', 'damaged hull', 'engine failure'
];

const VIOLATION_KEYWORDS = [
  'crossing', 'boundary', 'imbl', 'violation', 'illegal',
  'trawling', 'breach', 'unauthorized', 'intrusion'
];

const COMPLIANCE_KEYWORDS = [
  'confirm', 'understood', 'complying', 'retreating',
  'acknowledged', 'yes', 'roger', 'wilco', 'correcting'
];

export function classifyMessage(text: string, tamil: boolean = false): ClassifiedMessage {
  const lowerText = text.toLowerCase();
  const keywords: string[] = [];
  let severity: MessageSeverity = 'low';
  let category: MessageCategory = 'operational';
  let confidence = 0.5;

  // Check for distress keywords
  const criticalMatches = CRITICAL_KEYWORDS.filter(kw => lowerText.includes(kw));
  if (criticalMatches.length > 0) {
    severity = 'critical';
    category = 'distress';
    keywords.push(...criticalMatches);
    confidence = 0.95;
  } else if (
    VIOLATION_KEYWORDS.some(kw => lowerText.includes(kw))
  ) {
    severity = 'high';
    category = 'violation_alert';
    keywords.push(...VIOLATION_KEYWORDS.filter(kw => lowerText.includes(kw)));
    confidence = 0.85;
  } else if (
    COMPLIANCE_KEYWORDS.some(kw => lowerText.includes(kw))
  ) {
    severity = 'low';
    category = 'compliance';
    keywords.push(...COMPLIANCE_KEYWORDS.filter(kw => lowerText.includes(kw)));
    confidence = 0.75;
  }

  // Sentiment analysis: urgency indicators
  const urgencyWords = ['urgent', 'immediately', 'now', 'asap', 'quickly', 'fast'];
  if (urgencyWords.some(w => lowerText.includes(w))) {
    severity =
      severity === 'critical' ? 'critical' :
      severity === 'high' ? 'high' :
      'medium';
    confidence += 0.1;
  }

  // All caps = shouting = higher urgency
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.5 && text.length > 5) {
    severity = severity === 'critical' ? 'critical' : 'high';
    confidence += 0.05;
  }

  confidence = Math.min(1, confidence);

  return {
    text,
    severity,
    category,
    keywords: Array.from(new Set(keywords)),
    confidence,
    tamilTranslation: tamil ? translateMessageToTamil(text) : undefined
  };
}

function translateMessageToTamil(text: string): string {
  const phrases: Record<string, string> = {
    'distress': 'இன்னல்',
    'emergency': 'அவசரநிலை',
    'help': 'உதவி',
    'sinking': 'மூழ்கிவிடுதல்',
    'fire': 'தீ',
    'collision': 'மோதல்',
    'complying': 'இணங்குதல்',
    'violation': 'மீறல்',
    'boundary': 'எல்லை',
    'retreat': 'பின்வாங்குதல்'
  };

  let translated = text;
  for (const [eng, tam] of Object.entries(phrases)) {
    const regex = new RegExp(eng, 'gi');
    translated = translated.replace(regex, tam);
  }
  return translated;
}

export function getPriorityScore(message: ClassifiedMessage): number {
  const severityScore: Record<MessageSeverity, number> = {
    'critical': 100,
    'high': 75,
    'medium': 50,
    'low': 25
  };

  const categoryBoost: Record<MessageCategory, number> = {
    'distress': 20,
    'violation_alert': 15,
    'compliance': -10,
    'operational': 0,
    'other': 0
  };

  return severityScore[message.severity] + categoryBoost[message.category];
}
