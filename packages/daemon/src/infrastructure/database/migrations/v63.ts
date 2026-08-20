/**
 * Database migration v63: Persist the signed owner message alongside its signature.
 *
 * pending_approvals stored owner_signature but not the bytes it was made over, so
 * an approval could never be re-verified after the fact: an auditor holding the
 * signature and the owner address cannot check it without the message. EIP-712
 * approvals were unaffected because they already persist typed_data_json.
 *
 * Additive column, so a plain ALTER TABLE is enough -- no CHECK constraint changes
 * and therefore no 12-step table recreation. Existing rows keep NULL, which reads
 * as "approved before this column existed" rather than "approved with no message".
 *
 * @see internal/objectives/issues/505-approval-message-not-persisted.md
 */

import type { Database } from 'better-sqlite3';
import type { Migration } from '../migrate.js';

export const migrations: Migration[] = [
  {
    version: 63,
    description: 'Add pending_approvals.owner_message so approvals can be re-verified',
    up: (sqlite: Database) => {
      const columns = sqlite.pragma('table_info(pending_approvals)') as { name: string }[];
      if (columns.some((c) => c.name === 'owner_message')) return;

      sqlite.exec('ALTER TABLE pending_approvals ADD COLUMN owner_message TEXT');
    },
  },
];
