export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 640 }}>
      <h1>DoctorsNotes — backend</h1>
      <p>
        This service runs all AI (extraction, explanation) and serves reconciled, verbatim,
        provenance-anchored data to the patient mobile app. It never assesses, diagnoses, or advises.
      </p>
      <ul>
        <li>
          <code>POST /api/ingest</code> — capture ingest → verbatim Claims (stub)
        </li>
        <li>
          <code>POST /api/explain</code> — on-demand plain-language explanation (stub)
        </li>
      </ul>
    </main>
  );
}
