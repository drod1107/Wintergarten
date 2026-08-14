export default function DemoBanner() {
  return (
    <div className="demo-banner no-print" role="status">
      Demo mode — no database connected. Browsing, ordering and admin screens all work, but nothing
      you submit is saved between requests. See SETUP.md to attach Postgres.
    </div>
  );
}
