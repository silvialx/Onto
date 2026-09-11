/**
 * Site behavior for the Metaethics ontology page.
 * - scroll-spy for the fixed nav
 * - the two cover/sidenote "portrait" buttons (Aristotle / Language, Truth and Logic)
 * - the expandable class tree in section 2.2
 * - the SPARQL query + results-table loader for the .qa-block templates in section 3
 */
onDomReady(() => {
  // Each init runs independently and catches its own errors, so a problem
  // in one section (e.g. missing markup, or `fetch` unavailable) can't
  // silently prevent the others from running.
  safeInit('scroll-spy', initScrollSpy);
  safeInit('portrait buttons', initPortraitButtons);
  safeInit('class tree', initClassTree);
  safeInit('question blocks', initQaBlocks);
});

// If this script is deferred/loaded normally it always runs before
// DOMContentLoaded fires, so the listener is enough on its own. But if it
// ever ends up injected dynamically or moved after other changes, the event
// may already have fired by the time we attach the listener — in that case
// `document.readyState` is no longer "loading", so run immediately instead
// of waiting forever for an event that already happened.
function onDomReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

function safeInit(label, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`[site.js] "${label}" failed to initialize:`, err);
  }
}

// ---------- Scroll-spy: highlight the nav link for the section currently in view ----------
function initScrollSpy() {
  if (typeof IntersectionObserver === 'undefined') return;

  const sections = document.querySelectorAll('.page, .doc, .divider');
  const navLinks = document.querySelectorAll('.nav-links a[data-nav]');
  if (!sections.length || !navLinks.length) return;

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  sections.forEach((s) => { if (s.id) spy.observe(s); });
}

// ---------- Portrait buttons (Aristotle / Language, Truth and Logic) ----------
// IDs like "3.1" contain a literal dot, so they must be looked up with
// getElementById rather than querySelector (which would read ".1" as a class).
function initPortraitButtons() {
  const buttons = document.querySelectorAll('.portrait-button[data-target]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

// ---------- Expandable class tree (section 2.2) ----------
// Looks up the toggled sublist relative to the toggle's own <li> (via
// :scope > .tree-children) instead of assuming it's the very next sibling
// element, so this keeps working even if a wrapper or extra element gets
// added around the button later.
function initClassTree() {
  const toggles = document.querySelectorAll('.tree-toggle');
  toggles.forEach((btn) => {
    const item = btn.closest('li');
    const children = item ? item.querySelector(':scope > .tree-children') : null;
    if (!children) return;

    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      const isOpen = children.classList.toggle('is-open');
      btn.classList.toggle('is-open', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });
}

// ---------- SPARQL query + results table loader (section 3) ----------
// Each .qa-block points at its own query/result files via data-src attributes,
// so the query text and the result data live in data/queries and data/results
// instead of being hardcoded into the HTML.
function initQaBlocks() {
  document.querySelectorAll('.qa-block').forEach((block) => {
    initQaToggle(block);
    // Fetching the query/results is independent of the dropdown being open:
    // a problem loading one block's data shouldn't stop the toggle button
    // (or any other block) from working.
    if (typeof fetch !== 'undefined') { // e.g. very old browsers / some test environments
      loadQaBlock(block);
    }
  });
}

// Clicking the question expands/collapses its .qa-content dropdown.
function initQaToggle(block) {
  const toggle = block.querySelector('.question-toggle');
  const content = block.querySelector('.qa-content');
  if (!toggle || !content) return;

  toggle.addEventListener('click', () => {
    const isOpen = content.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

async function loadQaBlock(block) {
  const codeEl = block.querySelector('.qa-query__code');
  const tableEl = block.querySelector('.qa-table');

  if (codeEl && codeEl.dataset.src) {
    try {
      const res = await fetch(codeEl.dataset.src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      codeEl.textContent = await res.text();
    } catch (err) {
      codeEl.textContent = `Could not load ${codeEl.dataset.src}`;
      console.error(err);
    }
  }

  if (tableEl && tableEl.dataset.src) {
    try {
      const res = await fetch(tableEl.dataset.src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderTable(tableEl, data);
    } catch (err) {
      tableEl.querySelector('tbody').innerHTML =
        `<tr><td>Could not load ${tableEl.dataset.src}</td></tr>`;
      console.error(err);
    }
  }
}

function renderTable(tableEl, data) {
  const thead = tableEl.querySelector('thead');
  const tbody = tableEl.querySelector('tbody');
  const columns = data.columns || [];
  const rows = data.rows || [];

  thead.innerHTML = '<tr>' + columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('') + '</tr>';

  tbody.innerHTML = rows.length
    ? rows.map((row) =>
        '<tr>' + columns.map((c) => `<td>${escapeHtml(row[c] ?? '')}</td>`).join('') + '</tr>'
      ).join('')
    : `<tr><td colspan="${columns.length || 1}">No results.</td></tr>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}