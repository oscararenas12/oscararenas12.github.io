// year
document.getElementById('y').textContent = new Date().getFullYear();

// tabs
const links = Array.from(document.querySelectorAll('.sidebar .tab-link'));
const panels = {
    'welcome': document.getElementById('welcome'),
    'experience': document.getElementById('experience'),
    'projects': document.getElementById('projects')
};

function show(target) {
    if (!panels[target]) target = 'welcome';

    // toggle active link
    links.forEach(btn => btn.classList.toggle('is-active', btn.dataset.target === target));

    // show only the target panel
    Object.entries(panels).forEach(([k, el]) => el.classList.toggle('is-active', k === target));
}

// initial view (always Home)
show('welcome');

// nav clicks
links.forEach(btn => {
    btn.addEventListener('click', () => show(btn.dataset.target));
});
