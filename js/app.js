/**
 * ============================================
 * Main Application - المنطق الرئيسي للتطبيق
 * ============================================
 * هذا الملف يدير التنقل بين الشاشات وإدارة الفصول
 * والتفاعل العام مع واجهة المستخدم
 */

// ============================================
// المتغيرات العامة
// ============================================
let currentBook = null; // الكتاب الحالي المفتوح للتحرير
let draggedChapter = null; // الفصل الذي يتم سحبه

// ============================================
// تهيئة التطبيق
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // تهيئة السمة
    initTheme();
    
    // تهيئة التخزين وإنشاء كتاب تجريبي إذا لزم الأمر
    const demoCreated = StorageService.ensureDemoBookExists();
    if (demoCreated) {
        showToast('تم إنشاء كتاب تجريبي للبدء!', 'info');
    }
    
    // تهيئة أحداث التنقل
    initNavigation();
    
    // تهيئة محرر الكتاب
    initBookEditor();
    
    // تحديث إحصائيات الإعدادات
    updateSettingsStats();
    
    // تهيئة السحب والإفلات للغلاف
    initCoverDragDrop();
    
    console.log('تم تهيئة التطبيق بنجاح');
});

// ============================================
// إدارة السمة (الوضع الليلي/النهاري)
// ============================================

/**
 * تهيئة السمة من التخزين
 */
function initTheme() {
    const savedTheme = StorageService.getTheme();
    applyTheme(savedTheme);
    
    // تحديث حالة زر التبديل في الإعدادات
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = savedTheme === 'dark';
    }
}

/**
 * تبديل الوضع الليلي/النهاري
 */
function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    applyTheme(newTheme);
    StorageService.setTheme(newTheme);
    
    // تحديث حالة زر التبديل في الإعدادات
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = newTheme === 'dark';
    }
    
    showToast(newTheme === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري', 'success');
}

/**
 * تطبيق السمة
 * @param {string} theme - السمة ('light' أو 'dark')
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // تحديث أيقونة زر التبديل في الهيدر
    const themeIcon = document.querySelector('.theme-toggle .theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// ربط زر تبديل السمة في الهيدر
document.getElementById('themeToggle')?.addEventListener('click', toggleDarkMode);

// ============================================
// التنقل بين الصفحات
// ============================================

/**
 * تهيئة أحداث التنقل
 */
function initNavigation() {
    // أزرار التنقل في الهيدر
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-page');
            navigateTo(page);
        });
    });
}

/**
 * الانتقال إلى صفحة معينة
 * @param {string} pageName - اسم الصفحة
 */
function navigateTo(pageName) {
    // إخفاء جميع الصفحات
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // إظهار الصفحة المطلوبة
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // تحديث حالة أزرار التنقل (الديسكتوب)
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === pageName) {
            btn.classList.add('active');
        }
    });
    
    // تحديث حالة تنقل الموبايل
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageName) {
            item.classList.add('active');
        }
    });
    
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageName) {
            item.classList.add('active');
        }
    });
    
    // تحميل البيانات حسب الصفحة
    if (pageName === 'my-books') {
        loadMyBooks();
    } else if (pageName === 'settings') {
        updateSettingsStats();
    }
    
    // التمرير إلى الأعلى
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// محرر الكتاب
// ============================================

/**
 * تهيئة محرر الكتاب
 */
function initBookEditor() {
    // إضافة فصل فارغ افتراضي
    resetBookEditor();
}

/**
 * إعادة تعيين محرر الكتاب
 */
function resetBookEditor() {
    currentBook = {
        id: null,
        title: '',
        author: '',
        cover: null,
        chapters: []
    };
    
    // مسح الحقول
    document.getElementById('bookTitle').value = '';
    document.getElementById('bookAuthor').value = '';
    
    // مسح الغلاف
    removeCover();
    
    // إعادة تعيين إعدادات الغلاف
    coverSettings = {
        backgroundColor: '#6366f1',
        backgroundImage: null,
        title: {
            text: 'عنوان الكتاب',
            fontSize: 32,
            color: '#ffffff',
            fontFamily: 'Cairo',
            x: 50,
            y: 35
        },
        author: {
            text: 'اسم المؤلف',
            fontSize: 18,
            color: '#e2e8f0',
            fontFamily: 'Cairo',
            x: 50,
            y: 50
        },
        extraTexts: []
    };
    
    // إعادة تعيين عداد النصوص الإضافية
    extraTextCounter = 0;
    
    // مسح النصوص الإضافية من الغلاف
    const extraTextsContainer = document.getElementById('extraTextsContainer');
    if (extraTextsContainer) extraTextsContainer.innerHTML = '';
    
    // مسح قائمة النصوص الإضافية
    const extraTextsList = document.getElementById('extraTextsList');
    if (extraTextsList) extraTextsList.innerHTML = '';
    
    // إعادة تعيين عناصر الغلاف للمواقع الافتراضية
    const titleElement = document.getElementById('coverTitleElement');
    const authorElement = document.getElementById('coverAuthorElement');
    const coverEditor = document.getElementById('coverEditor');
    
    if (titleElement) {
        titleElement.style.left = '50%';
        titleElement.style.top = '35%';
    }
    if (authorElement) {
        authorElement.style.left = '50%';
        authorElement.style.top = '50%';
    }
    if (coverEditor) {
        coverEditor.style.background = '#6366f1';
    }
    
    // إعادة تعيين النصوص على الغلاف
    const titleText = document.getElementById('coverTitleText');
    const authorText = document.getElementById('coverAuthorText');
    if (titleText) {
        titleText.textContent = 'عنوان الكتاب';
        titleText.style.fontSize = '32px';
        titleText.style.color = '#ffffff';
        titleText.style.fontFamily = 'Cairo';
    }
    if (authorText) {
        authorText.textContent = 'اسم المؤلف';
        authorText.style.fontSize = '18px';
        authorText.style.color = '#e2e8f0';
        authorText.style.fontFamily = 'Cairo';
    }
    
    // إعادة تعيين أدوات التحكم
    const titleSizeDisplay = document.getElementById('titleSizeDisplay');
    const authorSizeDisplay = document.getElementById('authorSizeDisplay');
    const titleColor = document.getElementById('titleColor');
    const authorColor = document.getElementById('authorColor');
    const titleFont = document.getElementById('titleFont');
    const authorFont = document.getElementById('authorFont');
    const coverBgColor = document.getElementById('coverBgColor');
    
    if (titleSizeDisplay) titleSizeDisplay.textContent = '32px';
    if (authorSizeDisplay) authorSizeDisplay.textContent = '18px';
    if (titleColor) titleColor.value = '#ffffff';
    if (authorColor) authorColor.value = '#e2e8f0';
    if (titleFont) titleFont.value = 'Cairo';
    if (authorFont) authorFont.value = 'Cairo';
    if (coverBgColor) coverBgColor.value = '#6366f1';
    
    // إعادة تعيين إعدادات الفهرس
    resetTocSettings();
    
    // مسح الفصول
    document.getElementById('chaptersList').innerHTML = '';
    
    // تحديث شريط التنقل السريع
    updateQuickNav();
    
    // إضافة فصل فارغ
    addChapter();
}

