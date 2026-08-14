'use client';

export default function LogoutButton() {
  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin';
  }

  return (
    <button
      type="button"
      onClick={logout}
      style={{
        background: 'none',
        border: 0,
        color: 'var(--rust)',
        cursor: 'pointer',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        textTransform: 'uppercase',
        fontSize: 13,
        marginLeft: 'auto',
      }}
    >
      Log out
    </button>
  );
}
