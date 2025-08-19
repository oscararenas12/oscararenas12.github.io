// year
document.getElementById('y').textContent = new Date().getFullYear();

// tabs
const links = Array.from(document.querySelectorAll('.sidebar .tab-link'));
const panels = {
    '#welcome': document.getElementById('welcome'),
    '#projects': document.getElementById('projects')
};

function show(hash) {
    if (!panels[hash]) hash = '#welcome';

    // toggle active link
    links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === hash));

    // show only the target panel (others are display:none)
    Object.entries(panels).forEach(([k, el]) => el.classList.toggle('is-active', k === hash));

    // keep hash for refresh/back
    if (location.hash !== hash) history.replaceState(null, '', hash);

    // reset scroll to the top of the content area
    const container = document.querySelector('.tabs');
    if (container) container.scrollIntoView({ behavior: 'instant', block: 'start' });
    // If you prefer a smooth jump, use:
    // container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// initial view (support direct #projects links)
show(location.hash || '#welcome');

// nav clicks
links.forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        show(a.getAttribute('href'));
    });
});

// back/forward support
window.addEventListener('hashchange', () => show(location.hash));
