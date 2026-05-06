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
            <a className="primary-btn" href="#services">
              {pageContent.primaryCta}
            </a>
            <a className="secondary-btn" href="#flow">
              {pageContent.secondaryCta}
            </a>
          </div>
        </div>

        <aside className="panel" id="flow">
          <p className="section-title">Booking flow</p>
          <ul className="list">
            {pageContent.pages.map((step) => (
              <li key={step}>
                <span className="bullet" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="section" id="services">
        <p className="section-title">{pageContent.appName}</p>
        <div className="feature-grid">
          {pageContent.features.map((feature) => (
            <article className="card" key={feature}>
              <h4>{feature}</h4>
              <p className="muted">
                This feature can be turned into a form, availability view, confirmation screen, or admin tool in the next pass.
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
