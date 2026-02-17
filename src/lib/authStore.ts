// Simple module-level store for the current user's ID.
// Set by AuthContext on login, read by services for RPC calls.
let _callerId: string | null = null;

export function setCallerId(id: string | null) {
  _callerId = id;
}

export function getCallerId(): string | null {
  return _callerId;
}
