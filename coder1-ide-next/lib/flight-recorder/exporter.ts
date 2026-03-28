/**
 * FlightRecorderExporter — Exports session recordings for sharing.
 * Server-side only. Deep-scrubs all content before export.
 */

import type { FlightEvent, FlightSession, FlightAnnotation } from './types';

interface ExportManifest {
  version: 1;
  exportedAt: number;
  generator: 'coder1-flight-recorder';
  session: Omit<FlightSession, 'id'> & { originalId: string };
  eventCount: number;
}

export interface ExportPackage {
  manifest: ExportManifest;
  events: FlightEvent[];
  annotations: FlightAnnotation[];
}

/** Strip machine-specific path prefixes, keep project-relative path */
function anonymizePath(filePath: string): string {
  const patterns = [
    /^\/Users\/[^/]+\//,
    /^\/home\/[^/]+\//,
    /^[A-Z]:\\Users\\[^\\]+\\/i,
  ];
  let result = filePath;
  for (const pattern of patterns) {
    result = result.replace(pattern, '~/');
  }
  return result;
}

export class FlightRecorderExporter {
  async exportSession(sessionId: string): Promise<ExportPackage> {
    const { FlightRecorderStorage } = require('./storage');
    const storage = FlightRecorderStorage.getInstance();
    const { secretScrubber } = require('./scrubber');

    const session: FlightSession | null = storage.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const eventRows = storage.getEvents({ sessionId, limit: 100000 });
    const events: FlightEvent[] = eventRows.map((r: { event: FlightEvent }) => r.event);

    // Deep scrub all events
    const scrubbedEvents = events.map((event: FlightEvent) => {
      const scrubbed = { ...event, data: { ...event.data } };

      for (const [key, value] of Object.entries(scrubbed.data)) {
        if (typeof value === 'string') {
          scrubbed.data[key] = secretScrubber.deepScrub(value).text;
        }
      }

      if (typeof scrubbed.data.path === 'string') {
        scrubbed.data.path = anonymizePath(scrubbed.data.path as string);
      }
      if (typeof scrubbed.data.fileName === 'string') {
        scrubbed.data.fileName = anonymizePath(scrubbed.data.fileName as string);
      }
      if (scrubbed.searchableText) {
        scrubbed.searchableText = secretScrubber.deepScrub(scrubbed.searchableText).text;
      }

      return scrubbed;
    });

    const manifest: ExportManifest = {
      version: 1,
      exportedAt: Date.now(),
      generator: 'coder1-flight-recorder',
      session: {
        originalId: session.id,
        sessionId: session.sessionId,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        totalEvents: session.totalEvents,
        totalSizeBytes: session.totalSizeBytes,
        metadata: session.metadata,
        starred: session.starred,
      },
      eventCount: scrubbedEvents.length,
    };

    return { manifest, events: scrubbedEvents, annotations: [] };
  }
}

export const flightRecorderExporter = new FlightRecorderExporter();
