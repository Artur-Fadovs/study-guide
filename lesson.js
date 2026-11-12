const file = new URLSearchParams(location.search).get('f');
const notes = document.getElementById('notes');

// Only allow .md files inside /content
if (!file || !/^content\/[\w\-\/]+\.md$/.test(file)) {
  notes.textContent = 'Lesson not found.';
} else {
  Promise.all([
    fetch(file).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }),
    fetch('content/index.json').then(r => r.json())
  ]).then(([markdown, tree]) => {
    notes.innerHTML = marked.parse(markdown);
    const trail = findTrail(tree, file, []);
    if (trail) {
      document.body.style.setProperty('--c', trail[0].color);
      notes.style.setProperty('--c', trail[0].color);
      const crumbs = document.getElementById('crumbs');
      crumbs.append(' / ' + trail.slice(0, -1).map(n => n.title).join(' / '));
      document.title = trail[trail.length - 1].title;
    }
  }).catch(() => {
    notes.textContent = 'Could not load this lesson. Check the file path in content/index.json.';
  });
}

// Returns the list of nodes from subject down to the lesson with this file.
function findTrail(nodes, file, trail) {
  for (const n of nodes) {
    const here = [...trail, n];
    if (n.file === file) return here;
    if (n.children) { const r = findTrail(n.children, file, here); if (r) return r; }
  }
  return null;
}
