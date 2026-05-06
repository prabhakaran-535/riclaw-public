import { pageContent } from "./generated/pageContent";

export default function Page() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="panel">
          <span className="eyebrow">{pageContent.eyebrow}</span>
          <h1>{pageContent.headline}</h1>
          <p>{pageContent.summary}</p>
          <div className="hero-actions">
            <a className="primary-btn" href="#features">
              {pageContent.primaryCta}
            </a>
            <a className="secondary-btn" href="#timeline">
              {pageContent.secondaryCta}
            </a>
          </div>
          <div className="stat-grid">
            <article className="card">
              <h3>Users</h3>
              <p className="muted">{pageContent.targetUsers.join(", ") || "General audience"}</p>
            </article>
            <article className="card">
              <h3>Pages</h3>
              <p className="muted">{pageContent.pages.join(", ")}</p>
            </article>
            <article className="card">
              <h3>Style</h3>
              <p className="muted">{pageContent.stylingNotes.join(", ") || "Default starter style"}</p>
            </article>
          </div>
        </div>

        <aside className="panel" id="timeline">
          <p className="section-title">Assumptions</p>
          <ul className="list">
            {pageContent.assumptions.map((item) => (
              <li key={item}>
                <span className="bullet" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="footer-note">
            Codex can now build from a starter that already reflects the extracted app spec.
          </p>
        </aside>
      </section>

      <section className="section" id="features">
        <p className="section-title">{pageContent.appName}</p>
        <div className="feature-grid">
          {pageContent.features.map((feature) => (
            <article className="card" key={feature}>
              <h4>{feature}</h4>
              <p className="muted">
                This feature was extracted from the original user request and can be expanded by Codex in later phases.
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
