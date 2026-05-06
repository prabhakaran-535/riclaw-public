import { pageContent } from "./generated/pageContent";

export default function Page() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="panel">
          <span className="eyebrow">{pageContent.eyebrow}</span>
          <h1>{pageContent.headline}</h1>
          <p>{pageContent.summary}</p>
          <div className="stat-grid">
            {pageContent.features.slice(0, 3).map((feature) => (
              <article className="card" key={feature}>
                <h3>{feature}</h3>
                <p className="muted">This becomes an actionable dashboard area once Codex fills in entities and controls.</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel">
          <p className="section-title">Good starting points</p>
          <ul className="list">
            {pageContent.assumptions.map((item) => (
              <li key={item}>
                <span className="bullet" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}
