import { useEffect, useState } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';

type Session = { ticket: string; workspaceId: string; title: string; briefing: string; proposalUrl: string; expiresAt?: string };
const allowedPaths = new Set(['app/page.tsx', 'app/layout.tsx', 'app/globals.css', 'app/styles.css']);

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}u ${String(minutes).padStart(2, '0')}m` : `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function currentSession(): Session | null {
  try {
    const value = sessionStorage.getItem('agency-os-managed-workspace');
    const parsed = value ? JSON.parse(value) : null;
    return parsed && typeof parsed.ticket === 'string' && typeof parsed.proposalUrl === 'string' ? parsed as Session : null;
  } catch { return null; }
}

export function ManagedWorkspaceTakeover() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const session = currentSession();
  const [expiresAt, setExpiresAt] = useState<string | null>(session?.expiresAt ?? null);
  const [now, setNow] = useState(() => Date.now());
  const proposalUrl = session?.proposalUrl;
  const ticket = session?.ticket;

  useEffect(() => {
    if (!proposalUrl || !ticket || expiresAt) return;
    void fetch(proposalUrl, {
      headers: { Authorization: `Bearer ${ticket}` }, cache: 'no-store', credentials: 'omit',
    }).then(async (response) => {
      const body = await response.json().catch(() => null) as { expiresAt?: string } | null;
      if (response.ok && typeof body?.expiresAt === 'string') setExpiresAt(body.expiresAt);
    }).catch(() => undefined);
  }, [expiresAt, proposalUrl, ticket]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!session) return null;
  const activeSession = session;
  const millisecondsRemaining = expiresAt ? new Date(expiresAt).getTime() - now : null;
  const expired = millisecondsRemaining !== null && millisecondsRemaining <= 0;
  const nearExpiry = millisecondsRemaining !== null && millisecondsRemaining > 0 && millisecondsRemaining <= 15 * 60 * 1000;

  async function submit() {
    setSubmitting(true); setMessage(null);
    try {
      const files = Object.entries(workbenchStore.files.get()).flatMap(([rawPath, entry]) => {
        const path = rawPath.replace(/^\/home\/project\//, '');
        return allowedPaths.has(path) && entry?.type === 'file' && typeof entry.content === 'string' ? [{ path, content: entry.content }] : [];
      });
      if (!files.length) throw new Error('Nog geen ondersteund websitebestand gevonden. Laat Bolt eerst app/page.tsx, app/layout.tsx, app/globals.css of app/styles.css maken.');
      const response = await fetch(activeSession.proposalUrl, {
        method: 'POST', cache: 'no-store', credentials: 'omit',
        headers: { Authorization: `Bearer ${activeSession.ticket}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: `${activeSession.title}: iteratie uit Bolt`, changelog: ['Wijzigingen uit de beheerde Bolt-workspace.'], files }),
      });
      const body = await response.json().catch(() => null) as { pullRequestUrl?: string; error?: string } | null;
      if (!response.ok || !body?.pullRequestUrl) throw new Error(body?.error ?? 'Het voorstel kon niet worden overgenomen.');
      setMessage('Reviewvoorstel aangemaakt. Vercel maakt nu automatisch de preview bij.');
      window.open(body.pullRequestUrl, '_blank', 'noopener,noreferrer');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Het voorstel kon niet worden overgenomen.'); }
    finally { setSubmitting(false); }
  }

  return <div className="flex items-center gap-2"><span className={`text-xs font-medium ${expired || nearExpiry ? 'text-red-300' : 'text-bolt-elements-textSecondary'}`} title="Tijd tot deze klantworkspace niet meer kan worden overgenomen">{millisecondsRemaining === null ? 'Sessie controleren…' : expired ? 'Sessie verlopen' : `Sessie: ${formatRemaining(millisecondsRemaining)}`}</span><button onClick={submit} disabled={submitting || expired} className="rounded-md px-3 py-1.5 text-xs bg-accent-500 text-white hover:bg-bolt-elements-button-primary-backgroundHover disabled:opacity-60 flex gap-1.5"><div className="i-ph:git-pull-request" /><span>{submitting ? 'Overnemen…' : 'Neem wijzigingen over'}</span></button>{message && <span className="max-w-72 text-xs text-bolt-elements-textSecondary">{message}</span>}</div>;
}
