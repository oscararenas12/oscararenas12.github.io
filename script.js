// ===== Scroll lock during loading =====
window.addEventListener('scroll', () => {
    if (!document.body.classList.contains('ready')) window.scrollTo(0, 0);
});

// ===== Loading animation =====
const header = document.getElementById('header');
const loadingPercent = document.getElementById('loadingPercent');
const preOscar = document.getElementById('preOscar');
const preArenas = document.getElementById('preArenas');
const headerNav = document.getElementById('headerNav');
const blocks = document.querySelectorAll('.type-block');

const oscarFullWidth = 227;
const arenasFullWidth = 294;
const totalNameWidth = oscarFullWidth + arenasFullWidth;

// Calculate how far to push header down to center it
function getCenterOffset() {
    const headerRect = header.getBoundingClientRect();
    const headerCenter = headerRect.top + headerRect.height / 2;
    const viewportCenter = window.innerHeight / 2;
    return viewportCenter - headerCenter;
}

// Start centered
const offset = getCenterOffset();
header.style.transform = 'translateY(' + offset + 'px)';

let progress = 0;
let hasSettled = false;
const duration = 3000;
const stepTime = 30;
const steps = duration / stepTime;
const increment = 100 / steps;

const loadInterval = setInterval(() => {
    progress += increment;

    // At ~80%, animate header back to its natural position
    if (progress >= 80 && !hasSettled) {
        hasSettled = true;
        header.style.transform = 'translateY(0)';
    }

    if (progress >= 100) {
        progress = 100;
        clearInterval(loadInterval);
        loadingPercent.textContent = '100%';

        preOscar.style.width = oscarFullWidth + 'px';
        preArenas.style.width = arenasFullWidth + 'px';

        setTimeout(onNameDone, 500);
        return;
    }

    loadingPercent.textContent = Math.floor(progress) + '%';

    const revealedPixels = (progress / 100) * totalNameWidth;

    if (revealedPixels <= oscarFullWidth) {
        preOscar.style.width = revealedPixels + 'px';
        preArenas.style.width = '0px';
    } else {
        preOscar.style.width = oscarFullWidth + 'px';
        preArenas.style.width = (revealedPixels - oscarFullWidth) + 'px';
    }
}, stepTime);

function onNameDone() {
    preOscar.classList.add('revealed');
    preArenas.classList.add('revealed');

    loadingPercent.classList.add('done');

    setTimeout(() => {
        headerNav.classList.add('revealed');
    }, 300);

    let delay = 600;
    blocks.forEach((block) => {
        setTimeout(() => {
            block.classList.add('revealed');
        }, delay);
        delay += 80;
    });

    setTimeout(() => {
        document.body.classList.add('ready');
    }, delay + 200);
}

// ===== Experience hover/click terminal =====
document.querySelectorAll('.work-item').forEach(item => {
    const role = item.querySelector('.work-role');
    const terminal = item.querySelector('.terminal-out');
    const typedEl = terminal.querySelector('.typed');
    let typeTimer = null;
    let charIndex = 0;
    let locked = false;

    function openAndType() {
        clearInterval(typeTimer);
        const text = role.dataset.info;
        charIndex = 0;
        typedEl.textContent = '';
        terminal.style.height = '28px';
        item.classList.add('open');

        typeTimer = setInterval(() => {
            if (charIndex < text.length) {
                typedEl.textContent += text[charIndex];
                charIndex++;
            } else {
                clearInterval(typeTimer);
                typeTimer = null;
            }
        }, 25);
    }

    function close() {
        clearInterval(typeTimer);
        typeTimer = null;
        typedEl.textContent = '';
        terminal.style.height = '0';
        item.classList.remove('open');
    }

    role.addEventListener('mouseenter', () => {
        if (!locked && document.body.classList.contains('ready')) {
            locked = true;
            openAndType();
        }
    });

    role.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') return;
        if (locked) {
            locked = false;
            close();
        }
    });
});

// ===== NNSA inline graph =====
let graphRendered = false;
const graphInline = document.getElementById('graphInline');
const nnsaItem = document.getElementById('nnsa-item');

// Watch for NNSA opening — show graph after text types
const nnsaObserver = new MutationObserver(() => {
    if (nnsaItem.classList.contains('open')) {
        setTimeout(() => {
            graphInline.classList.add('active');
            if (!graphRendered) {
                graphRendered = true;
                loadMiniGraph();
            }
        }, 800);
    } else {
        graphInline.classList.remove('active');
    }
});
nnsaObserver.observe(nnsaItem, { attributes: true, attributeFilter: ['class'] });

