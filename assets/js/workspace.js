/* Modern single-workspace navigation. Existing application forms and IDs remain intact. */
(() => {
  const main = document.querySelector('.dashboard-container');
  const nav = document.getElementById('workspaceNav');
  const host = document.getElementById('workspacePanels');
  if (!main || !nav || !host) return;

  const pages = {
    overview: { title: 'Overview', nodes: [] },
    students: { title: 'Students', nodes: [] },
    meals: { title: 'Meals', nodes: [] },
    billing: { title: 'Fees & Reports', nodes: [] },
    leave: { title: 'Leave Management', nodes: [] },
    mealreport: { title: 'Meal Report', nodes: [] },
    accounts: { title: 'Accounts', nodes: [] }
  };

  const overview = main.querySelector('.pro-overview');
  if (overview) pages.overview.nodes.push(overview);

  const sections = [...main.querySelectorAll(':scope > .content-section')];
  sections.forEach(section => {
    const heading = (section.querySelector('h2')?.textContent || '').toLowerCase();
    let key = 'meals';
    if (heading.includes('add student') || heading === '👨‍🎓 students' || heading.includes('students')) key = 'students';
    if (heading.includes('leave')) key = 'leave';
    if (heading.includes('monthly meal attendance') || heading.includes('meal history')) key = 'meals';
    if (heading.includes('monthly final report') || heading.includes('student monthly details')) key = 'billing';
    pages[key].nodes.push(section);
  });

  Object.entries(pages).forEach(([key, page]) => {
    const panel = document.createElement('section');
    panel.className = 'workspace-panel';
    panel.dataset.panel = key;
    if (key === 'overview') panel.classList.add('is-active');
    page.nodes.forEach(node => panel.appendChild(node));
    if (key === 'leave') {
      const portal = document.createElement('a');
      portal.className = 'workspace-portal-link';
      portal.href = 'student-leave.html';
      portal.innerHTML = '<span>🎓</span><span><strong>Student Leave Portal</strong><small>Open the student-facing leave application page</small></span><span class="portal-arrow">↗</span>';
      panel.appendChild(portal);
    }
    if (key === 'mealreport' || key === 'accounts') {
      const frame = document.createElement('iframe');
      frame.className = 'workspace-frame';
      frame.title = key === 'mealreport' ? 'Meal Report' : 'Expense and Profit';
      frame.src = key === 'mealreport' ? 'mealreport.html' : 'kharach-profit.html';
      frame.loading = 'lazy';
      panel.appendChild(frame);
    }
    host.appendChild(panel);
  });

  function activate(key) {
    nav.querySelectorAll('.workspace-tab').forEach(btn => {
      const active = btn.dataset.page === key;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.setAttribute('role', 'tab');
    });
    host.querySelectorAll('.workspace-panel').forEach(panel => {
      panel.classList.toggle('is-active', panel.dataset.panel === key);
    });
    const panel = host.querySelector(`[data-panel="${key}"]`);
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  nav.querySelectorAll('.workspace-tab').forEach(btn => btn.addEventListener('click', () => activate(btn.dataset.page)));
  nav.setAttribute('role', 'tablist');
})();
