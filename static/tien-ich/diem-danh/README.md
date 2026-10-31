# Attendance persistence contract

Owner update 2026-10-31: this utility uses encrypted localStorage as its source of truth, overriding older GitHub-first / IndexedDB-only guidance for attendance.

- `blognaver_attendance_encrypted_v4` stores only the AES-256-GCM envelope. Passwords remain in the open page and are not persisted.
- Every mutation awaits encryption, localStorage write/readback and authenticated decryption verification before a success toast. Quota or concurrency failures preserve the prior ciphertext; unsaved form edits stay available.
- Existing encrypted IndexedDB records are read for migration and left intact. Legacy plaintext keys are removed only after verified local encryption.
- No startup, timer, visibility or check-in action invokes GitHub. Only explicit Connect, Load or Sync actions use its API.
- Manual encrypted backups use `attendance-backups:data/attendance/local-backup.json`, with branch creation and SHA conflict checks. Existing `main:data/attendance/records.json` remains available as an explicit legacy import and is never overwritten.
- Reset works offline and preserves the previous encrypted local data. A later explicit upload asks before replacing a backup encrypted with the old key and archives that ciphertext locally.

Checks: `node --test tests/attendance-local.test.cjs tests/attendance-crypto.test.cjs tests/attendance-bento.test.cjs`.
