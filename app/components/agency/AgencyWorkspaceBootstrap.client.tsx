import { useEffect, useState } from 'react';
import { createChatWithNextId, openDatabase } from '~/lib/persistence/db';
import { createMessage } from '~/lib/persistence/messageMigration';
import { workbenchStore } from '~/lib/stores/workbench';

type WorkspaceContext = { workspaceId: string; title: string; briefing: string; proposalUrl: string; files: Array<{ path: string; content: string }> };
const MANAGED_PROVIDER = 'OpenRouter';
const MANAGED_MODEL = 'deepseek/deepseek-v4.1-flash-1017';

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
      if (!Array.isArray(body.files) || body.files.length === 0) throw new Error('De huidige projectbestanden ontbreken in de klantworkspace.');
      // Hydrate before navigating to the persisted chat. The chat history
      // loader deliberately preserves this first managed workbench, so Bolt
      // can never present a customer session as ready while its source files
      // are still waiting on a later effect.
      await workbenchStore.importManagedProject(body.files);
      const database = await openDatabase();
      if (!database) throw new Error('De lokale Bolt-workspace kon niet worden voorbereid.');
      const seeded = await createChatWithNextId(
        database,
        [createMessage({ role: 'user', text: `Agency OS klantworkspace geopend voor ${body.title}. De bestaande klantbron wordt geladen; gebruik de briefing als context voor volgende iteraties.\n\n${body.briefing}` })],
        `agency-os-${body.workspaceId}`,
        body.title,
        undefined,
        true,
      );
      database.close();
      if (!seeded.urlId) throw new Error('De lokale Bolt-workspace kon niet worden geïdentificeerd.');
      sessionStorage.setItem('agency-os-managed-workspace', JSON.stringify({ ticket, workspaceId: seeded.urlId, sessionId: body.workspaceId, title: body.title, briefing: body.briefing, proposalUrl: body.proposalUrl, files: body.files }));
      sessionStorage.setItem(`agency-os-managed-workspace:initial:${seeded.urlId}`, '1');
      // A managed Agency OS workspace must always use the server-approved
      // provider/model pair. This also prevents an old Bolt cookie from
      // selecting a model that the Agency OS OpenRouter workspace disallows.
      document.cookie = `selectedProvider=${encodeURIComponent(MANAGED_PROVIDER)}; Path=/; SameSite=Lax`;
      document.cookie = `selectedModel=${encodeURIComponent(MANAGED_MODEL)}; Path=/; SameSite=Lax`;
      window.location.replace(`/chat/${encodeURIComponent(seeded.urlId)}`);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'De project-sessie kon niet worden geopend.'));
  }, []);

  return <main className="w-full h-full flex items-center justify-center p-8"><div className="max-w-md text-center"><div className="i-ph:shield-check text-4xl text-accent mx-auto mb-3" /><h1 className="text-xl font-semibold">Klantworkspace voorbereiden</h1><p className="mt-2 text-sm text-bolt-elements-textSecondary">{error ?? 'Alleen de briefing en bestanden van dit Agency OS-project worden geladen.'}</p></div></main>;
}
