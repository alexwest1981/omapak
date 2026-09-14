<svelte:head>
  <title>how to submit · Omapak</title>
  <meta
    name="description"
    content="Submit an app to Omapak: fork, add your manifest and metadata.yml, open a PR. The agent judge grades it, a human merges. No attestation about who wrote your code."
  />
</svelte:head>

<section class="py-14">
  <p class="font-mono text-xs uppercase tracking-[0.2em] text-ink-dim">how to submit</p>
  <h1 class="mt-3 max-w-3xl text-4xl leading-tight">Open a PR. Get graded. Merge is human.</h1>
  <p class="mt-5 max-w-[var(--read-width)] text-lg text-muted">
    Four steps, two files, no omapak account. We never ask who or what wrote your code — the
    judge grades the artifact, a human reads the report and merges.
  </p>
</section>

<section class="border-t border-line py-10">
  <div class="space-y-12">
    <div>
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">step 1 · fork and branch</p>
      <p class="mt-3 max-w-[var(--read-width)] text-muted">
        Collaborators push branches straight to
        <code class="font-mono text-sm text-fg">outcrop-labs/omapak</code>; everyone else
        forks first.
      </p>
      <pre
        class="mt-3 max-w-full overflow-x-auto rounded-sm border border-line bg-panel p-4 font-mono text-xs leading-relaxed text-muted">git clone git@github.com:<span class="text-fg">your-handle</span>/omapak.git && cd omapak
git checkout -b <span class="text-fg">add-my-app</span></pre>
    </div>

    <div>
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">step 2 · add your app</p>
      <p class="mt-3 max-w-[var(--read-width)] text-muted">
        Create <code class="font-mono text-sm text-fg">apps/&lt;your.app-id&gt;/</code> with a
        manifest named after the app id (flathub-style) and a
        <code class="font-mono text-sm text-fg">metadata.yml</code>:
      </p>
      <pre
        class="mt-4 max-w-full overflow-x-auto rounded-sm border border-line bg-panel p-4 font-mono text-xs leading-relaxed text-muted">apps/com.yourname.yourapp/
├── com.yourname.yourapp.json        <span class="text-ink-dim"># flatpak-builder manifest</span>
├── com.yourname.yourapp.metainfo.xml <span class="text-ink-dim"># optional; scored by the rubric</span>
└── metadata.yml</pre>
      <p class="mt-4 max-w-[var(--read-width)] text-muted">
        metadata.yml — first three fields required, the rest optional:
      </p>
      <pre
        class="mt-3 max-w-full overflow-x-auto rounded-sm border border-line bg-panel p-4 font-mono text-xs leading-relaxed text-muted">submitter: your-handle               <span class="text-ink-dim"># required</span>
source_repo: https://github.com/you/your-app  <span class="text-ink-dim"># required</span>
summary: One line, plain words       <span class="text-ink-dim"># required</span>
license: MIT                         <span class="text-ink-dim"># optional</span>
homepage: https://yourapp.example    <span class="text-ink-dim"># optional</span>
tags: [utility, gnome]               <span class="text-ink-dim"># optional</span></pre>
      <p class="mt-4 max-w-[var(--read-width)] text-muted">
        Include the metainfo even though it's optional: it carries your name, description,
        screenshots and release notes into the catalog and software stores, and the rubric
        scores it. Without it your tile renders blank.
      </p>
    </div>

    <div>
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">step 3 · open the PR</p>
      <p class="mt-3 max-w-[var(--read-width)] text-muted">
        Push the branch and open a PR. CI runs the judge and posts the full report as a
        comment on your PR:
      </p>
      <ul class="mt-4 max-w-[var(--read-width)] list-disc space-y-2 pl-5 text-muted marker:text-ink-dim">
        <li>
          <span class="text-fg">static pass</span> — flatpak-builder-lint on the manifest and
          metainfo, sandbox and pinning advisories
        </li>
        <li><span class="text-fg">real build</span> — flatpak-builder in a clean environment; the only hard gate</li>
        <li>
          <span class="text-fg">rubric</span> — the agent grades problem clarity, packaging,
          code quality, UI/UX, security; scores are advisory, never a gate
        </li>
      </ul>
      <p class="mt-4 max-w-[var(--read-width)] text-muted">
        Build passes, report reads clean enough → a maintainer merges, with written reasons
        either way, in public.
      </p>
    </div>

    <div>
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">step 4 · merged and installable</p>
      <p class="mt-3 max-w-[var(--read-width)] text-muted">
        On merge your app is built, signed, published, and its judge report goes live on this
        site. Users install it like any flatpak:
      </p>
      <pre
        class="mt-3 max-w-full overflow-x-auto rounded-sm border border-line bg-panel p-4 font-mono text-xs leading-relaxed text-muted">flatpak install omapak com.yourname.yourapp</pre>
    </div>

    <div>
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">optional · preflight locally</p>
      <p class="mt-3 max-w-[var(--read-width)] text-muted">
        Cheapest check is the build itself:
      </p>
      <pre
        class="mt-3 max-w-full overflow-x-auto rounded-sm border border-line bg-panel p-4 font-mono text-xs leading-relaxed text-muted">flatpak-builder --force-clean --repo=/tmp/omapak-test \
  build apps/com.yourname.yourapp/com.yourname.yourapp.json</pre>
      <p class="mt-4 max-w-[var(--read-width)] text-muted">
        To run exactly what CI runs (static pass + build + rubric), use the judge from an
        omapak checkout with any OpenAI-compatible endpoint in
        <code class="font-mono text-sm text-fg">OMAPAK_LLM_BASE_URL</code> /
        <code class="font-mono text-sm text-fg">OMAPAK_LLM_KEY</code> /
        <code class="font-mono text-sm text-fg">OMAPAK_LLM_MODEL</code>:
      </p>
      <pre
        class="mt-3 max-w-full overflow-x-auto rounded-sm border border-line bg-panel p-4 font-mono text-xs leading-relaxed text-muted">git clone --depth 100 https://github.com/you/your-app /tmp/src
cargo run -p omapak-judge -- apps/com.yourname.yourapp --source-dir /tmp/src</pre>
    </div>

    <div class="max-w-[var(--read-width)] rounded-sm border border-warning/40 bg-card p-5">
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-warning">
        private repo or closed source?
      </p>
      <p class="mt-3 text-sm text-muted">
        Allowed. Set <code class="font-mono text-sm text-fg">source_access: proprietary</code>
        in metadata.yml and pin the manifest to your release assets with sha256 checksums.
        The judge grades packaging and provenance (it can't read the code, and says so) and
        the catalog shows a <span class="text-warning">proprietary</span> badge. Submitting
        someone else's closed app needs the owner's okay on an omapak issue first; if it's
        yours, it already has it. Want the code actually read? Offer a scoped read-only
        token for the run — optional, deleted after.
      </p>
    </div>

    <div class="max-w-[var(--read-width)] rounded-sm border border-line bg-card p-5">
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">
        the one ongoing rule · maintenance
      </p>
      <p class="mt-3 text-sm text-muted">
        Published apps have to be alive or perma-stable. Unmaintained apps are archived to
        <code class="font-mono text-sm text-fg">omapak-unmaintained</code> — still
        installable, clearly labeled — and dropped if they stay quiet after that. The exact
        window is TBD and will be set in the open.
      </p>
    </div>
  </div>
</section>
