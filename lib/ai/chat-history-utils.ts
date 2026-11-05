import type { AiConversation } from "@/lib/types";

export interface ConversationGroup {
  label: string;
  items: AiConversation[];
}

export function groupConversationsByDate(
  conversations: readonly AiConversation[],
  now: Date = new Date(),
): ConversationGroup[] {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfLast7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const todayItems: AiConversation[] = [];
  const yesterdayItems: AiConversation[] = [];
  const last7DaysItems: AiConversation[] = [];
  const olderItems: AiConversation[] = [];

  for (const conv of conversations) {
    const time = Date.parse(conv.updatedAt || conv.createdAt);
    if (Number.isNaN(time)) {
      olderItems.push(conv);
      continue;
    }

    if (time >= startOfToday) {
      todayItems.push(conv);
    } else if (time >= startOfYesterday) {
      yesterdayItems.push(conv);
    } else if (time >= startOfLast7Days) {
      last7DaysItems.push(conv);
    } else {
      olderItems.push(conv);
    }
  }

  const groups: ConversationGroup[] = [];
  if (todayItems.length > 0) {
    groups.push({ label: "Hari Ini", items: todayItems });
  }
  if (yesterdayItems.length > 0) {
    groups.push({ label: "Kemarin", items: yesterdayItems });
  }
  if (last7DaysItems.length > 0) {
    groups.push({ label: "7 Hari Terakhir", items: last7DaysItems });
  }
  if (olderItems.length > 0) {
    groups.push({ label: "Lebih Lama", items: olderItems });
  }

  return groups;
}

