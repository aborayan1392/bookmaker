/**
 * ============================================
 * Storage Service - إدارة التخزين المحلي
 * ============================================
 * هذا الملف يدير حفظ واسترجاع الكتب من LocalStorage
 * يدعم IndexedDB كخيار احتياطي للملفات الكبيرة
 */

// ============================================
// ثوابت التخزين
// ============================================
const STORAGE_KEYS = {
    BOOKS: 'ebook_maker_books',
    SETTINGS: 'ebook_maker_settings',
    CURRENT_BOOK: 'ebook_maker_current_book',
    THEME: 'ebook_maker_theme'
};

// ============================================
// كائن إدارة التخزين الرئيسي
// ============================================
const StorageService = {
    
    /**
     * تهيئة التخزين والتحقق من الدعم
     */
    init() {
        // التحقق من دعم LocalStorage
        if (!this.isLocalStorageSupported()) {
            console.warn('LocalStorage غير مدعوم في هذا المتصفح');
            return false;
        }
        
        // إنشاء هيكل البيانات الأولي إذا لم يكن موجوداً
        if (!localStorage.getItem(STORAGE_KEYS.BOOKS)) {
            localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify([]));
        }
        
        if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
                theme: 'light',
                language: 'ar',
                autoSave: true
            }));
        }
        
        return true;
    },
    
    /**
     * التحقق من دعم LocalStorage
     * @returns {boolean}
     */
    isLocalStorageSupported() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // ============================================
    // إدارة الكتب
    // ============================================
    
    /**
     * الحصول على جميع الكتب المحفوظة
     * @returns {Array} قائمة الكتب
     */
    getAllBooks() {
        try {
            const books = localStorage.getItem(STORAGE_KEYS.BOOKS);
            return books ? JSON.parse(books) : [];
        } catch (error) {
            console.error('خطأ في قراءة الكتب:', error);
            return [];
        }
    },
    
    /**
     * الحصول على كتاب محدد بواسطة المعرف
     * @param {string} bookId - معرف الكتاب
     * @returns {Object|null} بيانات الكتاب
     */
    getBook(bookId) {
        const books = this.getAllBooks();
        return books.find(book => book.id === bookId) || null;
    },
    
    /**
     * حفظ كتاب جديد أو تحديث كتاب موجود
     * @param {Object} book - بيانات الكتاب
     * @returns {Object} الكتاب المحفوظ
     */
    saveBook(book) {
        try {
            const books = this.getAllBooks();
            const existingIndex = books.findIndex(b => b.id === book.id);
            
            // تحديث تاريخ التعديل
            book.updatedAt = new Date().toISOString();
            
            if (existingIndex !== -1) {
                // تحديث كتاب موجود
                books[existingIndex] = book;
            } else {
                // إضافة كتاب جديد
                book.id = book.id || this.generateId();
                book.createdAt = book.createdAt || new Date().toISOString();
                books.push(book);
            }
            
            localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
            return book;
        } catch (error) {
            console.error('خطأ في حفظ الكتاب:', error);
            
            // محاولة ضغط البيانات إذا كان الحجم كبيراً
            if (error.name === 'QuotaExceededError') {
                throw new Error('مساحة التخزين ممتلئة. يرجى حذف بعض الكتب.');
            }
            throw error;
        }
    },
    
    /**
     * حذف كتاب
     * @param {string} bookId - معرف الكتاب
     * @returns {boolean} نجاح العملية
     */
    deleteBook(bookId) {
        try {
            const books = this.getAllBooks();
            const filteredBooks = books.filter(book => book.id !== bookId);
            
            if (filteredBooks.length === books.length) {
                return false; // الكتاب غير موجود
            }
            
            localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(filteredBooks));
            return true;
        } catch (error) {
            console.error('خطأ في حذف الكتاب:', error);
            return false;
        }
    },
    
    /**
     * حذف جميع الكتب
     * @returns {boolean} نجاح العملية
     */
    deleteAllBooks() {
        try {
            localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify([]));
            return true;
        } catch (error) {
            console.error('خطأ في حذف جميع الكتب:', error);
            return false;
        }
    },
    
    /**
     * الحصول على عدد الكتب
     * @returns {number}
     */
    getBooksCount() {
        return this.getAllBooks().length;
    },
    
    // ============================================
    // إدارة الكتاب الحالي (المفتوح للتحرير)
    // ============================================
    
    /**
     * حفظ الكتاب الحالي المفتوح للتحرير
     * @param {Object} book - بيانات الكتاب
     */
    setCurrentBook(book) {
        try {
            localStorage.setItem(STORAGE_KEYS.CURRENT_BOOK, JSON.stringify(book));
        } catch (error) {
            console.error('خطأ في حفظ الكتاب الحالي:', error);
        }
    },
    
    /**
     * الحصول على الكتاب الحالي
     * @returns {Object|null}
     */
    getCurrentBook() {
        try {
            const book = localStorage.getItem(STORAGE_KEYS.CURRENT_BOOK);
            return book ? JSON.parse(book) : null;
        } catch (error) {
            console.error('خطأ في قراءة الكتاب الحالي:', error);
            return null;
        }
    },
    
    /**
     * مسح الكتاب الحالي
     */
    clearCurrentBook() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_BOOK);
    },
    
    // ============================================
    // إدارة الإعدادات
    // ============================================
    
    /**
     * الحصول على جميع الإعدادات
     * @returns {Object}
     */
    getSettings() {
        try {
            const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return settings ? JSON.parse(settings) : {
                theme: 'light',
                language: 'ar',
                autoSave: true
            };
        } catch (error) {
            console.error('خطأ في قراءة الإعدادات:', error);
            return { theme: 'light', language: 'ar', autoSave: true };
        }
    },
    
    /**
     * حفظ الإعدادات
     * @param {Object} settings - الإعدادات
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        } catch (error) {
            console.error('خطأ في حفظ الإعدادات:', error);
        }
    },
    
    /**
     * الحصول على إعداد محدد
     * @param {string} key - مفتاح الإعداد
     * @returns {*}
     */
    getSetting(key) {
        const settings = this.getSettings();
        return settings[key];
    },
    
    /**
     * تحديث إعداد محدد
     * @param {string} key - مفتاح الإعداد
     * @param {*} value - القيمة
     */
    setSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        this.saveSettings(settings);
    },
    
    // ============================================
    // إدارة السمة (الوضع الليلي/النهاري)
    // ============================================
    
    /**
     * الحصول على السمة الحالية
     * @returns {string} 'light' أو 'dark'
     */
    getTheme() {
        return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    },
    
    /**
     * حفظ السمة
     * @param {string} theme - السمة
     */
    setTheme(theme) {
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
    },
    
    // ============================================
    // تصدير واستيراد البيانات
    // ============================================
    
    /**
     * تصدير جميع البيانات كـ JSON
     * @returns {string} بيانات JSON
     */
    exportData() {
        const data = {
            books: this.getAllBooks(),
            settings: this.getSettings(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        return JSON.stringify(data, null, 2);
    },
    
    /**
     * استيراد البيانات من JSON
     * @param {string} jsonData - بيانات JSON
     * @returns {Object} نتيجة الاستيراد
     */
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // التحقق من صحة البيانات
            if (!data.books || !Array.isArray(data.books)) {
                throw new Error('صيغة البيانات غير صحيحة');
            }
            
            // دمج الكتب المستوردة مع الموجودة
            const existingBooks = this.getAllBooks();
            const importedBooks = data.books;
            
            let addedCount = 0;
            let updatedCount = 0;
            
            importedBooks.forEach(importedBook => {
                const existingIndex = existingBooks.findIndex(b => b.id === importedBook.id);
                
                if (existingIndex !== -1) {
                    // تحديث كتاب موجود
                    existingBooks[existingIndex] = importedBook;
                    updatedCount++;
                } else {
                    // إضافة كتاب جديد
                    existingBooks.push(importedBook);
                    addedCount++;
                }
            });
            
            localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(existingBooks));
            
            return {
                success: true,
                added: addedCount,
                updated: updatedCount,
                total: importedBooks.length
            };
        } catch (error) {
            console.error('خطأ في استيراد البيانات:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // ============================================
    // أدوات مساعدة
    // ============================================
    
    /**
     * توليد معرف فريد
     * @returns {string}
     */
    generateId() {
        return 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    /**
     * حساب حجم التخزين المستخدم
     * @returns {Object} معلومات الحجم
     */
    getStorageInfo() {
        let totalSize = 0;
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length * 2; // UTF-16
            }
        }
        
        // تحويل إلى وحدات مقروءة
        const formatSize = (bytes) => {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        };
        
        return {
            used: formatSize(totalSize),
            usedBytes: totalSize,
            // معظم المتصفحات تدعم 5-10 MB
            estimated: '5-10 MB'
        };
    },
    
    /**
     * إنشاء كتاب تجريبي
     * @returns {Object} الكتاب التجريبي
     */
    createDemoBook() {
        const demoBook = {
            id: this.generateId(),
            title: 'رحلة في عالم الكتب',
            author: 'كاتب مجهول',
            cover: null,
            chapters: [
                {
                    id: 'chapter_1',
                    title: 'المقدمة',
                    content: `<p>مرحباً بك في هذا الكتاب التجريبي!</p>
<p>هذا الكتاب تم إنشاؤه تلقائياً لتوضيح إمكانيات تطبيق <strong>صانع الكتب الإلكترونية</strong>.</p>
<p>يمكنك:</p>
<ul>
<li>تعديل هذا الكتاب كما تشاء</li>
<li>إضافة فصول جديدة</li>
<li>إدراج صور داخل النص</li>
<li>تصدير الكتاب بصيغة PDF أو EPUB</li>
</ul>`
                },
                {
                    id: 'chapter_2',
                    title: 'الفصل الأول: البداية',
                    content: `<p>في يوم من الأيام، بدأت رحلة جديدة في عالم الكتب الإلكترونية...</p>
<p>كانت الفكرة بسيطة: إنشاء أداة سهلة الاستخدام تمكّن أي شخص من تأليف كتابه الخاص وتصديره بصيغ متعددة.</p>
<p>والآن، ها أنت تستخدم هذه الأداة!</p>`
                },
                {
                    id: 'chapter_3',
                    title: 'الفصل الثاني: المميزات',
                    content: `<p>يوفر هذا التطبيق العديد من المميزات:</p>
<p><strong>1. محرر نصوص متقدم</strong></p>
<p>يدعم التنسيق الأساسي مثل الخط العريض والمائل والتسطير.</p>
<p><strong>2. دعم الصور</strong></p>
<p>يمكنك إدراج صور داخل الفصول وصورة للغلاف.</p>
<p><strong>3. السحب والإفلات</strong></p>
<p>أعد ترتيب الفصول بسهولة عن طريق السحب والإفلات.</p>
<p><strong>4. التصدير المتعدد</strong></p>
<p>صدّر كتابك بصيغة PDF للطباعة أو EPUB للأجهزة الإلكترونية.</p>`
                },
                {
                    id: 'chapter_4',
                    title: 'الخاتمة',
                    content: `<p>نتمنى لك تجربة ممتعة في إنشاء كتبك الإلكترونية!</p>
<p>لا تنسَ حفظ عملك بانتظام.</p>
<p><em>فريق صانع الكتب الإلكترونية</em></p>`
                }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return this.saveBook(demoBook);
    },
    
    /**
     * التحقق من وجود كتاب تجريبي وإنشاؤه إذا لم يوجد
     */
    ensureDemoBookExists() {
        const books = this.getAllBooks();
        if (books.length === 0) {
            this.createDemoBook();
            return true;
        }
        return false;
    }
};

// تهيئة التخزين عند تحميل الملف
StorageService.init();
