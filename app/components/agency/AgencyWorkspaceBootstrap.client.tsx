import { useEffect, useState } from 'react';

type WorkspaceContext = { workspaceId: string; title: string; briefing: string; proposalUrl: string };

export function AgencyWorkspaceBootstrap() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ticket = new URLSearchParams(window.location.hash.slice(1)).get('ticket');
    // Remove the fragment before any UI code, telemetry or navigation sees it.
    window.history.replaceState(null, '', '/agency-workspace');
    if (!ticket) { setError('De project-sessie ontbreekt of is verlopen.'); return; }
    const apiBase = import.meta.env.VITE_AGENCY_OS_API_BASE_URL?.replace(/\/$/, '');
    if (!apiBase) { setError('De beheerde workspace is nog niet geconfigureerd.'); return; }
    void fetch(`${apiBase}/api/bolt/workspaces/consume`, {
      method: 'POST', headers: { Authorization: `Bearer ${ticket}` }, cache: 'no-store', credentials: 'omit',
    }).then(async (response) => {
      const body = await response.json().catch(() => null) as WorkspaceContext & { error?: string } | null;
      if (!response.ok || !body?.workspaceId || !body.proposalUrl) throw new Error(body?.error ?? 'De project-sessie kon niet worden geopend.');
      sessionStorage.setItem('agency-os-managed-workspace', JSON.stringify({ ticket, workspaceId: body.workspaceId, title: body.title, briefing: body.briefing, proposalUrl: body.proposalUrl }));
      window.location.replace(`/chat/${encodeURIComponent(body.workspaceId)}`);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'De project-sessie kon niet worden geopend.'));
  }, []);

  return <main className="w-full h-full flex items-center justify-center p-8"><div className="max-w-md text-center"><div className="i-ph:shield-check text-4xl text-accent mx-auto mb-3" /><h1 className="text-xl font-semibold">Klantworkspace voorbereiden</h1><p className="mt-2 text-sm text-bolt-elements-textSecondary">{error ?? 'Alleen de briefing en bestanden van dit Agency OS-project worden geladen.'}</p></div></main>;
}
