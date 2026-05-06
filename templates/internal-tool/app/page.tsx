import { pageContent } from "./generated/pageContent";

export default function Page() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="panel">
          <span className="eyebrow">{pageContent.eyebrow}</span>
          <h1>{pageContent.headline}</h1>
          <p>{pageContent.summary}</p>
        </div>

        <aside className="panel">
          <p className="section-title">Core pillars</p>
          <div className="feature-grid">
            {pageContent.features.map((feature) => (
              <article className="card" key={feature}>
                <h4>{feature}</h4>
                <p className="muted">
                  This feature can be mapped into queues, forms, summaries, or review steps depending on the internal workflow.
                </p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
