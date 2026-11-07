import { useState } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';

type Session = { ticket: string; workspaceId: string; title: string; briefing: string; proposalUrl: string };
const allowedPaths = new Set(['app/page.tsx', 'app/layout.tsx', 'app/globals.css']);

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
  if (!session) return null;

  async function submit() {
    setSubmitting(true); setMessage(null);
    try {
      const files = Object.entries(workbenchStore.files.get()).flatMap(([rawPath, entry]) => {
        const path = rawPath.replace(/^\/home\/project\//, '');
        return allowedPaths.has(path) && entry?.type === 'file' && typeof entry.content === 'string' ? [{ path, content: entry.content }] : [];
      });
      if (!files.length) throw new Error('Nog geen ondersteund websitebestand gevonden. Laat Bolt eerst app/page.tsx, app/layout.tsx of app/globals.css maken.');
      const response = await fetch(session.proposalUrl, {
        method: 'POST', cache: 'no-store', credentials: 'omit',
        headers: { Authorization: `Bearer ${session.ticket}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: `${session.title}: iteratie uit Bolt`, changelog: ['Wijzigingen uit de beheerde Bolt-workspace.'], files }),
      });
      const body = await response.json().catch(() => null) as { pullRequestUrl?: string; error?: string } | null;
      if (!response.ok || !body?.pullRequestUrl) throw new Error(body?.error ?? 'Het voorstel kon niet worden overgenomen.');
      setMessage('Reviewvoorstel aangemaakt. Vercel maakt nu automatisch de preview bij.');
      window.open(body.pullRequestUrl, '_blank', 'noopener,noreferrer');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Het voorstel kon niet worden overgenomen.'); }
    finally { setSubmitting(false); }
  }

  return <div className="flex items-center gap-2"><button onClick={submit} disabled={submitting} className="rounded-md px-3 py-1.5 text-xs bg-accent-500 text-white hover:bg-bolt-elements-button-primary-backgroundHover disabled:opacity-60 flex gap-1.5"><div className="i-ph:git-pull-request" /><span>{submitting ? 'Overnemen…' : 'Neem wijzigingen over'}</span></button>{message && <span className="max-w-72 text-xs text-bolt-elements-textSecondary">{message}</span>}</div>;
}
