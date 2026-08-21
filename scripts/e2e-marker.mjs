// The end-to-end test marker — single source of truth.
//
// Every record created by an end-to-end test carries BOTH of these. Nothing
// deletes a row unless BOTH match, so a typo in one field can never widen a
// cleanup into a real order.
//
// Why this domain: .invalid is reserved by RFC 2606 and can never be
// registered or resolve, so no genuine customer can ever legitimately submit
// an address in it. The order form's own validator
// (/^[^\s@]+@[^\s@]+\.[^\s@]+$/) accepts it, so the marker does not need any
// special case in application code.
//
// Why the name as well: a human scanning the orders table in /admin sees at a
// glance that the row is not something to bake.
//
// NOTE — this does NOT stop the owner being emailed. The order-notification
// email goes to ORDER_NOTIFY_EMAIL, not to the customer's address, so every
// e2e order sends a real message to the owner's inbox. That is deliberate:
// it is how the email fanout gets exercised at all. Expect the mail.
export const E2E_EMAIL_DOMAIN = 'wintergarten-e2e.invalid';

// Matched with `=`, never a prefix or LIKE, so it cannot widen. Anything that
// varies between tests goes in the order's notes field instead.
export const E2E_NAME = 'E2E TEST — do not fulfil';

export function e2eEmail(localPart) {
  return `${localPart}@${E2E_EMAIL_DOMAIN}`;
}

// Belt and braces for any script that is about to touch the database: a row is
// only ever an e2e row if both halves agree.
export function isE2eRow(row) {
  const domain = String(row.email || '').split('@')[1];
  return domain === E2E_EMAIL_DOMAIN && row.name === E2E_NAME;
}