function loadMiniGraph() {
    fetch('tedai/ontology.json')
        .then(r => r.json())
        .then(raw => {
            const topIds = new Set(['Attribute', 'Trustworthy', 'Effective', 'Deployable']);
            const allEdges = raw.edges || [];
            allEdges.forEach(e => {
                if (topIds.has(e.source)) topIds.add(e.target);
            });

            const keepIds = new Set();
            for (const id of topIds) {
                keepIds.add(id);
                if (keepIds.size >= 18) break;
            }

            const nodes = (raw.nodes || [])
                .filter(n => keepIds.has(n.id))
                .map(n => ({
                    id: n.id,
                    label: n.label || n.id,
                    description: n.description || n.definition || ''
                }));

            const links = allEdges
                .filter(e => keepIds.has(e.source) && keepIds.has(e.target))
                .map(e => ({
                    source: e.source,
                    target: e.target,
                    relationship: Array.isArray(e.relationship) ? e.relationship.join(', ') : e.relationship
                }));

            renderMiniGraph({ nodes, links });
        });
}

function renderMiniGraph(data) {
    const container = document.getElementById('graphInline');
    const w = container.clientWidth || 860;
    const h = 300;

    const svg = d3.select('#miniGraph')
        .attr('width', w)
        .attr('height', h);

    const g = svg.append('g');
    const tooltip = document.getElementById('graph-tooltip');

    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(w / 2, h / 2))
        .force('x', d3.forceX(w / 2).strength(0.05))
        .force('y', d3.forceY(h / 2).strength(0.1));

    const link = g.append('g').selectAll('line')
        .data(data.links).enter().append('line')
        .attr('stroke', '#ccc').attr('stroke-width', 0.5)
        .attr('opacity', 0);

    const node = g.append('g').selectAll('circle')
        .data(data.nodes).enter().append('circle')
        .attr('r', 7)
        .attr('fill', '#2a5db0')
        .attr('opacity', 0)
        .call(d3.drag()
            .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
        )
        .on('mouseover', (event, d) => {
            tooltip.innerHTML = '<strong>' + d.label + '</strong>' + (d.description ? '<br>' + d.description : '');
            tooltip.style.visibility = 'visible';
        })
        .on('mousemove', (event) => {
            tooltip.style.top = (event.clientY + 12) + 'px';
            tooltip.style.left = (event.clientX + 12) + 'px';
        })
        .on('mouseout', () => { tooltip.style.visibility = 'hidden'; });

    const label = g.append('g').selectAll('text')
        .data(data.nodes).enter().append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-size', '7px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .attr('opacity', 0)
        .text(d => d.label);

    // Animated entrance
    node.each(function(d, i) {
        d3.select(this).transition().delay(i * 30).duration(400).attr('opacity', 0.85);
    });
    label.each(function(d, i) {
        d3.select(this).transition().delay(i * 30).duration(400).attr('opacity', 1);
    });
    link.each(function(d, i) {
        d3.select(this).transition().delay(i * 15).duration(300).attr('opacity', 1);
    });

    svg.call(d3.zoom().on('zoom', (e) => g.attr('transform', e.transform)));

    simulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('cx', d => d.x).attr('cy', d => d.y);
        label.attr('x', d => d.x).attr('y', d => d.y + 18);
    });
}

