import {
  getAllFeedback,
  getAllOpenTokens,
  getOpensForToken,
  type FeedbackEntry,
  type OpenEvent,
} from '@/lib/kv';

export const dynamic = 'force-dynamic';

interface TokenOpens {
  token: string;
  events: OpenEvent[];
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

export default async function DashboardPage(): Promise<JSX.Element> {
  const tokens: string[] = await getAllOpenTokens();
  const opens: TokenOpens[] = await Promise.all(
    tokens.map(async (t): Promise<TokenOpens> => ({
      token: t,
      events: await getOpensForToken(t),
    }))
  );
  const feedback: FeedbackEntry[] = await getAllFeedback();

  const deckUrl: string =
    process.env.NEXT_PUBLIC_DECK_URL ?? 'https://deckpress.vercel.app';
  const templateUrl: string = `${deckUrl}/deck?t=INVESTOR_NAME`;

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">
        Deckpress &mdash; Founder Dashboard
      </h1>

      <section className="mb-12">
        <h2 className="text-xs font-bold tracking-widest text-violet-400 uppercase mb-4">
          Deck Opens
        </h2>
        {opens.length === 0 ? (
          <p className="text-slate-400">No opens yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {opens.map(({ token, events }) => {
              const mostRecent: OpenEvent | undefined = events[0];
              return (
                <li
                  key={token}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-semibold">{token}</span>
                    <span className="text-sm text-slate-400">
                      {events.length} {events.length === 1 ? 'open' : 'opens'}
                    </span>
                  </div>
                  {mostRecent ? (
                    <p className="text-sm text-slate-400 mt-1">
                      Most recent: {formatTimestamp(mostRecent.openedAt)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-xs font-bold tracking-widest text-violet-400 uppercase mb-4">
          Generate Investor Link
        </h2>
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
          <code className="block text-sm text-slate-100 break-all">
            {templateUrl}
          </code>
          <p className="text-sm text-slate-400 mt-3">
            Replace INVESTOR_NAME with a label (e.g., a16z, sequoia, tiger).
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xs font-bold tracking-widest text-violet-400 uppercase mb-4">
          Feedback
        </h2>
        {feedback.length === 0 ? (
          <p className="text-slate-400">No feedback yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {feedback.map((entry) => (
              <li
                key={`${entry.sessionId}-${entry.ts}`}
                className="bg-slate-900 border border-slate-700 rounded-lg p-4"
              >
                <blockquote className="text-slate-100 italic">
                  &ldquo;{entry.message}&rdquo;
                </blockquote>
                <p className="text-sm text-slate-400 mt-2">
                  {formatTimestamp(entry.ts)} &middot; {entry.sessionId}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