/**
 * إضافة فصل جديد
 */
function addChapter() {
    const template = document.getElementById('chapterTemplate');
    const chaptersList = document.getElementById('chaptersList');
    
    // استنساخ القالب
    const chapterElement = template.content.cloneNode(true);
    const chapterItem = chapterElement.querySelector('.chapter-item');
    
    // إنشاء معرف فريد للفصل
    const chapterId = 'chapter_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    chapterItem.setAttribute('data-chapter-id', chapterId);
    
    // إضافة أحداث السحب والإفلات
    initChapterDragDrop(chapterItem);
    
    // إضافة الفصل إلى القائمة
    chaptersList.appendChild(chapterElement);
    
    // التركيز على حقل العنوان
    const titleInput = chaptersList.lastElementChild.querySelector('.chapter-title-input');
    titleInput.focus();
    
    // إضافة مستمع لتحديث عنوان الفصل في شريط التنقل
    titleInput.addEventListener('input', (e) => {
        updateChapterTitleInNav(chapterId, e.target.value);
    });
    
    // تحديث شريط التنقل
    updateQuickNav();
    
    showToast('تمت إضافة فصل جديد', 'success');
}

/**
 * حذف فصل
 * @param {HTMLElement} button - زر الحذف
 */
function deleteChapter(button) {
    const chapterItem = button.closest('.chapter-item');
    const chaptersList = document.getElementById('chaptersList');
    
    // التحقق من وجود فصل واحد على الأقل
    if (chaptersList.children.length <= 1) {
        showToast('يجب أن يحتوي الكتاب على فصل واحد على الأقل', 'warning');
        return;
    }
    
    // تأكيد الحذف
    if (confirm('هل أنت متأكد من حذف هذا الفصل؟')) {
        chapterItem.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            chapterItem.remove();
            updateQuickNav();
            showToast('تم حذف الفصل', 'success');
        }, 300);
    }
}

/**
 * طي/توسيع محتوى الفصل
 * @param {HTMLElement} button - زر الطي
 */
function toggleChapterContent(button) {
    const chapterItem = button.closest('.chapter-item');
    const chapterContent = chapterItem.querySelector('.chapter-content');
    const icon = button.querySelector('span');
    
    chapterContent.classList.toggle('collapsed');
    icon.textContent = chapterContent.classList.contains('collapsed') ? '▶' : '▼';
}

// ============================================
// السحب والإفلات للفصول
// ============================================

/**
 * تهيئة السحب والإفلات لفصل
 * @param {HTMLElement} chapterItem - عنصر الفصل
 */
function initChapterDragDrop(chapterItem) {
    chapterItem.addEventListener('dragstart', handleDragStart);
    chapterItem.addEventListener('dragend', handleDragEnd);
    chapterItem.addEventListener('dragover', handleDragOver);
    chapterItem.addEventListener('drop', handleDrop);
    chapterItem.addEventListener('dragenter', handleDragEnter);
    chapterItem.addEventListener('dragleave', handleDragLeave);
}

function handleDragStart(e) {
    draggedChapter = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.chapter-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedChapter = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedChapter) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedChapter !== this) {
        const chaptersList = document.getElementById('chaptersList');
        const allChapters = Array.from(chaptersList.children);
        const draggedIndex = allChapters.indexOf(draggedChapter);
        const droppedIndex = allChapters.indexOf(this);
        
        if (draggedIndex < droppedIndex) {
            this.parentNode.insertBefore(draggedChapter, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggedChapter, this);
        }
        
        showToast('تم إعادة ترتيب الفصول', 'success');
    }
    
    this.classList.remove('drag-over');
    updateQuickNav();
}

// ============================================
// التنقل السريع للفصول
// ============================================

/**
 * تحديث شريط التنقل السريع
 */
function updateQuickNav() {
    const quickNavList = document.getElementById('quickNavList');
    const chapters = document.querySelectorAll('.chapter-item');
    
    if (chapters.length === 0) {
        quickNavList.innerHTML = '<div class="quick-nav-empty">لا توجد فصول بعد</div>';
        return;
    }
    
    quickNavList.innerHTML = '';
    
    chapters.forEach((chapter, index) => {
        const chapterId = chapter.getAttribute('data-chapter-id');
        const titleInput = chapter.querySelector('.chapter-title-input');
        const title = titleInput?.value || `الفصل ${index + 1}`;
        
        const navItem = document.createElement('div');
        navItem.className = 'quick-nav-item';
        navItem.setAttribute('data-chapter-id', chapterId);
        navItem.onclick = () => scrollToChapter(chapterId);
        
        navItem.innerHTML = `
            <span class="nav-number">${index + 1}</span>
            <span class="nav-title">${title}</span>
        `;
        
        quickNavList.appendChild(navItem);
    });
}

/**
 * الانتقال إلى فصل معين
 */