// ===== Fullscreen overlay graph =====
function renderOverlayGraph() {
    fetch('tedai/ontology.json')
        .then(r => r.json())
        .then(raw => {
            const nodes = (raw.nodes || []).map(n => ({
                id: n.id,
                label: n.label || n.id,
                description: n.description || n.definition || ''
            }));
            const links = (raw.edges || []).map(e => ({
                source: e.source,
                target: e.target,
                relationship: Array.isArray(e.relationship) ? e.relationship : [e.relationship || 'related_to']
            }));

            const panel = document.querySelector('.overlay-panel');
            const w = panel.clientWidth;
            const h = panel.clientHeight;

            const svg = d3.select('#overlayGraph')
                .attr('width', w)
                .attr('height', h);

            const g = svg.append('g');
            const tooltip = document.getElementById('graph-tooltip');

            let oNodeColor = '#2a5db0';
            let oEdgeColor = '#aaaaaa';

            const simulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(links).id(d => d.id).distance(90))
                .force('charge', d3.forceManyBody().strength(-200))
                .force('center', d3.forceCenter(w / 2, h / 2));

            const link = g.append('g').selectAll('line')
                .data(links).enter().append('line')
                .attr('stroke', oEdgeColor).attr('stroke-width', 0.5)
                .attr('opacity', 0);

            const edgeLabel = g.append('g').selectAll('text')
                .data(links).enter().append('text')
                .attr('class', 'o-edge-label')
                .text(d => d.relationship.join(', '))
                .attr('text-anchor', 'middle')
                .attr('font-size', '7px')
                .attr('fill', oEdgeColor)
                .attr('font-family', 'IBM Plex Mono, monospace')
                .attr('pointer-events', 'none')
                .attr('opacity', 0);

            const node = g.append('g').selectAll('circle')
                .data(nodes).enter().append('circle')
                .attr('r', 10)
                .attr('fill', oNodeColor)
                .attr('opacity', 0)
                .call(d3.drag()
                    .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                    .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
                    .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
                )
                .on('mouseover', (event, d) => {
                    tooltip.innerHTML = '<strong>' + d.label + '</strong>' + (d.description ? '<br>' + d.description : '');
                    tooltip.style.visibility = 'visible';
                })
                .on('mousemove', (event) => {
                    tooltip.style.top = (event.clientY + 12) + 'px';
                    tooltip.style.left = (event.clientX + 12) + 'px';
                })
                .on('mouseout', () => { tooltip.style.visibility = 'hidden'; });

            const label = g.append('g').selectAll('text')
                .data(nodes).enter().append('text')
                .attr('text-anchor', 'middle')
                .attr('fill', '#666')
                .attr('font-size', '8px')
                .attr('font-family', 'IBM Plex Mono, monospace')
                .attr('pointer-events', 'none')
                .attr('opacity', 0)
                .text(d => d.label);

            // Staggered fade-in
            node.each(function(d, i) {
                d3.select(this).transition().delay(i * 25).duration(400).attr('opacity', 0.85);
            });
            label.each(function(d, i) {
                d3.select(this).transition().delay(i * 25).duration(400).attr('opacity', 1);
            });
            link.each(function(d, i) {
                d3.select(this).transition().delay(i * 12).duration(300).attr('opacity', 1);
            });
            edgeLabel.each(function(d, i) {
                d3.select(this).transition().delay(i * 12).duration(300).attr('opacity', 1);
            });

            svg.call(d3.zoom().on('zoom', (e) => g.attr('transform', e.transform)));

            simulation.on('tick', () => {
                link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
                node.attr('cx', d => d.x).attr('cy', d => d.y);
                label.attr('x', d => d.x).attr('y', d => d.y + 20);
                edgeLabel.attr('x', d => (d.source.x + d.target.x) / 2)
                    .attr('y', d => (d.source.y + d.target.y) / 2 - 6);
            });

            // Color controls
            document.getElementById('oNodeColor').addEventListener('input', (e) => {
                oNodeColor = e.target.value;
                node.attr('fill', oNodeColor);
                document.querySelectorAll('.o-filter-btn.active').forEach(b => {
                    b.style.backgroundColor = oNodeColor;
                    b.style.borderColor = oNodeColor;
                });
            });

            document.getElementById('oEdgeColor').addEventListener('input', (e) => {
                oEdgeColor = e.target.value;
                link.attr('stroke', oEdgeColor);
                edgeLabel.attr('fill', oEdgeColor);
            });

            // Filters
            const relationships = new Set();
            links.forEach(l => l.relationship.forEach(r => relationships.add(r)));

            const filterContainer = document.getElementById('overlayFilters');
            const allBtn = document.createElement('button');
            allBtn.textContent = 'Show All';
            allBtn.className = 'o-filter-btn active';
            allBtn.dataset.rel = 'all';
            filterContainer.appendChild(allBtn);

            relationships.forEach(rel => {
                const btn = document.createElement('button');
                btn.textContent = rel;
                btn.className = 'o-filter-btn';
                btn.dataset.rel = rel;
                filterContainer.appendChild(btn);
            });

            let activeFilters = new Set(['all']);

            filterContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.o-filter-btn');
                if (!btn) return;
                const rel = btn.dataset.rel;

                if (rel === 'all') {
                    filterContainer.querySelectorAll('.o-filter-btn').forEach(b => { b.classList.remove('active'); b.style.backgroundColor = ''; b.style.borderColor = ''; b.style.color = ''; });
                    btn.classList.add('active');
                    activeFilters = new Set(['all']);
                } else {
                    btn.classList.toggle('active');
                    if (btn.classList.contains('active')) {
                        activeFilters.add(rel);
                        activeFilters.delete('all');
                        filterContainer.querySelector('[data-rel="all"]').classList.remove('active');
                        filterContainer.querySelector('[data-rel="all"]').style.backgroundColor = '';
                    } else {
                        activeFilters.delete(rel);
                    }
                    if (activeFilters.size === 0) {
                        activeFilters = new Set(['all']);
                        filterContainer.querySelector('[data-rel="all"]').classList.add('active');
                    }
                }

                // Style active buttons
                filterContainer.querySelectorAll('.o-filter-btn').forEach(b => {
                    if (b.classList.contains('active')) {
                        b.style.backgroundColor = oNodeColor;
                        b.style.borderColor = oNodeColor;
                        b.style.color = '#fff';
                    } else {
                        b.style.backgroundColor = '';
                        b.style.borderColor = '';
                        b.style.color = '';
                    }
                });

                // Apply filter
                const filters = [...activeFilters];
                if (filters.includes('all')) {
                    link.style('opacity', 1);
                    node.style('opacity', 0.85);
                    label.style('opacity', 1);
                    edgeLabel.style('opacity', 1).attr('fill', oEdgeColor);
                } else {
                    const connectedIds = new Set();
                    link.each(function(d) {
                        if (d.relationship.some(r => filters.includes(r))) {
                            connectedIds.add(d.source.id || d.source);
                            connectedIds.add(d.target.id || d.target);
                        }
                    });
                    link.each(function(d) {
                        const match = d.relationship.some(r => filters.includes(r));
                        d3.select(this).style('opacity', match ? 1 : 0.08);
                    });
                    node.each(function(d) { d3.select(this).style('opacity', connectedIds.has(d.id) ? 0.85 : 0.1); });
                    label.each(function(d) { if (d) d3.select(this).style('opacity', connectedIds.has(d.id) ? 1 : 0.1); });
                    edgeLabel.each(function(d) {
                        const match = d.relationship.some(r => filters.includes(r));
                        d3.select(this).style('opacity', match ? 1 : 0.05).attr('fill', match ? '#333' : oEdgeColor);
                    });
                }
            });
        });
}

