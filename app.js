// Remembers which cards are open while the tab is open, so "Back" from a lesson restores the tree.
const STORE = 'studyguide-open';
const openPaths = new Set(JSON.parse(sessionStorage.getItem(STORE) || '[]'));
const remember = () => sessionStorage.setItem(STORE, JSON.stringify([...openPaths]));

fetch('content/index.json')
  .then(r => r.json())
  .then(tree => {
    const root = document.getElementById('tree');
    tree.forEach(subject => root.append(build(subject, 0, subject.color, subject.id)));
  })
  .catch(() => { document.getElementById('tree').textContent = 'Could not load content/index.json'; });

// Recursively builds one card plus its (initially hidden) children.
function build(node, depth, color, path) {
  const wrap = document.createElement('div');
  wrap.className = 'node';
  wrap.style.setProperty('--c', color);

  const isLesson = Boolean(node.file);
  const card = document.createElement(isLesson ? 'a' : 'button');
  card.className = 'card d' + Math.min(depth, 3);
  card.textContent = node.title;
  wrap.append(card);

  if (isLesson) {
    card.href = 'lesson.html?f=' + encodeURIComponent(node.file);
    return wrap;
  }

  const kids = document.createElement('div');
  kids.className = 'kids';
  node.children.forEach(child => kids.append(build(child, depth + 1, color, path + '/' + child.id)));
  wrap.append(kids);

  const setOpen = on => {
    wrap.classList.toggle('open', on);
    card.setAttribute('aria-expanded', on);
    on ? openPaths.add(path) : openPaths.delete(path);
    remember();
  };
  card.addEventListener('click', () => setOpen(!wrap.classList.contains('open')));

  const startOpen = openPaths.has(path);
  wrap.classList.toggle('open', startOpen);
  card.setAttribute('aria-expanded', startOpen);
  return wrap;
}