function scrollToChapter(chapterId) {
    const chapter = document.querySelector(`.chapter-item[data-chapter-id="${chapterId}"]`);
    
    if (chapter) {
        // إزالة التمييز من جميع العناصر
        document.querySelectorAll('.quick-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // تمييز العنصر الحالي
        const navItem = document.querySelector(`.quick-nav-item[data-chapter-id="${chapterId}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        // التمرير إلى الفصل بسلاسة
        chapter.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // تأثير التمييز
        chapter.style.transition = 'box-shadow 0.3s, border-color 0.3s';
        chapter.style.boxShadow = '0 0 0 3px var(--primary-light)';
        chapter.style.borderColor = 'var(--primary-color)';
        
        setTimeout(() => {
            chapter.style.boxShadow = '';
            chapter.style.borderColor = '';
        }, 1500);
    }
}

/**
 * طي/توسيع شريط التنقل السريع
 */
function toggleQuickNav() {
    const quickNavList = document.getElementById('quickNavList');
    const toggleBtn = document.querySelector('.quick-nav-toggle');
    
    quickNavList.classList.toggle('collapsed');
    toggleBtn.textContent = quickNavList.classList.contains('collapsed') ? '▶' : '▼';
}

/**
 * تحديث عنوان الفصل في شريط التنقل
 */
function updateChapterTitleInNav(chapterId, newTitle) {
    const navItem = document.querySelector(`.quick-nav-item[data-chapter-id="${chapterId}"] .nav-title`);
    if (navItem) {
        navItem.textContent = newTitle || 'فصل بدون عنوان';
    }
}

// ============================================
// محرر الغلاف التفاعلي
// ============================================

// إعدادات الغلاف
let coverSettings = {
    backgroundColor: '#6366f1',
    backgroundImage: null,
    title: {
        text: 'عنوان الكتاب',
        fontSize: 32,
        color: '#ffffff',
        fontFamily: 'Cairo',
        x: 50,
        y: 35
    },
    author: {
        text: 'اسم المؤلف',
        fontSize: 18,
        color: '#e2e8f0',
        fontFamily: 'Cairo',
        x: 50,
        y: 50
    },
    extraTexts: [] // النصوص الإضافية
};

// إعدادات الفهرس
let tocSettings = {
    enabled: true,
    title: 'فهرس المحتويات',
    style: 'dots', // dots, line, none
    titleFont: 'Cairo',
    titleColor: '#1e293b',
    numberStyle: 'arabic', // arabic, arabic-indic, roman
    chapterColor: '#6366f1',
    listFont: 'Cairo',
    listFontSize: 13
};

// عداد للنصوص الإضافية
let extraTextCounter = 0;

// متغيرات السحب
let isDragging = false;
let currentDragElement = null;
let dragOffset = { x: 0, y: 0 };

/**
 * تهيئة محرر الغلاف
 */
function initCoverDragDrop() {
    const coverEditor = document.getElementById('coverEditor');
    const coverBackground = document.getElementById('coverBackground');
    const titleElement = document.getElementById('coverTitleElement');
    const authorElement = document.getElementById('coverAuthorElement');
    
    // تهيئة سحب وإفلات للخلفية
    coverBackground.addEventListener('click', () => {
        document.getElementById('coverInput').click();
    });
    
    coverBackground.addEventListener('dragover', (e) => {
        e.preventDefault();
        coverBackground.style.opacity = '0.7';
    });
    
    coverBackground.addEventListener('dragleave', () => {
        coverBackground.style.opacity = '1';
    });
    
    coverBackground.addEventListener('drop', (e) => {
        e.preventDefault();
        coverBackground.style.opacity = '1';
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleCoverFile(files[0]);
        }
    });
    
    // تهيئة سحب العناصر
    initDraggableElement(titleElement, 'title');
    initDraggableElement(authorElement, 'author');
    
    // تحديث النص عند تغيير الحقول
    document.getElementById('bookTitle').addEventListener('input', (e) => {
        coverSettings.title.text = e.target.value || 'عنوان الكتاب';
        updateCoverElement('title');
    });
    
    document.getElementById('bookAuthor').addEventListener('input', (e) => {
        coverSettings.author.text = e.target.value || 'اسم المؤلف';
        updateCoverElement('author');
    });
}

/**
 * تهيئة عنصر قابل للسحب
 */
function initDraggableElement(element, type) {
    const coverEditor = document.getElementById('coverEditor');
    
    // أحداث الماوس للديسكتوب
    element.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('element-resize-handle')) return;
        startDrag(element, e.clientX, e.clientY);
        e.preventDefault();
    });
    
    // أحداث اللمس للموبايل
    element.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('element-resize-handle')) return;
        const touch = e.touches[0];
        startDrag(element, touch.clientX, touch.clientY);
        e.preventDefault();
    }, { passive: false });
    
    // إضافة أحداث للنافذة
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
}

/**
 * بدء السحب
 */
function startDrag(element, clientX, clientY) {
    isDragging = true;
    currentDragElement = element;
    element.classList.add('dragging');
    
    const rect = element.getBoundingClientRect();
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;
}

/**
 * معالجة حركة الماوس أثناء السحب
 */
function handleMouseMove(e) {
    if (!isDragging || !currentDragElement) return;
    moveDragElement(e.clientX, e.clientY);
}

/**
 * معالجة رفع الماوس
 */
function handleMouseUp() {
    endDrag();
}

/**
 * معالجة حركة اللمس أثناء السحب
 */
function handleTouchMove(e) {
    if (!isDragging || !currentDragElement) return;
    
    const touch = e.touches[0];
    moveDragElement(touch.clientX, touch.clientY);
    e.preventDefault();
}

/**
 * معالجة رفع اللمس
 */
function handleTouchEnd() {
    endDrag();
}

/**
 * تحريك العنصر المسحوب
 */
function moveDragElement(clientX, clientY) {
    const coverEditor = document.getElementById('coverEditor');
    const rect = coverEditor.getBoundingClientRect();
    
    // حساب الموقع الجديد بالنسبة المئوية
    let x = ((clientX - rect.left - dragOffset.x + currentDragElement.offsetWidth / 2) / rect.width) * 100;
    let y = ((clientY - rect.top - dragOffset.y + currentDragElement.offsetHeight / 2) / rect.height) * 100;
    
    // تقييد الحركة داخل المحرر
    x = Math.max(5, Math.min(95, x));
    y = Math.max(5, Math.min(95, y));
    
    // تحديث موقع العنصر
    currentDragElement.style.left = x + '%';
    currentDragElement.style.top = y + '%';
    
    // حفظ الإعدادات
    const elementType = currentDragElement.dataset.element;
    
    // التحقق إذا كان نص إضافي
    if (elementType.startsWith('extra_')) {
        const id = parseInt(elementType.split('_')[1]);
        const extraText = coverSettings.extraTexts.find(et => et.id === id);
        if (extraText) {
            extraText.x = x;
            extraText.y = y;
        }
    } else {
        coverSettings[elementType].x = x;
        coverSettings[elementType].y = y;
    }
}

/**
 * إنهاء السحب
 */
function endDrag() {
    if (currentDragElement) {
        currentDragElement.classList.remove('dragging');
    }
    isDragging = false;
    currentDragElement = null;
}

/**
 * تحديث عنصر الغلاف
 */
function updateCoverElement(type) {
    const element = type === 'title' ? 
        document.getElementById('coverTitleText') : 
        document.getElementById('coverAuthorText');
    
    element.textContent = coverSettings[type].text;
    element.style.fontSize = coverSettings[type].fontSize + 'px';
    element.style.color = coverSettings[type].color;
    element.style.fontFamily = coverSettings[type].fontFamily || 'Cairo';
}

/**
 * تغيير حجم الخط
 */
function changeFontSize(type, delta) {
    const minSize = type === 'title' ? 16 : 12;
    const maxSize = type === 'title' ? 60 : 36;
    
    let newSize = coverSettings[type].fontSize + delta;
    newSize = Math.max(minSize, Math.min(maxSize, newSize));
    
    coverSettings[type].fontSize = newSize;
    updateCoverElement(type);
    
    // تحديث العرض
    document.getElementById(type + 'SizeDisplay').textContent = newSize + 'px';
}

/**
 * تغيير لون العنصر
 */
function setElementColor(type, color) {
    coverSettings[type].color = color;
    updateCoverElement(type);
}

/**
 * تغيير لون خلفية الغلاف
 */
function setCoverBgColor(color) {
    coverSettings.backgroundColor = color;
    const coverEditor = document.getElementById('coverEditor');
    coverEditor.style.background = color;
}

/**
 * توسيط عنصر
 */
function centerElement(type) {
    coverSettings[type].x = 50;
    const element = type === 'title' ? 
        document.getElementById('coverTitleElement') : 
        document.getElementById('coverAuthorElement');
    element.style.left = '50%';
    showToast('تم توسيط ' + (type === 'title' ? 'العنوان' : 'اسم المؤلف'), 'success');
}

/**
 * تغيير خط العنصر
 */
function setElementFont(type, fontFamily) {
    coverSettings[type].fontFamily = fontFamily;
    updateCoverElement(type);
}

/**
 * توسيط جميع العناصر
 */
function centerAllElements() {
    centerElement('title');
    centerElement('author');
    coverSettings.extraTexts.forEach(et => {
        et.x = 50;
        const element = document.getElementById(`extraText_${et.id}`);
        if (element) element.style.left = '50%';
    });
    showToast('تم توسيط جميع العناصر', 'success');
}

/**
 * إضافة نص إضافي على الغلاف
 */
function addExtraText() {
    const input = document.getElementById('newExtraText');
    const text = input.value.trim();
    
    if (!text) {
        showToast('أدخل نص أولاً', 'warning');
        return;
    }
    
    extraTextCounter++;
    const id = extraTextCounter;
    
    // إنشاء كائن النص الإضافي
    const extraText = {
        id: id,
        text: text,
        fontSize: 14,
        color: '#ffffff',
        fontFamily: 'Cairo',
        x: 50,
        y: 65 + (coverSettings.extraTexts.length * 8)
    };
    
    coverSettings.extraTexts.push(extraText);
    
    // إنشاء عنصر على الغلاف
    createExtraTextElement(extraText);
    
    // إنشاء عنصر في القائمة
    updateExtraTextsList();
    
    // مسح حقل الإدخال
    input.value = '';
    
    showToast('تم إضافة النص', 'success');
}

/**
 * إنشاء عنصر نص إضافي على الغلاف
 */
function createExtraTextElement(extraText) {
    const container = document.getElementById('extraTextsContainer');
    
    const element = document.createElement('div');
    element.id = `extraText_${extraText.id}`;
    element.className = 'cover-element draggable-element extra-text';
    element.dataset.element = `extra_${extraText.id}`;
    element.style.cssText = `
        top: ${extraText.y}%;
        left: ${extraText.x}%;
        transform: translate(-50%, -50%);
    `;
    
    const textSpan = document.createElement('span');
    textSpan.className = 'element-text';
    textSpan.textContent = extraText.text;
    textSpan.style.fontSize = extraText.fontSize + 'px';
    textSpan.style.color = extraText.color;
    textSpan.style.fontFamily = extraText.fontFamily;
    
    element.appendChild(textSpan);
    container.appendChild(element);
    
    // تهيئة السحب
    initDraggableElement(element, `extra_${extraText.id}`);
}

/**
 * تحديث قائمة النصوص الإضافية
 */
function updateExtraTextsList() {
    const list = document.getElementById('extraTextsList');
    list.innerHTML = '';
    
    coverSettings.extraTexts.forEach(et => {
        const item = document.createElement('div');
        item.className = 'extra-text-item';
        item.innerHTML = `
            <span class="text-preview">${et.text}</span>
            <div class="extra-text-controls">
                <button class="mini-btn" onclick="changeExtraTextSize(${et.id}, -1)">−</button>
                <button class="mini-btn" onclick="changeExtraTextSize(${et.id}, 1)">+</button>
                <input type="color" value="${et.color}" onchange="changeExtraTextColor(${et.id}, this.value)">
                <select onchange="changeExtraTextFont(${et.id}, this.value)">
                    <option value="Cairo" ${et.fontFamily === 'Cairo' ? 'selected' : ''}>Cairo</option>
                    <option value="Tajawal" ${et.fontFamily === 'Tajawal' ? 'selected' : ''}>Tajawal</option>
                    <option value="Amiri" ${et.fontFamily === 'Amiri' ? 'selected' : ''}>Amiri</option>
                    <option value="Roboto" ${et.fontFamily === 'Roboto' ? 'selected' : ''}>Roboto</option>
                    <option value="Poppins" ${et.fontFamily === 'Poppins' ? 'selected' : ''}>Poppins</option>
                </select>
                <button class="mini-btn delete" onclick="deleteExtraText(${et.id})">×</button>
            </div>
        `;
        list.appendChild(item);
    });
}

/**
 * تغيير حجم نص إضافي
 */
function changeExtraTextSize(id, delta) {
    const et = coverSettings.extraTexts.find(e => e.id === id);
    if (!et) return;
    
    et.fontSize = Math.max(10, Math.min(40, et.fontSize + delta));
    
    const element = document.getElementById(`extraText_${id}`);
    if (element) {
        element.querySelector('.element-text').style.fontSize = et.fontSize + 'px';
    }
}

/**
 * تغيير لون نص إضافي
 */
function changeExtraTextColor(id, color) {
    const et = coverSettings.extraTexts.find(e => e.id === id);
    if (!et) return;
    
    et.color = color;
    
    const element = document.getElementById(`extraText_${id}`);
    if (element) {
        element.querySelector('.element-text').style.color = color;
    }
}

/**
 * تغيير خط نص إضافي
 */
function changeExtraTextFont(id, fontFamily) {
    const et = coverSettings.extraTexts.find(e => e.id === id);
    if (!et) return;
    
    et.fontFamily = fontFamily;
    
    const element = document.getElementById(`extraText_${id}`);
    if (element) {
        element.querySelector('.element-text').style.fontFamily = fontFamily;
    }
}

/**
 * حذف نص إضافي
 */
function deleteExtraText(id) {
    const index = coverSettings.extraTexts.findIndex(e => e.id === id);
    if (index > -1) {
        coverSettings.extraTexts.splice(index, 1);
    }
    
    const element = document.getElementById(`extraText_${id}`);
    if (element) {
        element.remove();
    }
    
    updateExtraTextsList();
    showToast('تم حذف النص', 'info');
}

/**
 * إعادة تعيين مواقع العناصر
 */
function resetCoverPositions() {
    // إعادة تعيين العنوان
    coverSettings.title.x = 50;
    coverSettings.title.y = 35;
    coverSettings.title.fontSize = 32;
    coverSettings.title.color = '#ffffff';
    coverSettings.title.fontFamily = 'Cairo';
    
    // إعادة تعيين المؤلف
    coverSettings.author.x = 50;
    coverSettings.author.y = 50;
    coverSettings.author.fontSize = 18;
    coverSettings.author.color = '#e2e8f0';
    coverSettings.author.fontFamily = 'Cairo';
    
    // حذف النصوص الإضافية
    coverSettings.extraTexts = [];
    document.getElementById('extraTextsContainer').innerHTML = '';
    updateExtraTextsList();
    
    // تحديث العناصر
    const titleEl = document.getElementById('coverTitleElement');
    const authorEl = document.getElementById('coverAuthorElement');
    
    titleEl.style.left = '50%';
    titleEl.style.top = '35%';
    authorEl.style.left = '50%';
    authorEl.style.top = '50%';
    
    updateCoverElement('title');
    updateCoverElement('author');
    
    // تحديث الأدوات
    document.getElementById('titleSizeDisplay').textContent = '32px';
    document.getElementById('authorSizeDisplay').textContent = '18px';
    document.getElementById('titleColor').value = '#ffffff';
    document.getElementById('authorColor').value = '#e2e8f0';
    document.getElementById('titleFont').value = 'Cairo';
    document.getElementById('authorFont').value = 'Cairo';
    
    showToast('تم إعادة تعيين الغلاف', 'success');
}

/**
 * معالجة رفع صورة الغلاف
 */
function handleCoverUpload(event) {
    const file = event.target.files[0];
    if (file) {
        handleCoverFile(file);
    }
}

/**
 * معالجة ملف الغلاف
 * @param {File} file - ملف الصورة
 */
function handleCoverFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('يرجى اختيار ملف صورة صحيح', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const coverImage = document.getElementById('coverImage');
        const coverPlaceholder = document.getElementById('coverPlaceholder');
        const removeCoverBtn = document.getElementById('removeCoverBtn');
        
        // تحديث صورة الغلاف
        coverImage.src = e.target.result;
        coverImage.style.display = 'block';
        if (coverPlaceholder) coverPlaceholder.style.display = 'none';
        removeCoverBtn.style.display = 'inline-flex';
        
        // حفظ في الإعدادات
        coverSettings.backgroundImage = e.target.result;
        if (currentBook) currentBook.cover = e.target.result;
        
        showToast('تم رفع صورة الغلاف', 'success');
    };
    reader.readAsDataURL(file);
}

/**
 * إزالة صورة الغلاف
 */
function removeCover() {
    const coverImage = document.getElementById('coverImage');
    const coverPlaceholder = document.getElementById('coverPlaceholder');
    const removeCoverBtn = document.getElementById('removeCoverBtn');
    const coverInput = document.getElementById('coverInput');
    
    coverImage.src = '';
    coverImage.style.display = 'none';
    if (coverPlaceholder) coverPlaceholder.style.display = 'block';
    removeCoverBtn.style.display = 'none';
    coverInput.value = '';
    
    // مسح من الإعدادات
    coverSettings.backgroundImage = null;
    if (currentBook) currentBook.cover = null;
    
    showToast('تم حذف صورة الغلاف', 'info');
}

// ============================================
// إدراج صور في الفصول
// ============================================

/**
 * فتح نافذة اختيار صورة للفصل
 * @param {HTMLElement} button - زر الصورة
 */
function insertChapterImage(button) {
    const chapterItem = button.closest('.chapter-item');
    const imageInput = chapterItem.querySelector('.chapter-image-input');
    imageInput.click();
}

/**
 * معالجة رفع صورة الفصل
 * @param {Event} event - حدث تغيير الملف
 * @param {HTMLElement} input - عنصر الإدخال
 */
function handleChapterImageUpload(event, input) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
        showToast('يرجى اختيار ملف صورة صحيح', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const chapterItem = input.closest('.chapter-item');
        const editor = chapterItem.querySelector('.chapter-editor');
        
        // إنشاء عنصر الصورة
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = 'صورة';
        img.style.maxWidth = '100%';
        
        // إدراج الصورة في موقع المؤشر أو في النهاية
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            range.insertNode(img);
            range.collapse(false);
        } else {
            editor.appendChild(img);
        }
        
        showToast('تم إدراج الصورة', 'success');
    };
    reader.readAsDataURL(file);
    
    // مسح قيمة الإدخال للسماح باختيار نفس الملف مرة أخرى
    input.value = '';
}

// ============================================
// تنسيق النص - أدوات التحرير
// ============================================

/**
 * تطبيق تنسيق على النص المحدد
 * @param {string} command - أمر التنسيق
 */
function formatText(command) {
    document.execCommand(command, false, null);
}

/**
 * تغيير حجم الخط
 * @param {string} size - حجم الخط (1-7)
 */
function formatFontSize(size) {
    if (size) {
        document.execCommand('fontSize', false, size);
    }
}

/**
 * تغيير نوع الخط
 * @param {string} fontName - اسم الخط
 */
function formatFontName(fontName) {
    if (fontName) {
        document.execCommand('fontName', false, fontName);
    }
}

/**
 * تغيير لون النص
 * @param {string} color - اللون
 */
function formatTextColor(color) {
    document.execCommand('foreColor', false, color);
}

/**
 * تظليل النص
 * @param {string} color - لون التظليل
 */
function formatHighlight(color) {
    document.execCommand('hiliteColor', false, color);
}

/**
 * تنسيق العناوين والفقرات
 * @param {string} tag - نوع العنصر (h1, h2, h3, p, blockquote)
 */
function formatHeading(tag) {
    if (tag) {
        document.execCommand('formatBlock', false, tag);
    }
}

/**
 * إدراج رابط
 * @param {HTMLElement} button - الزر
 */
function insertLink(button) {
    const url = prompt('أدخل رابط URL:', 'https://');
    if (url && url !== 'https://') {
        document.execCommand('createLink', false, url);
    }
}

/**
 * إدراج خط أفقي فاصل
 */
function insertHorizontalRule() {
    document.execCommand('insertHorizontalRule', false, null);
}

// ============================================
// حفظ الكتاب
// ============================================

/**
 * جمع بيانات الكتاب من النموذج
 * @returns {Object} بيانات الكتاب
 */
function collectBookData() {
    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const coverImage = document.getElementById('coverImage');
    
    // جمع الفصول
    const chapters = [];
    document.querySelectorAll('.chapter-item').forEach((item, index) => {
        const chapterId = item.getAttribute('data-chapter-id');
        const chapterTitle = item.querySelector('.chapter-title-input').value.trim() || `الفصل ${index + 1}`;
        const chapterContent = item.querySelector('.chapter-editor').innerHTML;
        
        chapters.push({
            id: chapterId,
            title: chapterTitle,
            content: chapterContent
        });
    });
    
    // جمع إعدادات الغلاف
    const coverData = {
        backgroundColor: coverSettings.backgroundColor,
        backgroundImage: coverSettings.backgroundImage || (coverImage.src && coverImage.src !== '' ? coverImage.src : null),
        title: {
            text: coverSettings.title.text || title || 'كتاب بدون عنوان',
            fontSize: coverSettings.title.fontSize,
            color: coverSettings.title.color,
            fontFamily: coverSettings.title.fontFamily || 'Cairo',
            x: coverSettings.title.x,
            y: coverSettings.title.y
        },
        author: {
            text: coverSettings.author.text || author || 'مؤلف مجهول',
            fontSize: coverSettings.author.fontSize,
            color: coverSettings.author.color,
            fontFamily: coverSettings.author.fontFamily || 'Cairo',
            x: coverSettings.author.x,
            y: coverSettings.author.y
        },
        extraTexts: coverSettings.extraTexts.map(et => ({
            id: et.id,
            text: et.text,
            fontSize: et.fontSize,
            color: et.color,
            fontFamily: et.fontFamily,
            x: et.x,
            y: et.y
        }))
    };
    
    // جمع إعدادات الفهرس
    const tocData = collectTocSettings();
    
    return {
        id: currentBook?.id || null,
        title: title || 'كتاب بدون عنوان',
        author: author || 'مؤلف مجهول',
        cover: coverData.backgroundImage,
        coverSettings: coverData,
        tocSettings: tocData,
        chapters: chapters,
        createdAt: currentBook?.createdAt || new Date().toISOString()
    };
}

/**
 * حفظ الكتاب الحالي
 */
function saveCurrentBook() {
    const bookData = collectBookData();
    
    // التحقق من وجود محتوى
    if (bookData.chapters.length === 0) {
        showToast('يجب إضافة فصل واحد على الأقل', 'warning');
        return;
    }
    
    try {
        const savedBook = StorageService.saveBook(bookData);
        currentBook = savedBook;
        showToast('تم حفظ الكتاب بنجاح', 'success');
    } catch (error) {
        showToast(error.message || 'حدث خطأ في حفظ الكتاب', 'error');
    }
}

// ============================================
// تحميل الكتاب للتحرير
// ============================================

/**
 * تحميل كتاب للتحرير
 * @param {string} bookId - معرف الكتاب
 */
function loadBookForEdit(bookId) {
    console.log('محاولة تحميل الكتاب:', bookId);
    
    const book = StorageService.getBook(bookId);
    console.log('الكتاب المسترجع:', book);
    
    if (!book) {
        showToast('الكتاب غير موجود', 'error');
        console.error('الكتاب غير موجود بالمعرف:', bookId);
        return;
    }
    
    currentBook = book;
    
    // تعبئة المعلومات الأساسية
    document.getElementById('bookTitle').value = book.title || '';
    document.getElementById('bookAuthor').value = book.author || '';
    
    // تعبئة الغلاف
    if (book.cover || book.coverSettings?.backgroundImage) {
        const coverImage = document.getElementById('coverImage');
        const coverPlaceholder = document.getElementById('coverPlaceholder');
        const removeCoverBtn = document.getElementById('removeCoverBtn');
        
        const imageToUse = book.cover || book.coverSettings?.backgroundImage;
        
        if (coverImage) {
            coverImage.src = imageToUse;
            coverImage.style.display = 'block';
        }
        if (coverPlaceholder) coverPlaceholder.style.display = 'none';
        if (removeCoverBtn) removeCoverBtn.style.display = 'inline-flex';
        
        // تحديث إعدادات الغلاف
        coverSettings.backgroundImage = imageToUse;
    } else {
        removeCover();
    }
    
    // تعبئة الفصول
    const chaptersList = document.getElementById('chaptersList');
    chaptersList.innerHTML = '';
    
    if (book.chapters && book.chapters.length > 0) {
        book.chapters.forEach(chapter => {
            const template = document.getElementById('chapterTemplate');
            const chapterElement = template.content.cloneNode(true);
            const chapterItem = chapterElement.querySelector('.chapter-item');
            
            const chapterId = chapter.id || 'chapter_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            chapterItem.setAttribute('data-chapter-id', chapterId);
            chapterItem.querySelector('.chapter-title-input').value = chapter.title || '';
            chapterItem.querySelector('.chapter-editor').innerHTML = chapter.content || '';
            
            // إضافة مستمع لتحديث عنوان الفصل في شريط التنقل
            const titleInput = chapterItem.querySelector('.chapter-title-input');
            titleInput.addEventListener('input', (e) => {
                updateChapterTitleInNav(chapterId, e.target.value);
            });
            
            initChapterDragDrop(chapterItem);
            chaptersList.appendChild(chapterElement);
        });
    } else {
        // إضافة فصل فارغ إذا لم توجد فصول
        addChapter();
    }
    
    // تحديث شريط التنقل السريع
    updateQuickNav();
    
    // تحميل إعدادات الغلاف
    if (book.coverSettings) {
        coverSettings = {
            backgroundColor: book.coverSettings.backgroundColor || '#6366f1',
            backgroundImage: book.coverSettings.backgroundImage || null,
            title: {
                text: book.coverSettings.title?.text || book.title || 'عنوان الكتاب',
                fontSize: book.coverSettings.title?.fontSize || 32,
                color: book.coverSettings.title?.color || '#ffffff',
                fontFamily: book.coverSettings.title?.fontFamily || 'Cairo',
                x: book.coverSettings.title?.x || 50,
                y: book.coverSettings.title?.y || 35
            },
            author: {
                text: book.coverSettings.author?.text || book.author || 'اسم المؤلف',
                fontSize: book.coverSettings.author?.fontSize || 18,
                color: book.coverSettings.author?.color || '#e2e8f0',
                fontFamily: book.coverSettings.author?.fontFamily || 'Cairo',
                x: book.coverSettings.author?.x || 50,
                y: book.coverSettings.author?.y || 50
            },
            extraTexts: book.coverSettings.extraTexts || []
        };
        
        // تحديث عناصر محرر الغلاف
        updateCoverEditorFromSettings();
    }
    
    // تحميل إعدادات الفهرس
    if (book.tocSettings) {
        loadTocSettingsToUI(book.tocSettings);
    } else {
        resetTocSettings();
    }
    
    // الانتقال إلى صفحة التحرير
    navigateTo('create');
    showToast('تم تحميل الكتاب للتحرير', 'info');
}

/**
 * تحديث محرر الغلاف من الإعدادات المحفوظة
 */
function updateCoverEditorFromSettings() {
    // تحديث العنوان
    const titleElement = document.getElementById('coverTitleText');
    const titleWrapper = document.getElementById('coverTitleElement');
    if (titleElement && titleWrapper) {
        titleElement.textContent = coverSettings.title.text;
        titleElement.style.fontSize = coverSettings.title.fontSize + 'px';
        titleElement.style.color = coverSettings.title.color;
        titleElement.style.fontFamily = coverSettings.title.fontFamily;
        titleWrapper.style.left = coverSettings.title.x + '%';
        titleWrapper.style.top = coverSettings.title.y + '%';
    }
    
    // تحديث المؤلف
    const authorElement = document.getElementById('coverAuthorText');
    const authorWrapper = document.getElementById('coverAuthorElement');
    if (authorElement && authorWrapper) {
        authorElement.textContent = coverSettings.author.text;
        authorElement.style.fontSize = coverSettings.author.fontSize + 'px';
        authorElement.style.color = coverSettings.author.color;
        authorElement.style.fontFamily = coverSettings.author.fontFamily;
        authorWrapper.style.left = coverSettings.author.x + '%';
        authorWrapper.style.top = coverSettings.author.y + '%';
    }
    
    // تحديث لون الخلفية
    const coverEditor = document.getElementById('coverEditor');
    if (coverEditor && coverSettings.backgroundColor) {
        coverEditor.style.background = coverSettings.backgroundColor;
    }
    
    // تحديث صورة الخلفية
    if (coverSettings.backgroundImage) {
        const coverImage = document.getElementById('coverImage');
        const coverPlaceholder = document.getElementById('coverPlaceholder');
        const removeCoverBtn = document.getElementById('removeCoverBtn');
        
        if (coverImage) {
            coverImage.src = coverSettings.backgroundImage;
            coverImage.style.display = 'block';
        }
        if (coverPlaceholder) coverPlaceholder.style.display = 'none';
        if (removeCoverBtn) removeCoverBtn.style.display = 'inline-flex';
    }
    
    // تحديث أدوات التحكم
    const titleSizeDisplay = document.getElementById('titleSizeDisplay');
    const authorSizeDisplay = document.getElementById('authorSizeDisplay');
    const titleColor = document.getElementById('titleColor');
    const authorColor = document.getElementById('authorColor');
    const titleFont = document.getElementById('titleFont');
    const authorFont = document.getElementById('authorFont');
    
    if (titleSizeDisplay) titleSizeDisplay.textContent = coverSettings.title.fontSize + 'px';
    if (authorSizeDisplay) authorSizeDisplay.textContent = coverSettings.author.fontSize + 'px';
    if (titleColor) titleColor.value = coverSettings.title.color;
    if (authorColor) authorColor.value = coverSettings.author.color;
    if (titleFont) titleFont.value = coverSettings.title.fontFamily;
    if (authorFont) authorFont.value = coverSettings.author.fontFamily;
    
    // تحديث لون خلفية الغلاف
    const coverBgColor = document.getElementById('coverBgColor');
    if (coverBgColor && coverSettings.backgroundColor) {
        coverBgColor.value = coverSettings.backgroundColor;
    }
    
    // إعادة إنشاء النصوص الإضافية
    const extraTextsContainer = document.getElementById('extraTextsContainer');
    if (extraTextsContainer) {
        extraTextsContainer.innerHTML = '';
        coverSettings.extraTexts.forEach(et => {
            extraTextCounter = Math.max(extraTextCounter, et.id || 0);
            createExtraTextElement(et);
        });
        updateExtraTextsList();
    }
}

// ============================================
// قسم "كتبي"
// ============================================

/**
 * تحميل وعرض الكتب المحفوظة
 */
function loadMyBooks() {
    const books = StorageService.getAllBooks();
    const booksGrid = document.getElementById('booksGrid');
    const emptyState = document.getElementById('emptyBooksState');
    
    // مسح المحتوى السابق
    booksGrid.innerHTML = '';
    
    if (books.length === 0) {
        booksGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    booksGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    // إنشاء بطاقات الكتب
    books.forEach(book => {
        const card = createBookCard(book);
        booksGrid.appendChild(card);
    });
}

/**
 * إنشاء بطاقة كتاب
 * @param {Object} book - بيانات الكتاب
 * @returns {HTMLElement} عنصر البطاقة
 */
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.onclick = () => loadBookForEdit(book.id);
    
    card.innerHTML = `
        <div class="book-card-cover">
            ${book.cover 
                ? `<img src="${book.cover}" alt="${book.title}">`
                : '<span class="cover-placeholder">📖</span>'
            }
        </div>
        <div class="book-card-info">
            <h4 class="book-card-title">${book.title}</h4>
            <p class="book-card-author">${book.author}</p>
            <div class="book-card-actions">
                <button class="secondary-btn" onclick="event.stopPropagation(); loadBookForEdit('${book.id}')">
                    تحرير
                </button>
                <button class="danger-btn" onclick="event.stopPropagation(); deleteBookConfirm('${book.id}')">
                    حذف
                </button>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * تأكيد حذف كتاب
 * @param {string} bookId - معرف الكتاب
 */
function deleteBookConfirm(bookId) {
    if (confirm('هل أنت متأكد من حذف هذا الكتاب نهائياً؟')) {
        if (StorageService.deleteBook(bookId)) {
            loadMyBooks();
            showToast('تم حذف الكتاب', 'success');
        } else {
            showToast('حدث خطأ في حذف الكتاب', 'error');
        }
    }
}

// ============================================
// المعاينة
// ============================================

/**
 * عرض معاينة الكتاب
 */
function previewBook() {
    const bookData = collectBookData();
    const previewContainer = document.getElementById('previewContainer');
    
    // بناء محتوى المعاينة
    let previewHTML = '';
    
    // صفحة الغلاف
    previewHTML += `
        <div class="preview-cover">
            ${bookData.cover ? `<img src="${bookData.cover}" alt="غلاف الكتاب">` : ''}
            <h1>${bookData.title}</h1>
            <p class="author">${bookData.author}</p>
        </div>
    `;
    
    // الفصول
    bookData.chapters.forEach((chapter, index) => {
        previewHTML += `
            <div class="preview-chapter">
                <h2>${chapter.title}</h2>
                <div class="preview-chapter-content">${chapter.content}</div>
            </div>
        `;
    });
    
    previewContainer.innerHTML = previewHTML;
    
    // عرض النافذة المنبثقة
    document.getElementById('previewModal').classList.add('active');
}

/**
 * إغلاق نافذة المعاينة
 */
function closePreviewModal() {
    document.getElementById('previewModal').classList.remove('active');
}

// إغلاق النافذة عند النقر خارجها
document.getElementById('previewModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'previewModal') {
        closePreviewModal();
    }
});

// ============================================
// الإعدادات
// ============================================

/**
 * تحديث إحصائيات الإعدادات
 */
function updateSettingsStats() {
    const booksCount = document.getElementById('booksCount');
    if (booksCount) {
        booksCount.textContent = StorageService.getBooksCount();
    }
}

/**
 * حذف جميع البيانات
 */
function clearAllData() {
    if (confirm('هل أنت متأكد من حذف جميع الكتب؟ هذا الإجراء لا يمكن التراجع عنه.')) {
        if (StorageService.deleteAllBooks()) {
            updateSettingsStats();
            showToast('تم حذف جميع البيانات', 'success');
        } else {
            showToast('حدث خطأ في حذف البيانات', 'error');
        }
    }
}

/**
 * تصدير جميع البيانات
 */
function exportAllData() {
    const data = StorageService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ebook-maker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('تم تصدير البيانات بنجاح', 'success');
}

/**
 * استيراد البيانات
 * @param {Event} event - حدث تغيير الملف
 */
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = StorageService.importData(e.target.result);
        
        if (result.success) {
            updateSettingsStats();
            showToast(`تم استيراد ${result.total} كتاب (${result.added} جديد، ${result.updated} محدث)`, 'success');
        } else {
            showToast('حدث خطأ في استيراد البيانات: ' + result.error, 'error');
        }
    };
    reader.readAsText(file);
    
    // مسح قيمة الإدخال
    event.target.value = '';
}