// ===== Overlay open/close =====
document.addEventListener('DOMContentLoaded', () => {
    const graphOverlay = document.getElementById('graphOverlay');
    const overlayBackdrop = document.getElementById('overlayBackdrop');
    const overlayClose = document.getElementById('overlayClose');
    const expandBtn = document.getElementById('expandBtn');

    expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        d3.select('#overlayGraph').selectAll('*').remove();
        document.getElementById('overlayFilters').innerHTML = '';
        graphOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderOverlayGraph();
    });

    overlayClose.addEventListener('click', closeOverlay);
    overlayBackdrop.addEventListener('click', closeOverlay);

    function closeOverlay() {
        const totalNodes = d3.select('#overlayGraph').selectAll('circle').size();
        d3.select('#overlayGraph').selectAll('circle')
            .each(function(d, i) {
                d3.select(this).transition().delay(i * 15).duration(300)
                    .attr('opacity', 0)
                    .attr('r', 0);
            });
        d3.select('#overlayGraph').selectAll('text')
            .each(function(d, i) {
                d3.select(this).transition().delay(i * 15).duration(300)
                    .attr('opacity', 0)
                    .attr('font-size', '0px');
            });
        d3.select('#overlayGraph').selectAll('line')
            .each(function(d, i) {
                d3.select(this).transition().delay(i * 8).duration(200)
                    .attr('opacity', 0);
            });

        const fadeTime = Math.max(totalNodes * 15 + 250, 800);
        setTimeout(() => {
            graphOverlay.classList.remove('active');
            document.body.style.overflow = '';

            // Re-animate mini graph
            d3.select('#miniGraph').selectAll('circle')
                .attr('opacity', 0)
                .each(function(d, i) {
                    d3.select(this).transition().delay(i * 30).duration(400).attr('opacity', 0.85);
                });
            d3.select('#miniGraph').selectAll('text')
                .attr('opacity', 0)
                .each(function(d, i) {
                    d3.select(this).transition().delay(i * 30).duration(400).attr('opacity', 1);
                });
            d3.select('#miniGraph').selectAll('line')
                .attr('opacity', 0)
                .each(function(d, i) {
                    d3.select(this).transition().delay(i * 15).duration(300).attr('opacity', 1);
                });
        }, fadeTime);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && graphOverlay.classList.contains('active')) closeOverlay();
    });
});
