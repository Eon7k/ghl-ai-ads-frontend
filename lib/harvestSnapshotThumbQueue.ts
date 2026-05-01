import { expansion } from "@/lib/api";

/** First N rows fetch thumbnails immediately (still capped by concurrency below). Lower indices win the queue. */
export const HARVEST_THUMB_PRELOAD_FIRST = 16;

export type HarvestSnapshotPreview = {
  thumbnailUrl: string | null;
  /** Sanitized snapshot HTML when no direct image URL was found (iframe srcDoc). */
  previewHtml: string | null;
};

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

const settled = new Map<string, HarvestSnapshotPreview>();
const inflightByUrl = new Map<string, Promise<HarvestSnapshotPreview>>();

/**
 * Resolve Meta snapshot preview (image URL and/or sanitized embed HTML). Deduped by URL and limited to
 * MAX_CONCURRENT server fetches at once; lower `priority` runs sooner.
 */
export function fetchHarvestSnapshotPreview(snapshotUrl: string, priority: number): Promise<HarvestSnapshotPreview> {
  if (settled.has(snapshotUrl)) return Promise.resolve(settled.get(snapshotUrl)!);

  let p = inflightByUrl.get(snapshotUrl);
  if (!p) {
    p = (async () => {
      await acquireSlot(priority);
      try {
        const res = await expansion.competitor.fetchMetaAdSnapshotThumb(snapshotUrl);
        const out: HarvestSnapshotPreview = {
          thumbnailUrl: res.thumbnailUrl ?? null,
          previewHtml: res.previewHtml ?? null,
        };
        settled.set(snapshotUrl, out);
        return out;
      } catch {
        const empty: HarvestSnapshotPreview = { thumbnailUrl: null, previewHtml: null };
        settled.set(snapshotUrl, empty);
        return empty;
      } finally {
        releaseSlot();
        inflightByUrl.delete(snapshotUrl);
      }
    })();
    inflightByUrl.set(snapshotUrl, p);
  }
  return p;
}