// ============================================
// إشعارات Toast
// ============================================

/**
 * عرض إشعار Toast
 * @param {string} message - الرسالة
 * @param {string} type - النوع ('success', 'error', 'warning', 'info')
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // تعيين الأيقونة حسب النوع
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toastIcon.textContent = icons[type] || icons.info;
    toastMessage.textContent = message;
    
    // إزالة الفئات السابقة وإضافة الجديدة
    toast.className = 'toast';
    toast.classList.add(type, 'show');
    
    // إخفاء الإشعار بعد 3 ثواني
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// التحميل (Loading)
// ============================================

/**
 * عرض شاشة التحميل
 * @param {string} message - رسالة التحميل
 */
function showLoading(message = 'جاري التحميل...') {
    const overlay = document.getElementById('loadingOverlay');
    const messageEl = overlay.querySelector('p');
    if (messageEl) messageEl.textContent = message;
    overlay.classList.add('active');
}

/**
 * إخفاء شاشة التحميل
 */
function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// ============================================
// إدارة إعدادات الفهرس
// ============================================

/**
 * تفعيل/إلغاء إعدادات الفهرس
 */
function toggleTocSettings() {
    const enabled = document.getElementById('tocEnabled').checked;
    const content = document.getElementById('tocSettingsContent');
    
    tocSettings.enabled = enabled;
    
    if (enabled) {
        content.classList.remove('disabled');
    } else {
        content.classList.add('disabled');
    }
}

