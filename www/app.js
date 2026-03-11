// ===================================
// أذكار المسلم - الكود الرئيسي
// ===================================

(function() {
    'use strict';

    // ==========================================
    // المتغيرات العامة
    // ==========================================
    const App = {
        currentPage: 'home',
        currentCategory: null,
        settings: {
            darkMode: false,
            fontSize: 'medium',
            tasbihSound: true,
            tasbihVibrate: true,
            morningReminder: false,
            eveningReminder: false
        },
        tasbih: {
            count: 0,
            target: 33,
            currentText: 'سبحان الله',
            session: 0,
            today: 0,
            allTime: 0
        },
        stats: {
            totalAzkar: 0,
            streakDays: 0,
            lastActiveDate: null,
            completedCategories: {}
        },
        favorites: [],
        progress: {},
        audioContext: null
    };

    // ==========================================
    // التهيئة
    // ==========================================
    function init() {
        loadData();
        setupEventListeners();
        updateDateTime();
        updateSuggestion();
        updateRandomZikr();
        updateStats();
        updateProgress();
        applySettings();
        
        // إخفاء شاشة التحميل
        setTimeout(() => {
            document.getElementById('splash-screen').classList.add('hidden');
        }, 1500);

        // تحديث الوقت كل ثانية
        setInterval(updateDateTime, 1000);
        
        // تحديث الاقتراح كل دقيقة
        setInterval(updateSuggestion, 60000);

        // التحقق من يوم جديد
        checkNewDay();

        // تسجيل Service Worker
        registerServiceWorker();
    }

    // ==========================================
    // تحميل وحفظ البيانات
    // ==========================================
    function loadData() {
        try {
            const savedSettings = localStorage.getItem('azkar_settings');
            const savedTasbih = localStorage.getItem('azkar_tasbih');
            const savedStats = localStorage.getItem('azkar_stats');
            const savedFavorites = localStorage.getItem('azkar_favorites');
            const savedProgress = localStorage.getItem('azkar_progress');

            if (savedSettings) App.settings = JSON.parse(savedSettings);
            if (savedTasbih) App.tasbih = {...App.tasbih, ...JSON.parse(savedTasbih)};
            if (savedStats) App.stats = {...App.stats, ...JSON.parse(savedStats)};
            if (savedFavorites) App.favorites = JSON.parse(savedFavorites);
            if (savedProgress) App.progress = JSON.parse(savedProgress);
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }

    function saveData() {
        try {
            localStorage.setItem('azkar_settings', JSON.stringify(App.settings));
            localStorage.setItem('azkar_tasbih', JSON.stringify(App.tasbih));
            localStorage.setItem('azkar_stats', JSON.stringify(App.stats));
            localStorage.setItem('azkar_favorites', JSON.stringify(App.favorites));
            localStorage.setItem('azkar_progress', JSON.stringify(App.progress));
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }

    // ==========================================
    // إعداد مستمعي الأحداث
    // ==========================================
    function setupEventListeners() {
        // القائمة الجانبية
        document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
        document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

        // التنقل في القائمة الجانبية
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                navigateTo(page);
                closeSidebar();
            });
        });

        // التنقل السفلي
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                navigateTo(page);
            });
        });

        // بطاقات الأقسام
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                const page = card.dataset.page;
                navigateTo(page);
            });
        });

        // زر تغيير المظهر
        document.getElementById('theme-btn').addEventListener('click', toggleTheme);

        // أزرار الذكر العشوائي
        document.getElementById('refresh-zikr').addEventListener('click', updateRandomZikr);
        document.getElementById('share-random').addEventListener('click', shareRandomZikr);
        document.getElementById('copy-random').addEventListener('click', copyRandomZikr);

        // زر الاقتراح
        document.getElementById('suggestion-btn').addEventListener('click', () => {
            const suggestion = getSuggestion();
            if (suggestion.page) {
                navigateTo(suggestion.page);
            }
        });

        // إعادة تعيين الأذكار
        document.getElementById('reset-azkar').addEventListener('click', resetCurrentAzkar);

        // السبحة
        setupTasbihListeners();

        // الإعدادات
        setupSettingsListeners();

        // Modal الهدف
        setupTargetModal();

        // مشاركة التطبيق
        document.getElementById('share-app').addEventListener('click', shareApp);

        // منع السحب للخلف على iOS
        document.body.addEventListener('touchmove', (e) => {
            if (document.getElementById('sidebar').classList.contains('active')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    // ==========================================
    // التنقل بين الصفحات
    // ==========================================
    function navigateTo(page) {
        // إخفاء جميع الصفحات
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // تحديث القائمة الجانبية
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // تحديث التنقل السفلي
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });

        // تحديد الصفحة المطلوبة
        App.currentPage = page;
        let targetPage = null;
        let pageTitle = 'أذكار المسلم';

        switch(page) {
            case 'home':
                targetPage = document.getElementById('home-page');
                pageTitle = 'أذكار المسلم';
                break;
            case 'morning':
                targetPage = document.getElementById('azkar-page');
                pageTitle = 'أذكار الصباح';
                App.currentCategory = 'morning';
                renderAzkar('morning');
                break;
            case 'evening':
                targetPage = document.getElementById('azkar-page');
                pageTitle = 'أذكار المساء';
                App.currentCategory = 'evening';
                renderAzkar('evening');
                break;
            case 'sleep':
                targetPage = document.getElementById('azkar-page');
                pageTitle = 'أذكار النوم';
                App.currentCategory = 'sleep';
                renderAzkar('sleep');
                break;
            case 'wakeup':
                targetPage = document.getElementById('azkar-page');
                pageTitle = 'أذكار الاستيقاظ';
                App.currentCategory = 'wakeup';
                renderAzkar('wakeup');
                break;
            case 'prayer':
                targetPage = document.getElementById('azkar-page');
                pageTitle = 'أذكار الصلاة';
                App.currentCategory = 'prayer';
                renderAzkar('prayer');
                break;
            case 'quran':
                targetPage = document.getElementById('azkar-page');
                pageTitle = 'أدعية قرآنية';
                App.currentCategory = 'quran';
                renderAzkar('quran');
                break;
            case 'prophet':
                targetPage = document.getElementById('azkar-page');
                pageTitle = 'أدعية نبوية';
                App.currentCategory = 'prophet';
                renderAzkar('prophet');
                break;
            case 'tasbih':
                targetPage = document.getElementById('tasbih-page');
                pageTitle = 'السبحة الإلكترونية';
                updateTasbihDisplay();
                break;
            case 'favorites':
                targetPage = document.getElementById('favorites-page');
                pageTitle = 'المفضلة';
                renderFavorites();
                break;
            case 'ruqyah':
                targetPage = document.getElementById('ruqyah-page');
                pageTitle = 'الرقية الشرعية';
                renderRuqyah();
                break;
            case 'names':
                targetPage = document.getElementById('names-page');
                pageTitle = 'أسماء الله الحسنى';
                renderNames();
                break;
            case 'settings':
                targetPage = document.getElementById('settings-page');
                pageTitle = 'الإعدادات';
                break;
            case 'about':
                targetPage = document.getElementById('about-page');
                pageTitle = 'عن التطبيق';
                break;
            default:
                targetPage = document.getElementById('home-page');
        }

        if (targetPage) {
            targetPage.classList.add('active');
        }

        document.getElementById('page-title').textContent = pageTitle;
        
        // التمرير للأعلى
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ==========================================
    // القائمة الجانبية
    // ==========================================
    function toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('active');
        document.getElementById('sidebar-overlay').classList.toggle('active');
    }

    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }

    // ==========================================
    // عرض الأذكار
    // ==========================================
    function renderAzkar(category) {
        const azkarList = document.getElementById('azkar-list');
        const data = AzkarData[category];
        
        if (!data) {
            azkarList.innerHTML = '<p class="empty-message">لا توجد أذكار</p>';
            return;
        }

        // تهيئة التقدم لهذا القسم
        if (!App.progress[category]) {
            App.progress[category] = {};
        }

        let completedCount = 0;
        let html = '';

        data.forEach((zikr, index) => {
            const progress = App.progress[category][zikr.id] || 0;
            const isCompleted = progress >= zikr.count;
            if (isCompleted) completedCount++;

            const isFavorite = App.favorites.some(f => f.id === zikr.id);

            html += `
                <div class="zikr-card ${isCompleted ? 'completed' : ''}" data-id="${zikr.id}" data-category="${category}">
                    <div class="zikr-content">
                        <p class="zikr-text">${zikr.text}</p>
                        ${zikr.source ? `<div class="zikr-source">📚 ${zikr.source}</div>` : ''}
                        ${zikr.benefit ? `<div class="zikr-benefit">✨ ${zikr.benefit}</div>` : ''}
                        <div class="zikr-actions">
                            <div class="zikr-counter">
                                <button class="counter-btn minus-btn" ${progress <= 0 ? 'disabled' : ''}>-</button>
                                <div class="counter-display">
                                    <span class="counter-current">${progress}</span>
                                    <span class="counter-total">/ ${zikr.count}</span>
                                </div>
                                <button class="counter-btn plus-btn" ${isCompleted ? 'disabled' : ''}>+</button>
                            </div>
                            <div class="zikr-btns">
                                <button class="zikr-btn favorite ${isFavorite ? 'active' : ''}" title="المفضلة">
                                    ${isFavorite ? '❤️' : '🤍'}
                                </button>
                                <button class="zikr-btn copy" title="نسخ">📋</button>
                                <button class="zikr-btn share" title="مشاركة">📤</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        azkarList.innerHTML = html;

        // تحديث شريط التقدم
        document.getElementById('azkar-completed').textContent = completedCount;
        document.getElementById('azkar-total').textContent = data.length;

        // إضافة مستمعي الأحداث
        setupZikrListeners();
    }

    function setupZikrListeners() {
        // أزرار الزيادة والنقصان
        document.querySelectorAll('.zikr-card').forEach(card => {
            const id = card.dataset.id;
            const category = card.dataset.category;
            const data = AzkarData[category].find(z => z.id === id);

            card.querySelector('.plus-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                incrementZikr(id, category, data.count, card);
            });

            card.querySelector('.minus-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                decrementZikr(id, category, card);
            });

            card.querySelector('.favorite').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(id, category);
            });

            card.querySelector('.copy').addEventListener('click', (e) => {
                e.stopPropagation();
                copyZikr(data.text);
            });

            card.querySelector('.share').addEventListener('click', (e) => {
                e.stopPropagation();
                shareZikr(data.text);
            });
        });
    }

    function incrementZikr(id, category, maxCount, card) {
        if (!App.progress[category]) App.progress[category] = {};
        
        const current = App.progress[category][id] || 0;
        if (current >= maxCount) return;

        App.progress[category][id] = current + 1;
        App.stats.totalAzkar++;

        // تحديث العرض
        const display = card.querySelector('.counter-current');
        const plusBtn = card.querySelector('.plus-btn');
        const minusBtn = card.querySelector('.minus-btn');

        display.textContent = App.progress[category][id];
        minusBtn.disabled = false;

        if (App.progress[category][id] >= maxCount) {
            plusBtn.disabled = true;
            card.classList.add('completed');
            playSound('complete');
            vibrate([100, 50, 100]);
            showToast('✅ أحسنت! أكملت هذا الذكر');
        } else {
            playSound('click');
            vibrate(30);
        }

        // تحديث الإحصائيات
        updateAzkarProgress(category);
        saveData();
        updateStats();
        updateProgress();
    }

    function decrementZikr(id, category, card) {
        if (!App.progress[category] || !App.progress[category][id]) return;

        const current = App.progress[category][id];
        if (current <= 0) return;

        App.progress[category][id] = current - 1;
        App.stats.totalAzkar = Math.max(0, App.stats.totalAzkar - 1);

        const data = AzkarData[category].find(z => z.id === id);
        
        // تحديث العرض
        const display = card.querySelector('.counter-current');
        const plusBtn = card.querySelector('.plus-btn');
        const minusBtn = card.querySelector('.minus-btn');

        display.textContent = App.progress[category][id];
        plusBtn.disabled = false;
        card.classList.remove('completed');

        if (App.progress[category][id] <= 0) {
            minusBtn.disabled = true;
        }

        updateAzkarProgress(category);
        saveData();
        updateStats();
        updateProgress();
    }

    function updateAzkarProgress(category) {
        const data = AzkarData[category];
        let completed = 0;

        data.forEach(zikr => {
            const progress = App.progress[category]?.[zikr.id] || 0;
            if (progress >= zikr.count) completed++;
        });

        document.getElementById('azkar-completed').textContent = completed;

        // تحديث شارة القسم في الصفحة الرئيسية
        const badge = document.getElementById(`${category}-badge`);
        if (badge) {
            badge.textContent = `${completed}/${data.length}`;
        }
    }

    function resetCurrentAzkar() {
        if (!App.currentCategory) return;

        if (confirm('هل تريد إعادة تعيين جميع الأذكار في هذا القسم؟')) {
            App.progress[App.currentCategory] = {};
            renderAzkar(App.currentCategory);
            saveData();
            updateProgress();
            showToast('تم إعادة تعيين الأذكار');
        }
    }

    // ==========================================
    // المفضلة
    // ==========================================
    function toggleFavorite(id, category) {
        const index = App.favorites.findIndex(f => f.id === id);
        
        if (index > -1) {
            App.favorites.splice(index, 1);
            showToast('تم الإزالة من المفضلة');
        } else {
            const zikr = AzkarData[category].find(z => z.id === id);
            App.favorites.push({
                id: id,
                category: category,
                text: zikr.text,
                source: zikr.source
            });
            showToast('تمت الإضافة للمفضلة ❤️');
        }

        saveData();
        updateStats();

        // تحديث الأيقونة
        const card = document.querySelector(`.zikr-card[data-id="${id}"]`);
        if (card) {
            const btn = card.querySelector('.favorite');
            const isFav = App.favorites.some(f => f.id === id);
            btn.innerHTML = isFav ? '❤️' : '🤍';
            btn.classList.toggle('active', isFav);
        }
    }

    function renderFavorites() {
        const list = document.getElementById('favorites-list');
        const empty = document.getElementById('favorites-empty');

        if (App.favorites.length === 0) {
            list.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';

        let html = '';
        App.favorites.forEach(fav => {
            html += `
                <div class="zikr-card" data-id="${fav.id}">
                    <div class="zikr-content">
                        <p class="zikr-text">${fav.text}</p>
                        ${fav.source ? `<div class="zikr-source">📚 ${fav.source}</div>` : ''}
                        <div class="zikr-actions" style="justify-content: flex-end;">
                            <div class="zikr-btns">
                                <button class="zikr-btn remove-fav" title="إزالة">🗑️</button>
                                <button class="zikr-btn copy" title="نسخ">📋</button>
                                <button class="zikr-btn share" title="مشاركة">📤</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;

        // مستمعي الأحداث
        list.querySelectorAll('.zikr-card').forEach((card, index) => {
            const fav = App.favorites[index];

            card.querySelector('.remove-fav').addEventListener('click', () => {
                App.favorites.splice(index, 1);
                saveData();
                renderFavorites();
                updateStats();
                showToast('تم الإزالة من المفضلة');
            });

            card.querySelector('.copy').addEventListener('click', () => {
                copyZikr(fav.text);
            });

            card.querySelector('.share').addEventListener('click', () => {
                shareZikr(fav.text);
            });
        });
    }

    // ==========================================
    // الرقية الشرعية
    // ==========================================
    function renderRuqyah() {
        const list = document.getElementById('ruqyah-list');
        const data = AzkarData.ruqyah;

        let html = '';
        data.forEach(item => {
            html += `
                <div class="zikr-card">
                    <div class="zikr-content">
                        <p class="zikr-text">${item.text}</p>
                        <div class="zikr-source">📚 ${item.source}</div>
                        <div class="zikr-benefit">✨ ${item.benefit}</div>
                        <div class="zikr-actions" style="justify-content: space-between;">
                            <span class="repeat-count">التكرار: ${item.count} ${item.count > 10 ? 'مرة' : 'مرات'}</span>
                            <div class="zikr-btns">
                                <button class="zikr-btn copy" title="نسخ">📋</button>
                                <button class="zikr-btn share" title="مشاركة">📤</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;

        // مستمعي الأحداث
        list.querySelectorAll('.zikr-card').forEach((card, index) => {
            card.querySelector('.copy').addEventListener('click', () => {
                copyZikr(data[index].text);
            });
            card.querySelector('.share').addEventListener('click', () => {
                shareZikr(data[index].text);
            });
        });
    }

    // ==========================================
    // أسماء الله الحسنى
    // ==========================================
    function renderNames() {
        const grid = document.getElementById('names-grid');
        const names = AzkarData.names;

        let html = '';
        names.forEach((name, index) => {
            html += `
                <div class="name-card" data-name="${name}">
                    <div class="name-arabic">${name}</div>
                    <div class="name-number">${index + 1}</div>
                </div>
            `;
        });

        grid.innerHTML = html;

        // مستمعي الأحداث
        grid.querySelectorAll('.name-card').forEach(card => {
            card.addEventListener('click', () => {
                const name = card.dataset.name;
                showToast(`يا ${name}`);
                vibrate(30);
            });
        });
    }

    // ==========================================
    // السبحة الإلكترونية
    // ==========================================
    function setupTasbihListeners() {
        // زر السبحة الرئيسي
        const tasbihBtn = document.getElementById('tasbih-btn');
        tasbihBtn.addEventListener('click', incrementTasbih);
        tasbihBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            incrementTasbih();
        });

        // أزرار التسبيحات
        document.querySelectorAll('.tasbih-text-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tasbih-text-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                App.tasbih.currentText = btn.dataset.text;
                document.getElementById('current-tasbih-text').textContent = btn.dataset.text;
                saveData();
            });
        });

        // زر التصفير
        document.getElementById('tasbih-reset').addEventListener('click', () => {
            if (confirm('هل تريد تصفير العداد؟')) {
                App.tasbih.count = 0;
                App.tasbih.session = 0;
                updateTasbihDisplay();
                saveData();
                showToast('تم تصفير العداد');
            }
        });

        // زر الهدف
        document.getElementById('tasbih-target-btn').addEventListener('click', () => {
            document.getElementById('target-modal').classList.add('active');
        });

        // زر الصوت
        document.getElementById('tasbih-sound-btn').addEventListener('click', function() {
            App.settings.tasbihSound = !App.settings.tasbihSound;
            this.classList.toggle('active', App.settings.tasbihSound);
            saveData();
            showToast(App.settings.tasbihSound ? 'تم تفعيل الصوت 🔊' : 'تم إيقاف الصوت 🔇');
        });

        // زر الاهتزاز
        document.getElementById('tasbih-vibrate-btn').addEventListener('click', function() {
            App.settings.tasbihVibrate = !App.settings.tasbihVibrate;
            this.classList.toggle('active', App.settings.tasbihVibrate);
            saveData();
            showToast(App.settings.tasbihVibrate ? 'تم تفعيل الاهتزاز 📳' : 'تم إيقاف الاهتزاز');
        });
    }

    function incrementTasbih() {
        App.tasbih.count++;
        App.tasbih.session++;
        App.tasbih.today++;
        App.tasbih.allTime++;

        // تأثير الضغط
        const btn = document.getElementById('tasbih-btn');
        btn.classList.add('bounce');
        setTimeout(() => btn.classList.remove('bounce'), 300);

        // صوت واهتزاز
        if (App.settings.tasbihSound) playSound('click');
        if (App.settings.tasbihVibrate) vibrate(30);

        // تحقق من الوصول للهدف
        if (App.tasbih.count >= App.tasbih.target) {
            if (App.settings.tasbihSound) playSound('complete');
            if (App.settings.tasbihVibrate) vibrate([100, 50, 100, 50, 100]);
            showToast(`🎉 أحسنت! أكملت ${App.tasbih.target} تسبيحة`);
            App.tasbih.count = 0;
        }

        updateTasbihDisplay();
        saveData();
        updateStats();
    }

    function updateTasbihDisplay() {
        document.getElementById('tasbih-main-count').textContent = App.tasbih.count;
        document.getElementById('tasbih-target').textContent = App.tasbih.target;
        document.getElementById('tasbih-session').textContent = App.tasbih.session;
        document.getElementById('tasbih-today').textContent = App.tasbih.today;
        document.getElementById('tasbih-all-time').textContent = App.tasbih.allTime;
        document.getElementById('current-tasbih-text').textContent = App.tasbih.currentText;

        // تحديث الأزرار النشطة
        document.querySelectorAll('.tasbih-text-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.text === App.tasbih.currentText);
        });

        document.getElementById('tasbih-sound-btn').classList.toggle('active', App.settings.tasbihSound);
        document.getElementById('tasbih-vibrate-btn').classList.toggle('active', App.settings.tasbihVibrate);

        // تحديث شارة السبحة
        const badge = document.getElementById('tasbih-count');
        if (badge) badge.textContent = App.tasbih.today;
    }

    function setupTargetModal() {
        // خيارات الهدف
        document.querySelectorAll('.target-option').forEach(btn => {
            btn.addEventListener('click', () => {
                App.tasbih.target = parseInt(btn.dataset.target);
                App.tasbih.count = 0;
                updateTasbihDisplay();
                saveData();
                document.getElementById('target-modal').classList.remove('active');
                showToast(`تم تعيين الهدف: ${App.tasbih.target}`);
            });
        });

        // هدف مخصص
        document.getElementById('set-custom-target').addEventListener('click', () => {
            const input = document.getElementById('custom-target-input');
            const value = parseInt(input.value);
            if (value > 0 && value <= 10000) {
                App.tasbih.target = value;
                App.tasbih.count = 0;
                updateTasbihDisplay();
                saveData();
                document.getElementById('target-modal').classList.remove('active');
                showToast(`تم تعيين الهدف: ${value}`);
                input.value = '';
            } else {
                showToast('الرجاء إدخال رقم صحيح (1-10000)');
            }
        });

        // إغلاق Modal
        document.getElementById('close-target-modal').addEventListener('click', () => {
            document.getElementById('target-modal').classList.remove('active');
        });

        document.getElementById('target-modal').addEventListener('click', (e) => {
            if (e.target.id === 'target-modal') {
                document.getElementById('target-modal').classList.remove('active');
            }
        });
    }

    // ==========================================
    // الإعدادات
    // ==========================================
    function setupSettingsListeners() {
        // الوضع الليلي
        document.getElementById('dark-mode-toggle').addEventListener('change', function() {
            App.settings.darkMode = this.checked;
            applyTheme();
            saveData();
        });

        // حجم الخط
        document.getElementById('font-size-select').addEventListener('change', function() {
            App.settings.fontSize = this.value;
            applyFontSize();
            saveData();
        });

        // تذكير الصباح
        document.getElementById('morning-reminder').addEventListener('change', function() {
            App.settings.morningReminder = this.checked;
            saveData();
            if (this.checked) {
                requestNotificationPermission();
            }
        });

        // تذكير المساء
        document.getElementById('evening-reminder').addEventListener('change', function() {
            App.settings.eveningReminder = this.checked;
            saveData();
            if (this.checked) {
                requestNotificationPermission();
            }
        });

        // صوت السبحة
        document.getElementById('tasbih-sound').addEventListener('change', function() {
            App.settings.tasbihSound = this.checked;
            saveData();
        });

        // اهتزاز السبحة
        document.getElementById('tasbih-vibrate').addEventListener('change', function() {
            App.settings.tasbihVibrate = this.checked;
            saveData();
        });

        // مسح البيانات
        document.getElementById('reset-all-data').addEventListener('click', () => {
            if (confirm('هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) {
                localStorage.clear();
                location.reload();
            }
        });

        // تصدير البيانات
        document.getElementById('export-data').addEventListener('click', exportData);
    }

    function applySettings() {
        // تطبيق الثيم
        document.getElementById('dark-mode-toggle').checked = App.settings.darkMode;
        applyTheme();

        // تطبيق حجم الخط
        document.getElementById('font-size-select').value = App.settings.fontSize;
        applyFontSize();

        // تطبيق إعدادات التذكير
        document.getElementById('morning-reminder').checked = App.settings.morningReminder;
        document.getElementById('evening-reminder').checked = App.settings.eveningReminder;

        // تطبيق إعدادات السبحة
        document.getElementById('tasbih-sound').checked = App.settings.tasbihSound;
        document.getElementById('tasbih-vibrate').checked = App.settings.tasbihVibrate;
    }

    function applyTheme() {
        if (App.settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    function toggleTheme() {
        App.settings.darkMode = !App.settings.darkMode;
        applyTheme();
        document.getElementById('dark-mode-toggle').checked = App.settings.darkMode;
        saveData();
    }

    function applyFontSize() {
        document.documentElement.setAttribute('data-font-size', App.settings.fontSize);
    }

    function exportData() {
        const data = {
            settings: App.settings,
            tasbih: App.tasbih,
            stats: App.stats,
            favorites: App.favorites,
            progress: App.progress,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `azkar-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('تم تصدير البيانات بنجاح');
    }

    // ==========================================
    // التاريخ والوقت
    // ==========================================
    function updateDateTime() {
        const now = new Date();
        
        // الوقت
        const timeStr = now.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        document.getElementById('current-time').textContent = timeStr;

        // التاريخ الميلادي
        const gregorianStr = now.toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('gregorian-date').textContent = gregorianStr;

        // التاريخ الهجري
        const islamicStr = now.toLocaleDateString('ar-SA-u-ca-islamic', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        document.getElementById('islamic-date').textContent = islamicStr;

        // فترة الوقت
        const hour = now.getHours();
        let period = '';
        if (hour >= 4 && hour < 12) {
            period = '🌅 وقت الصباح';
        } else if (hour >= 12 && hour < 16) {
            period = '☀️ وقت الظهيرة';
        } else if (hour >= 16 && hour < 18) {
            period = '🌆 وقت العصر';
        } else if (hour >= 18 && hour < 20) {
            period = '🌇 وقت المغرب';
        } else {
            period = '🌙 وقت المساء';
        }
        document.getElementById('time-period').textContent = period;
    }

    // ==========================================
    // الاقتراحات
    // ==========================================
    function getSuggestion() {
        const hour = new Date().getHours();
        
        if (hour >= 4 && hour < 10) {
            return {
                text: 'حان وقت أذكار الصباح - ابدأ يومك بذكر الله',
                page: 'morning'
            };
        } else if (hour >= 16 && hour < 20) {
            return {
                text: 'حان وقت أذكار المساء - اختم يومك بالذكر',
                page: 'evening'
            };
        } else if (hour >= 21 || hour < 4) {
            return {
                text: 'لا تنس أذكار النوم قبل أن تنام',
                page: 'sleep'
            };
        } else {
            const suggestions = [
                { text: 'سبّح الله وأكثر من ذكره', page: 'tasbih' },
                { text: 'اقرأ أذكار بعد الصلاة', page: 'prayer' },
                { text: 'تعرف على أسماء الله الحسنى', page: 'names' },
                { text: 'ادع بالأدعية النبوية', page: 'prophet' },
                { text: 'اقرأ الأدعية القرآنية', page: 'quran' }
            ];
            return suggestions[Math.floor(Math.random() * suggestions.length)];
        }
    }

    function updateSuggestion() {
        const suggestion = getSuggestion();
        document.getElementById('suggestion-text').textContent = suggestion.text;
        document.getElementById('suggestion-btn').onclick = () => navigateTo(suggestion.page);
    }

    // ==========================================
    // الذكر العشوائي
    // ==========================================
    function updateRandomZikr() {
        const azkar = AzkarData.random;
        const randomIndex = Math.floor(Math.random() * azkar.length);
        document.getElementById('random-zikr').textContent = azkar[randomIndex];
        
        const btn = document.getElementById('refresh-zikr');
        btn.style.transform = 'rotate(360deg)';
        setTimeout(() => btn.style.transform = '', 300);
    }

    function shareRandomZikr() {
        const text = document.getElementById('random-zikr').textContent;
        shareZikr(text);
    }

    function copyRandomZikr() {
        const text = document.getElementById('random-zikr').textContent;
        copyZikr(text);
    }

    // ==========================================
    // الإحصائيات والتقدم
    // ==========================================
    function updateStats() {
        document.getElementById('total-azkar').textContent = App.stats.totalAzkar;
        document.getElementById('streak-days').textContent = App.stats.streakDays;
        document.getElementById('tasbih-total').textContent = App.tasbih.allTime;
        document.getElementById('favorites-count').textContent = App.favorites.length;
    }

    function updateProgress() {
        // حساب التقدم الكلي
        let totalCompleted = 0;
        let totalAzkar = 0;

        ['morning', 'evening', 'sleep', 'wakeup', 'prayer'].forEach(category => {
            const data = AzkarData[category];
            if (!data) return;
            
            totalAzkar += data.length;
            
            data.forEach(zikr => {
                const progress = App.progress[category]?.[zikr.id] || 0;
                if (progress >= zikr.count) totalCompleted++;
            });

            // تحديث شارات الأقسام
            const badge = document.getElementById(`${category}-badge`);
            if (badge) {
                let catCompleted = 0;
                data.forEach(zikr => {
                    if ((App.progress[category]?.[zikr.id] || 0) >= zikr.count) catCompleted++;
                });
                badge.textContent = `${catCompleted}/${data.length}`;
            }
        });

        // تحديث شريط التقدم اليومي
        const percentage = totalAzkar > 0 ? Math.round((totalCompleted / totalAzkar) * 100) : 0;
        document.getElementById('daily-progress-fill').style.width = `${percentage}%`;
        document.getElementById('daily-progress-text').textContent = `${percentage}% من أذكار اليوم`;
    }

    function checkNewDay() {
        const today = new Date().toDateString();
        const lastActive = App.stats.lastActiveDate;

        if (lastActive !== today) {
            // يوم جديد
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (lastActive === yesterday.toDateString()) {
                // يوم متتالي
                App.stats.streakDays++;
            } else if (lastActive) {
                // انقطعت السلسلة
                App.stats.streakDays = 1;
            } else {
                App.stats.streakDays = 1;
            }

            // إعادة تعيين الأذكار اليومية
            App.progress = {};
            App.tasbih.today = 0;
            App.tasbih.session = 0;
            App.tasbih.count = 0;

            App.stats.lastActiveDate = today;
            saveData();
        }
    }

    // ==========================================
    // المساعدات
    // ==========================================
    function copyZikr(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('تم النسخ ✅');
        }).catch(() => {
            // Fallback للأجهزة القديمة
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('تم النسخ ✅');
        });
    }

    function shareZikr(text) {
        const shareText = `${text}\n\n📿 من تطبيق أذكار المسلم`;
        
        if (navigator.share) {
            navigator.share({
                title: 'أذكار المسلم',
                text: shareText
            }).catch(() => {});
        } else {
            copyZikr(shareText);
            showToast('تم النسخ للمشاركة');
        }
    }

    function shareApp() {
        const text = `📿 تطبيق أذكار المسلم\n\nتطبيق شامل للأذكار والأدعية\n- أذكار الصباح والمساء\n- أذكار النوم والاستيقاظ\n- سبحة إلكترونية\n- والمزيد...\n\nحمّل التطبيق الآن!`;
        
        if (navigator.share) {
            navigator.share({
                title: 'أذكار المسلم',
                text: text
            }).catch(() => {});
        } else {
            copyZikr(text);
        }
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    function playSound(type) {
        if (!App.settings.tasbihSound) return;

        try {
            if (!App.audioContext) {
                App.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const oscillator = App.audioContext.createOscillator();
            const gainNode = App.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(App.audioContext.destination);

            if (type === 'click') {
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(App.audioContext.currentTime + 0.05);
            } else if (type === 'complete') {
                oscillator.frequency.value = 600;
                gainNode.gain.value = 0.15;
                oscillator.start();
                
                setTimeout(() => {
                    oscillator.frequency.value = 800;
                }, 100);
                setTimeout(() => {
                    oscillator.frequency.value = 1000;
                }, 200);
                
                oscillator.stop(App.audioContext.currentTime + 0.3);
            }
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    function vibrate(pattern) {
        if (!App.settings.tasbihVibrate) return;
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {
                console.log('Service Worker not registered');
            });
        }
    }

    // ==========================================
    // بدء التطبيق
    // ==========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
