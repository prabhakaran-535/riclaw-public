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
            <a className="primary-btn" href="#highlights">
              {pageContent.primaryCta}
            </a>
            <a className="secondary-btn" href="#contact">
              {pageContent.secondaryCta}
            </a>
          </div>
        </div>

        <aside className="panel">
          <p className="section-title">Launch checklist</p>
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

      <section className="section" id="highlights">
        <p className="section-title">{pageContent.appName}</p>
        <div className="feature-grid">
          {pageContent.features.map((feature) => (
            <article className="card" key={feature}>
              <h4>{feature}</h4>
              <p className="muted">
                This starter section is seeded from the spec so the landing page already reflects the requested product.
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