/**
 * جمع إعدادات الفهرس من الواجهة
 */
function collectTocSettings() {
    return {
        enabled: document.getElementById('tocEnabled')?.checked ?? true,
        title: document.getElementById('tocTitle')?.value || 'فهرس المحتويات',
        style: document.getElementById('tocStyle')?.value || 'dots',
        titleFont: document.getElementById('tocTitleFont')?.value || 'Cairo',
        titleColor: document.getElementById('tocTitleColor')?.value || '#1e293b',
        numberStyle: document.getElementById('tocNumberStyle')?.value || 'arabic',
        chapterColor: document.getElementById('tocChapterColor')?.value || '#6366f1',
        listFont: document.getElementById('tocListFont')?.value || 'Cairo',
        listFontSize: tocSettings.listFontSize || 13
    };
}

/**
 * تحميل إعدادات الفهرس إلى الواجهة
 */
function loadTocSettingsToUI(settings) {
    if (!settings) return;
    
    const tocEnabled = document.getElementById('tocEnabled');
    const tocTitle = document.getElementById('tocTitle');
    const tocStyle = document.getElementById('tocStyle');
    const tocTitleFont = document.getElementById('tocTitleFont');
    const tocTitleColor = document.getElementById('tocTitleColor');
    const tocNumberStyle = document.getElementById('tocNumberStyle');
    const tocChapterColor = document.getElementById('tocChapterColor');
    const tocListFont = document.getElementById('tocListFont');
    const tocListSizeDisplay = document.getElementById('tocListSizeDisplay');
    const tocSettingsContent = document.getElementById('tocSettingsContent');
    
    if (tocEnabled) {
        tocEnabled.checked = settings.enabled !== false;
        if (!settings.enabled) {
            tocSettingsContent?.classList.add('disabled');
        } else {
            tocSettingsContent?.classList.remove('disabled');
        }
    }
    if (tocTitle) tocTitle.value = settings.title || 'فهرس المحتويات';
    if (tocStyle) tocStyle.value = settings.style || 'dots';
    if (tocTitleFont) tocTitleFont.value = settings.titleFont || 'Cairo';
    if (tocTitleColor) tocTitleColor.value = settings.titleColor || '#1e293b';
    if (tocNumberStyle) tocNumberStyle.value = settings.numberStyle || 'arabic';
    if (tocChapterColor) tocChapterColor.value = settings.chapterColor || '#6366f1';
    if (tocListFont) tocListFont.value = settings.listFont || 'Cairo';
    if (tocListSizeDisplay) tocListSizeDisplay.textContent = (settings.listFontSize || 13) + 'pt';
    
    // تحديث المتغير العام
    tocSettings = { ...tocSettings, ...settings };
}

