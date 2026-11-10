// Anonymous on purpose — "Voice N" in the order people first contributed,
// never their names. Points must be sorted by created_at ascending.
export function voiceLabels(
  points: { participant_id: string }[],
): Map<string, string> {
  const labels = new Map<string, string>();
  for (const p of points) {
    if (labels.has(p.participant_id)) continue;
    labels.set(p.participant_id, `Voice ${labels.size + 1}`);
  }
  return labels;
}
