import { expansion } from "@/lib/api";

/** First N rows fetch thumbnails immediately (still capped by concurrency below). Lower indices win the queue. */
export const HARVEST_THUMB_PRELOAD_FIRST = 16;

const MAX_CONCURRENT = 4;

type Waiter = { priority: number; tid: number; resolve: () => void };

let slotWaiters: Waiter[] = [];
let inflightSlots = 0;
let tidSeq = 0;

function pumpSlots(): void {
  slotWaiters.sort((a, b) => a.priority - b.priority || a.tid - b.tid);
  while (inflightSlots < MAX_CONCURRENT && slotWaiters.length > 0) {
    const w = slotWaiters.shift();
    if (!w) break;
    inflightSlots++;
    w.resolve();
  }
}

function acquireSlot(priority: number): Promise<void> {
  return new Promise((resolve) => {
    slotWaiters.push({ priority, tid: tidSeq++, resolve });
    pumpSlots();
  });
}

function releaseSlot(): void {
  inflightSlots = Math.max(0, inflightSlots - 1);
  pumpSlots();
}

/** Avoid duplicate network calls for the same snapshot URL across cards / remounts. */
const settled = new Map<string, string | null>();
const inflightByUrl = new Map<string, Promise<string | null>>();

/**
 * Fetch Meta snapshot og:image via API. Requests are deduped by URL and globally limited to
 * MAX_CONCURRENT at once; lower `priority` (list index) runs sooner.
 */
export function fetchHarvestSnapshotThumb(snapshotUrl: string, priority: number): Promise<string | null> {
  if (settled.has(snapshotUrl)) return Promise.resolve(settled.get(snapshotUrl)!);

  let p = inflightByUrl.get(snapshotUrl);
  if (!p) {
    p = (async () => {
      await acquireSlot(priority);
      try {
        const res = await expansion.competitor.fetchMetaAdSnapshotThumb(snapshotUrl);
        const out = res.thumbnailUrl ?? null;
        settled.set(snapshotUrl, out);
        return out;
      } catch {
        settled.set(snapshotUrl, null);
        return null;
      } finally {
        releaseSlot();
        inflightByUrl.delete(snapshotUrl);
      }
    })();
    inflightByUrl.set(snapshotUrl, p);
  }
  return p;
}