/**
 * إعادة تعيين إعدادات الفهرس للقيم الافتراضية
 */
function resetTocSettings() {
    tocSettings = {
        enabled: true,
        title: 'فهرس المحتويات',
        style: 'dots',
        titleFont: 'Cairo',
        titleColor: '#1e293b',
        numberStyle: 'arabic',
        chapterColor: '#6366f1',
        listFont: 'Cairo',
        listFontSize: 13
    };
    loadTocSettingsToUI(tocSettings);
}

/**
 * تغيير حجم خط قائمة الفهرس
 * @param {number} delta - مقدار التغيير
 */
function changeTocListSize(delta) {
    const display = document.getElementById('tocListSizeDisplay');
    let currentSize = tocSettings.listFontSize || 13;
    
    // تحديد الحدود (8pt - 24pt)
    currentSize = Math.max(8, Math.min(24, currentSize + delta));
    
    tocSettings.listFontSize = currentSize;
    if (display) {
        display.textContent = currentSize + 'pt';
    }
}

/**
 * تحويل الرقم حسب النمط المختار
 */
function formatTocNumber(num, style) {
    switch (style) {
        case 'arabic-indic':
            return num.toString().replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
        case 'roman':
            const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
                'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
            return romanNumerals[num] || num.toString();
        default:
            return num.toString();
    }
}

