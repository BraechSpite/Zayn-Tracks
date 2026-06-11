document.addEventListener('DOMContentLoaded', () => {
    // ============ SCROLL ANIMATIONS ============
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, observerOptions);
    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

    // ============ SMOOTH SCROLL ============
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                document.getElementById('sidebarMenu').classList.remove('active');
                document.getElementById('sidebarOverlay').classList.remove('active');
            }
        });
    });

    // ============ SIDEBAR TOGGLE ============
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebarMenu = document.getElementById('sidebarMenu');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        sidebarMenu.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }
    hamburgerBtn.addEventListener('click', toggleSidebar);
    closeSidebar.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    // ============ BACKGROUND FADING PER SECTION ============
    const contentSections = document.querySelectorAll('.content-section');
    const sectionBackgrounds = document.querySelectorAll('.section-background');
    const heroSection = document.querySelector('.hero');
    // NOTE: full updateBackgrounds logic below replaces old opacity approach

    if (contentSections.length > 0 && sectionBackgrounds.length > 0) {
        const updateBackgrounds = () => {
            const scrollPosition = window.scrollY;
            const windowHeight = window.innerHeight;

            // Hide all when well inside hero (top 30% of scroll into hero)
            let heroBottom = 0;
            if (heroSection) heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
            if (scrollPosition < heroBottom - windowHeight * 0.85) {
                sectionBackgrounds.forEach(bg => bg.classList.remove('active'));
                return;
            }

            // Find most visible section
            let activeSection = null;
            let maxVisibility = 0;
            contentSections.forEach((section, index) => {
                const rect = section.getBoundingClientRect();
                const visibleTop = Math.max(0, Math.min(rect.height, windowHeight - rect.top));
                const visibleBottom = Math.max(0, Math.min(rect.height, rect.bottom));
                const visibility = Math.min(visibleTop, visibleBottom);
                if (visibility > maxVisibility) { maxVisibility = visibility; activeSection = index; }
            });

            // .active class drives opacity via CSS — no inline styles
            sectionBackgrounds.forEach((bg, index) => {
                if (index === activeSection && activeSection !== null) {
                    bg.classList.add('active');
                } else {
                    bg.classList.remove('active');
                }
            });
        };

        window.addEventListener('scroll', updateBackgrounds, { passive: true });
        updateBackgrounds();
    }

    // ============ READING PROGRESS BAR ============
    const progressBar = document.getElementById('readingProgress');
    window.addEventListener('scroll', () => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight - windowHeight;
        const scrolled = window.pageYOffset;
        progressBar.style.width = ((scrolled / documentHeight) * 100) + '%';
    });

    // ==========================================
    // ============ DASHBOARD & DATA LOGIC ============
    // ==========================================
    
    const STORAGE_PREFIX = 'zaynTracks_';
    let sectionChart, weeklyChart;

    function getTodayString() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function getLocalDateString(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function loadDataForDate(dateStr) {
        return JSON.parse(localStorage.getItem(STORAGE_PREFIX + dateStr)) || {};
    }

    function saveCurrentState(dateStr) {
        const data = loadDataForDate(dateStr);
        document.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb => { data[cb.dataset.id] = cb.checked; });
        document.querySelectorAll('textarea[data-id]').forEach(ta => { data[ta.dataset.id] = ta.value; });
        localStorage.setItem(STORAGE_PREFIX + dateStr, JSON.stringify(data));
        updateDashboardStats(dateStr);
        updateCharts(dateStr);
        renderQuickTasks(dateStr);
    }

    function loadDateIntoDOM(dateStr) {
        const data = loadDataForDate(dateStr);
        document.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb => { cb.checked = !!data[cb.dataset.id]; });
        document.querySelectorAll('textarea[data-id]').forEach(ta => { ta.value = data[ta.dataset.id] || ''; });
        updateDashboardStats(dateStr);
        updateCharts(dateStr);
        renderQuickTasks(dateStr);
    }

    function updateDashboardStats(dateStr) {
        const data = loadDataForDate(dateStr);
        let totalPoints = 0, earnedPoints = 0, totalTasks = 0, completedTasks = 0;

        document.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb => {
            const pts = parseInt(cb.dataset.points) || 0;
            totalPoints += pts; totalTasks++;
            if (cb.checked) { earnedPoints += pts; completedTasks++; }
        });

        document.querySelectorAll('textarea[data-id]').forEach(ta => {
            const pts = parseInt(ta.dataset.points) || 50;
            totalPoints += pts; totalTasks++;
            if (ta.value.trim().length > 10) { earnedPoints += pts; completedTasks++; }
        });

        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        document.getElementById('todayScore').textContent = earnedPoints;
        document.getElementById('tasksCompleted').textContent = `${completedTasks}/${totalTasks}`;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
        
        let streak = 0;
        let checkDate = new Date();
        while (true) {
            const dStr = getLocalDateString(checkDate);
            const dData = loadDataForDate(dStr);
            const dTasks = Object.keys(dData).filter(k => typeof dData[k] === 'boolean' && dData[k]).length;
            if (dTasks > 0) { streak++; checkDate.setDate(checkDate.getDate() - 1); } else { break; }
        }
        document.getElementById('streakDays').textContent = streak;
    }

    function initCharts() {
        const sectionCtx = document.getElementById('sectionChart').getContext('2d');
        const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');

        Chart.defaults.color = '#e8e3d5';
        Chart.defaults.font.family = "'Audiowide', sans-serif";
        Chart.defaults.font.size = 10;

        // PIE CHART - Yellow, Red, Blue, White, Green, Purple
        sectionChart = new Chart(sectionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Spiritual', 'Academic', 'Financial', 'Physical', 'Responsibility'],
                datasets: [{
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: ['#FFD700', '#cf193f', '#0056a6', '#FFFFFF', '#28a745', '#9b59b6'],
                    borderColor: '#0a0a0a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 10 } } } }
            }
        });

        weeklyChart = new Chart(weeklyCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Score',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(0, 86, 166, 0.6)',
                    borderColor: '#0056a6',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 1000, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 9 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 9 } } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function updateCharts(dateStr) {
        const data = loadDataForDate(dateStr);
        const sections = { spiritual: 0, academic: 0, financial: 0, physical: 0, responsibility: 0 };
        
        document.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb => {
            if (cb.checked) {
                const sec = cb.dataset.section;
                if (sections[sec] !== undefined) sections[sec] += parseInt(cb.dataset.points) || 0;
            }
        });
        document.querySelectorAll('textarea[data-id]').forEach(ta => {
            if (ta.value.trim().length > 10) sections.financial += parseInt(ta.dataset.points) || 50;
        });

        sectionChart.data.datasets[0].data = Object.values(sections);
        sectionChart.update();

        const weekData = [];
        // Get Monday of current week using local date
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - daysFromMonday);
        monday.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            const dStr = getLocalDateString(day);
            const dData = loadDataForDate(dStr);
            let score = 0;
            Object.keys(dData).forEach(key => {
                if (dData[key] === true) {
                    const el = document.querySelector(`[data-id="${key}"]`);
                    if (el) score += parseInt(el.dataset.points) || 0;
                }
                if ((key.includes('skill') || key.includes('income')) && typeof dData[key] === 'string' && dData[key].length > 10) {
                    score += 50;
                }
            });
            weekData.push(score);
        }
        weeklyChart.data.datasets[0].data = weekData;
        weeklyChart.update();
    }

    function renderQuickTasks(dateStr) {
        const grid = document.getElementById('quickTasksGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const data = loadDataForDate(dateStr);

        document.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb => {
            const item = document.createElement('div');
            item.className = `quick-task-item ${cb.checked ? 'completed' : ''}`;
            item.innerHTML = `
                <div class="qt-check">${cb.checked ? '<i class="fas fa-check" style="color:white;font-size:10px;"></i>' : ''}</div>
                <div class="qt-name">${cb.closest('.task-item').querySelector('strong').textContent}</div>
                <div class="qt-points">${cb.dataset.points} pts</div>
            `;
            item.addEventListener('click', () => {
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event('change'));
            });
            grid.appendChild(item);
        });
    }

    // ============ EVENT LISTENERS ============
    const datePicker = document.getElementById('datePicker');
    const todayBtn = document.getElementById('todayBtn');
    const todayStr = getTodayString();

    datePicker.value = todayStr;
    initCharts();
    loadDateIntoDOM(todayStr);

    document.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb => {
        cb.addEventListener('change', () => saveCurrentState(datePicker.value));
    });

    document.querySelectorAll('textarea[data-id]').forEach(ta => {
        ta.addEventListener('input', () => {
            saveCurrentState(datePicker.value);
            const indicator = ta.closest('.reflection-container')?.querySelector('.auto-save-indicator');
            if (indicator) {
                indicator.textContent = 'Saved!';
                indicator.style.color = '#0056a6';
                setTimeout(() => { indicator.textContent = 'Auto-saving...'; indicator.style.color = 'rgba(232, 227, 213, 0.5)'; }, 1000);
            }
        });
    });

    datePicker.addEventListener('change', (e) => loadDateIntoDOM(e.target.value));
    todayBtn.addEventListener('click', () => { datePicker.value = todayStr; loadDateIntoDOM(todayStr); });

    console.log('🎨 Zayn Tracks loaded! All data stored locally per date.');
});