const CONTACT_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /(\+?[0-9]{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/,
  /wa\.me\//i,
  /whatsapp/i,
  /zoom\.us/i,
  /meet\.google/i,
  /teams\.microsoft/i,
  /skype/i,
  /daily\.co/i,
];

export function containsContactInfo(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return CONTACT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export const MESSAGE_FILTER_ERROR =
  "Sharing personal contact information is not allowed on QudrahTech. All communication must stay on platform.";
