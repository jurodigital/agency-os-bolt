import { ClientOnly } from 'remix-utils/client-only';
import { AgencyWorkspaceBootstrap } from '~/components/agency/AgencyWorkspaceBootstrap.client';

export default function AgencyWorkspaceRoute() {
  return <ClientOnly fallback={<main className="p-8 text-center">Beveiligde klantworkspace laden…</main>}>{() => <AgencyWorkspaceBootstrap />}</ClientOnly>;
}
