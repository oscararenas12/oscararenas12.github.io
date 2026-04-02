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

function getCenterOffset() {
    const headerRect = header.getBoundingClientRect();
    const headerCenter = headerRect.top + headerRect.height / 2;
    const viewportCenter = window.innerHeight / 2;
    return viewportCenter - headerCenter;
}

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
        document.documentElement.classList.add('ready');
    }, delay + 200);
}

// ===== Experience hover/click terminal (B1, B2 fixed) =====
const isTouch = 'ontouchstart' in window;
const allWorkItems = document.querySelectorAll('.work-item');

function closeAllWorkItems() {
    allWorkItems.forEach(item => {
        const terminal = item.querySelector('.terminal-out');
        const typedEl = terminal.querySelector('.typed');
        clearInterval(item._typeTimer);
        item._typeTimer = null;
        typedEl.textContent = '';
        terminal.style.height = '0';
        item.classList.remove('open');
        item._locked = false;
    });
}

allWorkItems.forEach(item => {
    const role = item.querySelector('.work-role');
    const terminal = item.querySelector('.terminal-out');
    const typedEl = terminal.querySelector('.typed');
    item._typeTimer = null;
    item._locked = false;

    function openAndType() {
        clearInterval(item._typeTimer);
        const text = role.dataset.info;
        let charIndex = 0;
        typedEl.textContent = '';
        terminal.style.height = '28px';
        item.classList.add('open');

        item._typeTimer = setInterval(() => {
            if (charIndex < text.length) {
                typedEl.textContent += text[charIndex];
                charIndex++;
            } else {
                clearInterval(item._typeTimer);
                item._typeTimer = null;
            }
        }, 25);
    }

    function close() {
        clearInterval(item._typeTimer);
        item._typeTimer = null;
        typedEl.textContent = '';
        terminal.style.height = '0';
        item.classList.remove('open');
        item._locked = false;
    }

    if (isTouch) {
        // Touch devices: tap to toggle (B1 fix)
        role.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            if (item._locked) {
                close();
            } else {
                item._locked = true;
                openAndType();
            }
        });
    } else {
        // Desktop: hover opens, click closes
        role.addEventListener('mouseenter', () => {
            if (!item._locked && document.body.classList.contains('ready')) {
                item._locked = true;
                openAndType();
            }
        });

        role.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            if (item._locked) {
                close();
            }
        });
    }
});

// ===== NNSA inline graph (B3, B4 fixed) =====
let graphRendered = false;
const graphInline = document.getElementById('graphInline');
const nnsaItem = document.getElementById('nnsa-item');
let miniSimulation = null;