// ============================================
// أنماط CSS إضافية للرسوم المتحركة
// ============================================
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(-20px); }
    }
`;
document.head.appendChild(additionalStyles);

// ============================================
// التحكم في عناصر الموبايل
// ============================================

/**
 * تهيئة عناصر الموبايل
 */
function initMobileNavigation() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const mobileSidebarClose = document.getElementById('mobileSidebarClose');
    const mobileBottomNav = document.getElementById('mobileBottomNav');
    
    if (!mobileMenuToggle || !mobileSidebar) return;
    
    // فتح/إغلاق القائمة الجانبية
    mobileMenuToggle.addEventListener('click', toggleMobileSidebar);
    
    // إغلاق عند النقر على التراكب
    mobileNavOverlay?.addEventListener('click', closeMobileSidebar);
    
    // زر الإغلاق
    mobileSidebarClose?.addEventListener('click', closeMobileSidebar);
    
    // التنقل من القائمة الجانبية
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            if (page) {
                navigateTo(page);
                closeMobileSidebar();
                updateMobileNavActive(page);
            }
        });
    });
    
    // التنقل من الشريط السفلي
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            if (page) {
                navigateTo(page);
                updateMobileNavActive(page);
            }
        });
    });
    
    // إغلاق القائمة عند تغيير حجم الشاشة
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeMobileSidebar();
        }
    });
    
    // منع التمرير عند فتح القائمة
    document.body.style.overflow = '';
}

/**
 * فتح/إغلاق القائمة الجانبية
 */
function toggleMobileSidebar() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    
    const isOpen = mobileSidebar.classList.contains('active');
    
    if (isOpen) {
        closeMobileSidebar();
    } else {
        mobileMenuToggle.classList.add('active');
        mobileSidebar.classList.add('active');
        mobileNavOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * إغلاق القائمة الجانبية
 */
function closeMobileSidebar() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    
    mobileMenuToggle?.classList.remove('active');
    mobileSidebar?.classList.remove('active');
    mobileNavOverlay?.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * تحديث العنصر النشط في تنقل الموبايل
 */
function updateMobileNavActive(page) {
    // تحديث القائمة الجانبية
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === page);
    });
    
    // تحديث الشريط السفلي
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === page);
    });
    
    // تحديث التنقل العادي أيضاً
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-page') === page);
    });
}

// تهيئة عناصر الموبايل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initMobileNavigation);

// تحديث التنقل عند استدعاء navigateTo
const originalNavigateTo = typeof navigateTo === 'function' ? navigateTo : null;
if (originalNavigateTo) {
    window.navigateToOriginal = originalNavigateTo;
}
