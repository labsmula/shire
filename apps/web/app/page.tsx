export default function Page() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Shire</p>
        <h1>AI hiring workflows with stablecoin settlement on Celo.</h1>
        <p className="lede">
          A workspace for structured matching, agent orchestration, and escrow-based payouts.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href="#workflow">
            Review workflow
          </a>
          <a className="button button-secondary" href="#stack">
            View stack
          </a>
        </div>
      </section>

      <section className="grid" id="workflow">
        <article className="card">
          <p className="card-label">1. Match</p>
          <h2>Structured candidate and role alignment.</h2>
          <p>Keep the matching pipeline deterministic and easy to audit.</p>
        </article>
        <article className="card">
          <p className="card-label">2. Orchestrate</p>
          <h2>Agent-driven workflows with explicit tool usage.</h2>
          <p>Prefer the right skill or MCP, and use Context7 for current library docs.</p>
        </article>
        <article className="card">
          <p className="card-label">3. Settle</p>
          <h2>Stablecoin escrow on Celo.</h2>
          <p>Keep onchain settlement simple, bounded, and product-aligned.</p>
        </article>
      </section>

      <section className="stack" id="stack">
        <div>
          <p className="stack-label">Workspace</p>
          <p>Apps, packages, and contracts are split by responsibility.</p>
        </div>
        <div>
          <p className="stack-label">Defaults</p>
          <p>npm workspaces, Turborepo, TypeScript, Next.js, Mastra, and Foundry.</p>
        </div>
      </section>
    </main>
  );
}