const nnsaObserver = new MutationObserver(() => {
    if (nnsaItem.classList.contains('open')) {
        setTimeout(() => {
            graphInline.classList.add('active');
            if (!graphRendered) {
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
        .then(r => {
            if (!r.ok) throw new Error('Failed to load ontology data');
            return r.json();
        })
        .then(raw => {
            graphRendered = true; // B4: set after successful load
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
        })
        .catch(() => {
            // B3: graceful failure
            graphRendered = false;
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

    miniSimulation = d3.forceSimulation(data.nodes)
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
            .on('start', (e, d) => { if (!e.active) miniSimulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on('end', (e, d) => { if (!e.active) miniSimulation.alphaTarget(0); d.fx = null; d.fy = null; })
        )
        .on('mouseover', (event, d) => {
            // S1: use textContent instead of innerHTML
            tooltip.textContent = d.label + (d.description ? ' — ' + d.description : '');
            tooltip.style.visibility = 'visible';
        })
        .on('mousemove', (event) => {
            // B12: clamp tooltip to viewport
            const x = Math.min(event.clientX + 12, window.innerWidth - 240);
            const y = Math.min(event.clientY + 12, window.innerHeight - 60);
            tooltip.style.top = y + 'px';
            tooltip.style.left = x + 'px';
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

    miniSimulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('cx', d => d.x).attr('cy', d => d.y);
        label.attr('x', d => d.x).attr('y', d => d.y + 18);
    });
}

// ===== Fullscreen overlay graph (B5, B6, B7, B9, B13, S1 fixed) =====
let overlaySimulation = null;
let isOverlayOpen = false;
let isClosing = false;
let closeTimeout = null;
let colorListenersAttached = false;
let currentOverlayState = { nodeColor: '#2a5db0', edgeColor: '#aaaaaa' };

function renderOverlayGraph() {
    fetch('tedai/ontology.json')
        .then(r => {
            if (!r.ok) throw new Error('Failed to load');
            return r.json();
        })
        .then(raw => {
            // Guard: if overlay was closed while fetch was in flight
            if (!isOverlayOpen) return;

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

            currentOverlayState.nodeColor = '#2a5db0';
            currentOverlayState.edgeColor = '#aaaaaa';

            overlaySimulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(links).id(d => d.id).distance(90))
                .force('charge', d3.forceManyBody().strength(-200))
                .force('center', d3.forceCenter(w / 2, h / 2));

            const link = g.append('g').selectAll('line')
                .data(links).enter().append('line')
                .attr('stroke', currentOverlayState.edgeColor).attr('stroke-width', 0.5)
                .attr('opacity', 0);

            const edgeLabel = g.append('g').selectAll('text')
                .data(links).enter().append('text')
                .attr('class', 'o-edge-label')
                .text(d => d.relationship.join(', '))
                .attr('text-anchor', 'middle')
                .attr('font-size', '7px')
                .attr('fill', currentOverlayState.edgeColor)
                .attr('font-family', 'IBM Plex Mono, monospace')
                .attr('pointer-events', 'none')
                .attr('opacity', 0);

            const node = g.append('g').selectAll('circle')
                .data(nodes).enter().append('circle')
                .attr('r', 10)
                .attr('fill', currentOverlayState.nodeColor)
                .attr('opacity', 0)
                .call(d3.drag()
                    .on('start', (e, d) => { if (!e.active) overlaySimulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                    .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
                    .on('end', (e, d) => { if (!e.active) overlaySimulation.alphaTarget(0); d.fx = null; d.fy = null; })
                )
                .on('mouseover', (event, d) => {
                    // S1: textContent instead of innerHTML
                    tooltip.textContent = d.label + (d.description ? ' — ' + d.description : '');
                    tooltip.style.visibility = 'visible';
                })
                .on('mousemove', (event) => {
                    const x = Math.min(event.clientX + 12, window.innerWidth - 240);
                    const y = Math.min(event.clientY + 12, window.innerHeight - 60);
                    tooltip.style.top = y + 'px';
                    tooltip.style.left = x + 'px';
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

            overlaySimulation.on('tick', () => {
                link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
                node.attr('cx', d => d.x).attr('cy', d => d.y);
                label.attr('x', d => d.x).attr('y', d => d.y + 20);
                edgeLabel.attr('x', d => (d.source.x + d.target.x) / 2)
                    .attr('y', d => (d.source.y + d.target.y) / 2 - 6);
            });

            // B9: attach color listeners only once
            if (!colorListenersAttached) {
                colorListenersAttached = true;
                document.getElementById('oNodeColor').addEventListener('input', (e) => {
                    currentOverlayState.nodeColor = e.target.value;
                    d3.select('#overlayGraph').selectAll('circle').attr('fill', e.target.value);
                    document.querySelectorAll('.o-filter-btn.active').forEach(b => {
                        b.style.backgroundColor = e.target.value;
                        b.style.borderColor = e.target.value;
                    });
                });

                document.getElementById('oEdgeColor').addEventListener('input', (e) => {
                    currentOverlayState.edgeColor = e.target.value;
                    d3.select('#overlayGraph').selectAll('line').attr('stroke', e.target.value);
                    d3.select('#overlayGraph').selectAll('.o-edge-label').attr('fill', e.target.value);
                });
            }

            // Reset color picker values
            document.getElementById('oNodeColor').value = '#2a5db0';
            document.getElementById('oEdgeColor').value = '#aaaaaa';

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

                const nc = currentOverlayState.nodeColor;
                const ec = currentOverlayState.edgeColor;
                filterContainer.querySelectorAll('.o-filter-btn').forEach(b => {
                    if (b.classList.contains('active')) {
                        b.style.backgroundColor = nc;
                        b.style.borderColor = nc;
                        b.style.color = '#fff';
                    } else {
                        b.style.backgroundColor = '';
                        b.style.borderColor = '';
                        b.style.color = '';
                    }
                });

                const filters = [...activeFilters];
                if (filters.includes('all')) {
                    link.style('opacity', 1);
                    node.style('opacity', 0.85);
                    label.style('opacity', 1);
                    edgeLabel.style('opacity', 1).attr('fill', ec);
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
                        d3.select(this).style('opacity', match ? 1 : 0.05).attr('fill', match ? '#333' : ec);
                    });
                }
            });
        })
        .catch(() => {
            // B3: graceful failure for overlay
        });
}

// ===== Overlay open/close (B5, B6, B7 fixed) =====
document.addEventListener('DOMContentLoaded', () => {
    const graphOverlay = document.getElementById('graphOverlay');
    const overlayBackdrop = document.getElementById('overlayBackdrop');
    const overlayClose = document.getElementById('overlayClose');
    const expandBtn = document.getElementById('expandBtn');

    expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // B5: prevent opening if already open or closing
        if (isOverlayOpen || isClosing) return;
        // B8: only allow after loading completes
        if (!document.body.classList.contains('ready')) return;

        // B6: cancel any pending close timeout
        if (closeTimeout) {
            clearTimeout(closeTimeout);
            closeTimeout = null;
        }

        isOverlayOpen = true;
        d3.select('#overlayGraph').selectAll('*').remove();
        document.getElementById('overlayFilters').innerHTML = '';
        graphOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderOverlayGraph();
    });

    overlayClose.addEventListener('click', closeOverlay);
    overlayBackdrop.addEventListener('click', closeOverlay);

    function closeOverlay() {
        // B7: prevent duplicate close calls
        if (!isOverlayOpen || isClosing) return;
        isClosing = true;

        // B13: stop overlay simulation
        if (overlaySimulation) {
            overlaySimulation.stop();
            overlaySimulation = null;
        }

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
        closeTimeout = setTimeout(() => {
            graphOverlay.classList.remove('active');
            document.body.style.overflow = '';
            isOverlayOpen = false;
            isClosing = false;
            closeTimeout = null;

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
        // B7: check isClosing to prevent duplicate
        if (e.key === 'Escape' && isOverlayOpen && !isClosing) closeOverlay();
    });
});
