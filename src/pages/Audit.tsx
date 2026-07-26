import { ShieldCheck } from 'lucide-react';
import { useQuery } from '../lib/query';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { formatDateTime } from '../lib/format';
import type { AuditLog } from '../lib/types';

export function AuditPage() {
  const { data: logs, loading } = useQuery<AuditLog>(
    'audit_logs', '*', { order: ['created_at', { ascending: false }], limit: 200 },
  );

  const columns: Column<AuditLog>[] = [
    { key: 'date', header: 'Date', sortable: true, sortValue: (l) => l.created_at, render: (l) => <span className="text-sm">{formatDateTime(l.created_at)}</span> },
    { key: 'user', header: 'Utilisateur', render: (l) => <span className="text-sm text-ink-600 dark:text-ink-300">{l.user_email || '—'}</span> },
    { key: 'action', header: 'Action', sortable: true, sortValue: (l) => l.action, render: (l) => <span className="text-sm font-medium">{l.action}</span> },
    { key: 'module', header: 'Module', render: (l) => <span className="text-sm text-ink-600 dark:text-ink-300">{l.module || '—'}</span> },
    { key: 'entity', header: 'Entité', render: (l) => <span className="text-sm text-ink-500">{l.entity_type || '—'}</span> },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Journal d'audit" subtitle={`${logs?.length ?? 0} entrée(s) — traçabilité des actions`} icon={<ShieldCheck className="w-5 h-5" />} />
      <DataTable columns={columns} rows={logs ?? []} rowKey={(l) => l.id} loading={loading}
        searchKeys={(l) => `${l.user_email || ''} ${l.action} ${l.module || ''} ${l.entity_type || ''}`}
        emptyMessage="Aucune entrée" emptyHint="Les actions des utilisateurs apparaîtront ici." />
    </div>
  );
}
