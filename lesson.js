const file = new URLSearchParams(location.search).get('f');
const notes = document.getElementById('notes');

if (!file || !/^content\/[\w\-\/]+\.md$/.test(file)) {
  notes.textContent = 'Lesson not found.';
} else {
  load().catch(() => {
    notes.textContent = 'Could not load this lesson. Check the file path in content/index.json.';
  });
}

async function load() {
  const tree = await (await fetch('content/index.json')).json();
  const trail = findTrail(tree, file, []);
  const subject = trail && trail[0];

  const res = await fetch(file);
  if (!res.ok) throw new Error(res.status);
  const markdown = await res.text();

  // Glossary is optional: a missing or broken file just means no hover definitions.
  let glossary = {};
  if (subject && subject.glossary) {
    try {
      const raw = await (await fetch(subject.glossary)).json();
      glossary = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]));
    } catch (e) { /* ignore */ }
  }

  notes.innerHTML = render(markdown, glossary);
  highlightCode();
  addCopyButtons();
  setupGlossary(glossary);

  if (trail) {
    document.body.style.setProperty('--c', subject.color);
    notes.style.setProperty('--c', subject.color);
    document.getElementById('crumbs')
      .append(' / ' + trail.slice(0, -1).map(n => n.title).join(' / '));
    document.title = trail[trail.length - 1].title;
  }
}

/* ---------- Markdown + maths + glossary ---------- */
// marked would mangle LaTeX (underscores, backslashes), so maths and glossary terms are swapped
// for placeholders before parsing and put back afterwards. Code is left untouched.
function render(md, glossary) {
  const stash = [];
  const keep = (html, block) => { stash.push({ html, block }); return '@@S' + (stash.length - 1) + '@@'; };

  const parts = md.split(/(```[\s\S]*?```|`[^`\n]*`)/);     // odd indexes are code
  const text = parts.map((p, i) => i % 2 ? p : p
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => keep(math(m, true), true))
    .replace(/(?<![\\$])\$(?=\S)([^$\n]*?\S)\$(?!\d)/g, (_, m) => keep(math(m, false), false))
    .replace(/\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g, (whole, shown, key) => {
      const k = (key || shown).trim().toLowerCase();
      if (!glossary[k]) return whole;                        // unknown term stays visible so you notice
      return keep('<span class="term" tabindex="0" role="button" data-key="' + esc(k) + '">' + esc(shown.trim()) + '</span>', false);
    })
  ).join('');

  return marked.parse(text)
    .replace(/<p>@@S(\d+)@@<\/p>/g, (m, i) => stash[i].block ? stash[i].html : m)
    .replace(/@@S(\d+)@@/g, (m, i) => stash[i].html);
}

function math(src, display) {
  if (typeof katex === 'undefined') return esc(src);
  return katex.renderToString(src.trim(), { displayMode: display, throwOnError: false });
}
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------- Code blocks ---------- */
function highlightCode() {
  if (typeof hljs === 'undefined') return;
  notes.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
}
function addCopyButtons() {
  notes.querySelectorAll('pre').forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'copy';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(pre.querySelector('code').innerText);
      btn.textContent = 'Copied';
      setTimeout(() => (btn.textContent = 'Copy'), 1500);
    });
    pre.append(btn);
  });
}

/* ---------- Glossary popup ---------- */
function setupGlossary(glossary) {
  const pop = document.createElement('div');
  pop.className = 'gloss-pop';
  pop.setAttribute('role', 'tooltip');
  pop.hidden = true;
  document.body.append(pop);

  const line = (cls, text) => { const d = document.createElement('div'); d.className = cls; d.textContent = text; return d; };

  const show = el => {
    const e = glossary[el.dataset.key];
    const meta = [e.type, e.pron && '/' + e.pron + '/'].filter(Boolean).join('  ·  ');
    pop.replaceChildren(
      line('gloss-title', e.term || el.textContent),
      ...(meta ? [line('gloss-meta', meta)] : []),
      line('gloss-def', e.def || ''),
      ...(e.more ? [line('gloss-more', e.more)] : []),
      ...(e.example ? [line('gloss-ex', e.example)] : [])
    );
    pop.hidden = false;
    const r = el.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left), window.innerWidth - pop.offsetWidth - 8);
    let top = r.bottom + 8;
    if (top + pop.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - pop.offsetHeight - 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  };
  const hide = () => { pop.hidden = true; };

  notes.querySelectorAll('.term').forEach(el => {
    el.addEventListener('mouseenter', () => show(el));
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', () => show(el));
    el.addEventListener('blur', hide);
    el.addEventListener('click', ev => { ev.stopPropagation(); show(el); });   // tap on touch screens
  });
  document.addEventListener('click', hide);
  document.addEventListener('scroll', hide, { passive: true });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') hide(); });
}

function findTrail(nodes, file, trail) {
  for (const n of nodes) {
    const here = [...trail, n];
    if (n.file === file) return here;
    if (n.children) { const r = findTrail(n.children, file, here); if (r) return r; }
  }
  return null;
}
