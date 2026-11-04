export const TOPICS = {
  Dasar: "Dasar RouterOS dan IPv4",
  DHCP: "DHCP dan DNS",
  Bridge: "Bridging",
  Routing: "Routing",
  Wireless: "Wireless",
  Firewall: "Firewall dan NAT",
  QoS: "QoS / Simple Queue",
  Tunnel: "PPP dan Tunneling",
  Tools: "Tools dan Troubleshooting",
} as const;

export const TOPIC_KEYS = [
  "Dasar",
  "DHCP",
  "Bridge",
  "Routing",
  "Wireless",
  "Firewall",
  "QoS",
  "Tunnel",
  "Tools",
] as const;

/**
 * Deterministic question number order from the original MTCNA simulation.
 * Each number expands to ["A<nn>", "B<nn>"] to produce 50 interleaved questions.
 */
export const TRYOUT_NUMBER_ORDER = [
  1, 5, 8, 10, 13, 16, 20, 22, 24, 2, 6, 9, 11, 14, 17, 21, 23, 25, 3, 7, 12,
  15, 18, 4, 19,
] as const;

const QUESTION_SET_PREFIXES = ["A", "B"] as const;

export function buildTryoutQuestionIds(): string[] {
  return TRYOUT_NUMBER_ORDER.flatMap((numberValue) => {
    const paddedNumber = String(numberValue).padStart(2, "0");
    return QUESTION_SET_PREFIXES.map((prefix) => `${prefix}${paddedNumber}`);
  });
}

export const TRYOUT_QUESTION_IDS: readonly string[] = buildTryoutQuestionIds();

export function isValidTopicKey(value: string): value is keyof typeof TOPICS {
  return Object.prototype.hasOwnProperty.call(TOPICS, value);
}

export function getTopicLabel(topicKey: keyof typeof TOPICS): string {
  return TOPICS[topicKey];
}

