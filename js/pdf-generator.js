/**
 * ============================================
 * PDF Generator - مولد ملفات PDF
 * ============================================
 * هذا الملف مسؤول عن تحويل محتوى الكتاب إلى ملف PDF
 * يستخدم مكتبة jsPDF مع خط Amiri العربي لإنتاج نص حقيقي
 */

// ============================================
// إعدادات PDF الافتراضية
// ============================================
const PDF_CONFIG = {
    // أبعاد الصفحة (A4)
    pageWidth: 210,
    pageHeight: 297,
    
    // الهوامش
    marginTop: 25,
    marginBottom: 25,
    marginLeft: 20,
    marginRight: 20,
    
    // الخطوط
    titleFontSize: 24,
    authorFontSize: 14,
    chapterTitleFontSize: 18,
    bodyFontSize: 12,
    lineHeight: 8,
    
    // الألوان
    primaryColor: [99, 102, 241],
    textColor: [30, 41, 59],
    mutedColor: [100, 116, 139]
};

// متغير لتخزين حالة تحميل الخط
let fontLoaded = false;
let amiriFontBase64 = null;

// ============================================
// خريطة أشكال الحروف العربية
// ============================================
const ARABIC_GLYPHS = {
    // الحرف: [معزول, بداية, وسط, نهاية]
    'ا': ['ا', 'ا', 'ـا', 'ـا'],
    'أ': ['أ', 'أ', 'ـأ', 'ـأ'],
    'إ': ['إ', 'إ', 'ـإ', 'ـإ'],
    'آ': ['آ', 'آ', 'ـآ', 'ـآ'],
    'ب': ['ب', 'بـ', 'ـبـ', 'ـب'],
    'ت': ['ت', 'تـ', 'ـتـ', 'ـت'],
    'ث': ['ث', 'ثـ', 'ـثـ', 'ـث'],
    'ج': ['ج', 'جـ', 'ـجـ', 'ـج'],
    'ح': ['ح', 'حـ', 'ـحـ', 'ـح'],
    'خ': ['خ', 'خـ', 'ـخـ', 'ـخ'],
    'د': ['د', 'د', 'ـد', 'ـد'],
    'ذ': ['ذ', 'ذ', 'ـذ', 'ـذ'],
    'ر': ['ر', 'ر', 'ـر', 'ـر'],
    'ز': ['ز', 'ز', 'ـز', 'ـز'],
    'س': ['س', 'سـ', 'ـسـ', 'ـس'],
    'ش': ['ش', 'شـ', 'ـشـ', 'ـش'],
    'ص': ['ص', 'صـ', 'ـصـ', 'ـص'],
    'ض': ['ض', 'ضـ', 'ـضـ', 'ـض'],
    'ط': ['ط', 'طـ', 'ـطـ', 'ـط'],
    'ظ': ['ظ', 'ظـ', 'ـظـ', 'ـظ'],
    'ع': ['ع', 'عـ', 'ـعـ', 'ـع'],
    'غ': ['غ', 'غـ', 'ـغـ', 'ـغ'],
    'ف': ['ف', 'فـ', 'ـفـ', 'ـف'],
    'ق': ['ق', 'قـ', 'ـقـ', 'ـق'],
    'ك': ['ك', 'كـ', 'ـكـ', 'ـك'],
    'ل': ['ل', 'لـ', 'ـلـ', 'ـل'],
    'م': ['م', 'مـ', 'ـمـ', 'ـم'],
    'ن': ['ن', 'نـ', 'ـنـ', 'ـن'],
    'ه': ['ه', 'هـ', 'ـهـ', 'ـه'],
    'و': ['و', 'و', 'ـو', 'ـو'],
    'ي': ['ي', 'يـ', 'ـيـ', 'ـي'],
    'ى': ['ى', 'ى', 'ـى', 'ـى'],
    'ة': ['ة', 'ة', 'ـة', 'ـة'],
    'ء': ['ء', 'ء', 'ء', 'ء'],
    'ئ': ['ئ', 'ئـ', 'ـئـ', 'ـئ'],
    'ؤ': ['ؤ', 'ؤ', 'ـؤ', 'ـؤ'],
    'لا': ['لا', 'لا', 'ـلا', 'ـلا'],
    'لأ': ['لأ', 'لأ', 'ـلأ', 'ـلأ'],
    'لإ': ['لإ', 'لإ', 'ـلإ', 'ـلإ'],
    'لآ': ['لآ', 'لآ', 'ـلآ', 'ـلآ']
};

// الحروف التي لا تتصل بما بعدها
const NON_JOINING = ['ا', 'أ', 'إ', 'آ', 'د', 'ذ', 'ر', 'ز', 'و', 'ؤ', 'ة', 'ى'];

/**
 * تحميل خط Amiri العربي
 * @returns {Promise<string>} بيانات الخط بصيغة base64
 */
async function loadArabicFont() {
    if (amiriFontBase64) {
        return amiriFontBase64;
    }
    
    try {
        // تحميل خط Amiri من Google Fonts CDN
        const fontUrl = 'https://cdn.jsdelivr.net/gh/nickshanks/Amiri@master/Amiri-Regular.ttf';
        const response = await fetch(fontUrl);
        
        if (!response.ok) {
            throw new Error('فشل تحميل الخط');
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // تحويل إلى base64
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        amiriFontBase64 = btoa(binary);
        fontLoaded = true;
        
        return amiriFontBase64;
    } catch (error) {
        console.error('خطأ في تحميل الخط:', error);
        throw error;
    }
}

/**
 * تصدير الكتاب إلى PDF
 * يستخدم نافذة طباعة المتصفح للحصول على PDF نصي حقيقي
 */
async function exportToPDF() {
    const bookData = collectBookData();
    
    if (bookData.chapters.length === 0) {
        showToast('يجب إضافة فصل واحد على الأقل قبل التصدير', 'warning');
        return;
    }
    
    showLoading('جاري إنشاء ملف PDF...');
    
    try {
        // إنشاء نافذة طباعة جديدة
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            throw new Error('يرجى السماح بالنوافذ المنبثقة لتصدير PDF');
        }
        
        // إنشاء محتوى HTML للطباعة
        const printContent = generatePrintHTML(bookData);
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // انتظار تحميل الخطوط والصور
        await new Promise(resolve => {
            printWindow.onload = resolve;
            setTimeout(resolve, 2000); // احتياطي
        });
        
        hideLoading();
        
        // إظهار رسالة توجيهية
        showToast('اختر "حفظ كـ PDF" في نافذة الطباعة', 'info');
        
        // فتح نافذة الطباعة
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
    } catch (error) {
        hideLoading();
        console.error('خطأ في إنشاء PDF:', error);
        showToast('حدث خطأ: ' + error.message, 'error');
    }
}

/**
 * تحويل الرقم حسب نمط الترقيم في PDF
 * @param {number} num - الرقم
 * @param {string} style - نمط الترقيم
 * @returns {string} الرقم المنسق
 */
function formatTocNumberPDF(num, style) {
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

/**
 * إنشاء HTML الفهرس
 * @param {Object} bookData - بيانات الكتاب
 * @param {number} chaptersStartPage - رقم بداية صفحات الفصول
 * @returns {string} HTML الفهرس
 */
function generateTocHTML(bookData, chaptersStartPage) {
    // إذا كان الفهرس معطلاً
    if (bookData.tocSettings?.enabled === false) {
        return '';
    }
    
    const tocTitle = bookData.tocSettings?.title || 'فهرس المحتويات';
    const titleColor = bookData.tocSettings?.titleColor || '#1e293b';
    const titleFont = bookData.tocSettings?.titleFont || 'Cairo';
    const tocStyle = bookData.tocSettings?.style || 'dots';
    const numberStyle = bookData.tocSettings?.numberStyle || 'arabic';
    const chapterColor = bookData.tocSettings?.chapterColor || '#6366f1';
    const listFont = bookData.tocSettings?.listFont || 'Cairo';
    const listFontSize = bookData.tocSettings?.listFontSize || 13;
    
    // إنشاء عناصر الفهرس
    const tocItems = bookData.chapters.map((chapter, index) => {
        const formattedNumber = formatTocNumberPDF(index + 1, numberStyle);
        let separatorClass = 'toc-dots';
        if (tocStyle === 'line') separatorClass = 'toc-line';
        else if (tocStyle === 'none') separatorClass = 'toc-none';
        
        return `
            <div class="toc-item" style="font-family: '${listFont}', sans-serif; font-size: ${listFontSize}pt;">
                <span class="toc-item-number" style="color: ${chapterColor}; font-size: ${listFontSize}pt;">${formattedNumber}</span>
                <span class="toc-item-title" style="font-size: ${listFontSize}pt;">${escapeHTML(chapter.title)}</span>
                <span class="${separatorClass}"></span>
                <span class="toc-item-page" style="font-size: ${listFontSize}pt;">${chaptersStartPage + index}</span>
            </div>
        `;
    }).join('');
    
    return `
    <div class="page-wrapper toc-page">
        <div class="page-content">
            <div class="toc-header">
                <h2 class="toc-title" style="color: ${titleColor}; font-family: '${titleFont}', sans-serif;">
                    ${escapeHTML(tocTitle)}
                </h2>
                <div class="toc-divider"></div>
            </div>
            <div class="toc-list" style="font-family: '${listFont}', sans-serif;">
                ${tocItems}
            </div>
        </div>
    </div>
    `;
}

/**
 * إنشاء محتوى HTML للطباعة
 * الغلاف ملء الصفحة + ترقيم صفحات مطابق للفهرس
 */
function generatePrintHTML(bookData) {
    // الترقيم يبدأ من الفصول فقط (الفصل الأول = صفحة 1)
    // الغلاف والفهرس بدون ترقيم
    const chaptersStartPage = 1;
    
    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>${escapeHTML(bookData.title)}</title>
    <!-- جميع الخطوط العربية والإنجليزية -->
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&family=Almarai:wght@400;700&family=Changa:wght@400;600;700&family=El+Messiri:wght@400;600;700&family=Noto+Kufi+Arabic:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=Scheherazade+New:wght@400;700&family=Lateef:wght@400;700&family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Lora:wght@400;600;700&family=Merriweather:wght@400;700&family=Oswald:wght@400;500;600;700&family=Dancing+Script:wght@400;700&family=Pacifico&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Amiri', 'Cairo', 'Traditional Arabic', serif;
            font-size: 14pt;
            line-height: 2;
            color: #1e293b;
            direction: rtl;
            text-align: right;
            background: white;
        }
        
        /* ========== صفحة الغلاف - ملء الشاشة بتصميم مخصص ========== */
        .cover-page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            position: relative;
            overflow: hidden;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
        }
        
        .cover-title-element,
        .cover-author-element {
            position: absolute;
            text-align: center;
            max-width: 90%;
            word-wrap: break-word;
            line-height: 1.3;
        }
        
        .cover-footer {
            position: absolute;
            bottom: 30px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10pt;
            color: rgba(255, 255, 255, 0.7);
            font-family: 'Cairo', sans-serif;
            text-shadow: 0 1px 3px rgba(0,0,0,0.5);
            z-index: 5;
        }
        
        /* ========== هيكل الصفحة العام ========== */
        .page-wrapper {
            width: 210mm;
            min-height: 297mm;
            background: white;
            position: relative;
            page-break-after: always;
            display: flex;
            flex-direction: column;
        }
        
        .page-content {
            flex: 1;
            padding: 2cm 2cm 1cm 2cm;
            max-height: calc(297mm - 3cm); /* ترك مساحة للتذييل */
            overflow: hidden;
        }
        
        .page-footer {
            height: 2cm;
            padding: 0 2cm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: white;
        }
        
        .footer-line {
            width: 100%;
            height: 1px;
            background: #e2e8f0;
            margin-bottom: 10px;
        }
        
        .footer-page-number {
            font-family: 'Cairo', sans-serif;
            font-size: 11pt;
            color: #64748b;
        }
        
        /* ========== فهرس المحتويات ========== */
        .toc-page .page-content {
            max-height: calc(297mm - 4cm); /* منع التراكب مع التذييل */
            overflow: visible;
        }
        
        .toc-header {
            text-align: center;
            margin-bottom: 35px;
        }
        
        .toc-title {
            font-size: 26pt;
            font-weight: 700;
            margin-bottom: 15px;
        }
        
        .toc-subtitle {
            font-size: 12pt;
            color: #94a3b8;
        }
        
        .toc-divider {
            width: 80px;
            height: 2px;
            background: #e2e8f0;
            margin: 15px auto 30px;
        }
        
        .toc-list {
            max-width: 100%;
        }
        
        .toc-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
            page-break-inside: avoid; /* منع تقسيم العنصر */
        }
        
        .toc-item:last-child {
            border-bottom: none;
        }
        
        .toc-item-number {
            width: 24px;
            height: 24px;
            font-size: 12pt;
            font-weight: 600;
            margin-left: 10px;
            flex-shrink: 0;
        }
        
        .toc-item-title {
            font-size: 13pt;
            color: #1e293b;
            flex: 1;
        }
        
        .toc-item-page {
            font-size: 12pt;
            color: #64748b;
            font-weight: 500;
            margin-right: 10px;
        }
        
        .toc-dots {
            flex: 1;
            border-bottom: 1px dotted #cbd5e1;
            margin: 0 15px;
            height: 1px;
            align-self: flex-end;
            margin-bottom: 6px;
        }
        
        .toc-line {
            flex: 1;
            border-bottom: 1px solid #cbd5e1;
            margin: 0 15px;
            height: 1px;
            align-self: flex-end;
            margin-bottom: 6px;
        }
        
        .toc-none {
            flex: 1;
            margin: 0 15px;
        }
        
        /* ========== صفحات الفصول ========== */
        .chapter-header {
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .chapter-title {
            font-size: 24pt;
            color: #1e293b;
            font-weight: 700;
            font-family: 'Cairo', sans-serif;
            line-height: 1.4;
        }
        
        .chapter-content {
            font-size: 14pt;
            line-height: 2;
            text-align: justify;
        }
        
        .chapter-content p {
            margin-bottom: 15px;
            text-indent: 30px;
        }
        
        .chapter-content p:first-child {
            text-indent: 0;
        }
        
        .chapter-content img {
            max-width: 100%;
            height: auto;
            margin: 20px auto;
            display: block;
        }
        
        .chapter-content ul, .chapter-content ol {
            margin: 15px 30px 15px 0;
            padding: 0;
        }
        
        .chapter-content li {
            margin-bottom: 8px;
        }
        
        .chapter-content strong, .chapter-content b {
            font-weight: 700;
        }
        
        .chapter-content em, .chapter-content i {
            font-style: italic;
        }
        
        .chapter-content blockquote {
            margin: 20px 0;
            padding: 15px 25px;
            border-right: 3px solid #94a3b8;
            color: #475569;
        }
        
        .chapter-content h1, .chapter-content h2, .chapter-content h3 {
            margin-top: 25px;
            margin-bottom: 12px;
            font-family: 'Cairo', sans-serif;
        }
        
        .chapter-content hr {
            border: none;
            height: 1px;
            background: #e2e8f0;
            margin: 25px 0;
        }
        
        /* ========== طباعة ========== */
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .cover-page {
                page-break-after: always;
            }
            
            .page-wrapper {
                page-break-after: always;
            }
        }
    </style>
</head>
<body>
    <!-- صفحة الغلاف - تصميم مخصص -->
    <div class="cover-page" style="
        ${bookData.coverSettings?.backgroundImage ? 
            `background-image: url('${bookData.coverSettings.backgroundImage}'); background-size: cover; background-position: center;` : 
            `background: ${bookData.coverSettings?.backgroundColor || 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'};`
        }
    ">
        <!-- العنوان -->
        <div class="cover-title-element" style="
            position: absolute;
            left: ${bookData.coverSettings?.title?.x || 50}%;
            top: ${bookData.coverSettings?.title?.y || 35}%;
            transform: translate(-50%, -50%);
            font-size: ${(bookData.coverSettings?.title?.fontSize || 32) * 1.2}pt;
            color: ${bookData.coverSettings?.title?.color || '#ffffff'};
            font-family: '${bookData.coverSettings?.title?.fontFamily || 'Cairo'}', sans-serif;
            font-weight: 700;
            text-shadow: 0 4px 8px rgba(0,0,0,0.4);
            text-align: center;
            max-width: 90%;
            word-wrap: break-word;
            z-index: 10;
        ">${escapeHTML(bookData.title)}</div>
        
        <!-- اسم المؤلف -->
        <div class="cover-author-element" style="
            position: absolute;
            left: ${bookData.coverSettings?.author?.x || 50}%;
            top: ${bookData.coverSettings?.author?.y || 50}%;
            transform: translate(-50%, -50%);
            font-size: ${(bookData.coverSettings?.author?.fontSize || 18) * 1.2}pt;
            color: ${bookData.coverSettings?.author?.color || '#e2e8f0'};
            font-family: '${bookData.coverSettings?.author?.fontFamily || 'Cairo'}', sans-serif;
            font-weight: 500;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 90%;
            z-index: 10;
        ">${escapeHTML(bookData.author)}</div>
        
        <!-- النصوص الإضافية -->
        ${(bookData.coverSettings?.extraTexts || []).map(et => `
            <div class="cover-extra-text" style="
                position: absolute;
                left: ${et.x || 50}%;
                top: ${et.y || 70}%;
                transform: translate(-50%, -50%);
                font-size: ${(et.fontSize || 14) * 1.2}pt;
                color: ${et.color || '#ffffff'};
                font-family: '${et.fontFamily || 'Cairo'}', sans-serif;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 90%;
                z-index: 10;
            ">${escapeHTML(et.text)}</div>
        `).join('')}
        
        <div class="cover-footer">
            
        </div>
    </div>
    
    <!-- فهرس المحتويات - بدون ترقيم -->
    ${generateTocHTML(bookData, chaptersStartPage)}
    
    <!-- الفصول -->
    ${bookData.chapters.map((chapter, index) => `
        <div class="page-wrapper chapter-page" id="chapter-${index + 1}">
            <div class="page-content">
                <div class="chapter-header">
                    <h2 class="chapter-title">${escapeHTML(chapter.title)}</h2>
                </div>
                <div class="chapter-content">
                    ${formatChapterContent(chapter.content)}
                </div>
            </div>
            <div class="page-footer">
                <div class="footer-line"></div>
                <span class="footer-page-number">${chaptersStartPage + index}</span>
            </div>
        </div>
    `).join('')}
</body>
</html>`;
}

/**
 * تنسيق محتوى الفصل
 */
function formatChapterContent(content) {
    if (!content) return '<p></p>';
    
    // تنظيف المحتوى
    let formatted = content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '');
    
    // التأكد من أن النص في فقرات
    if (!formatted.includes('<p>') && !formatted.includes('<div>')) {
        formatted = '<p>' + formatted.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
    }
    
    return formatted;
}

/**
 * توليد محتوى PDF كنص حقيقي
 * @param {jsPDF} doc - مستند PDF
 * @param {Object} bookData - بيانات الكتاب
 */
async function generatePDFContent(doc, bookData) {
    const pageWidth = PDF_CONFIG.pageWidth;
    const pageHeight = PDF_CONFIG.pageHeight;
    const marginTop = PDF_CONFIG.marginTop;
    const marginBottom = PDF_CONFIG.marginBottom;
    const marginLeft = PDF_CONFIG.marginLeft;
    const marginRight = PDF_CONFIG.marginRight;
    const contentWidth = pageWidth - marginLeft - marginRight;
    
    // ========== صفحة الغلاف ==========
    await createCoverPage(doc, bookData, pageWidth, pageHeight);
    
    // ========== فهرس المحتويات ==========
    doc.addPage();
    createTableOfContents(doc, bookData, contentWidth, marginRight, marginTop);
    
    // ========== الفصول ==========
    for (let i = 0; i < bookData.chapters.length; i++) {
        doc.addPage();
        await createChapterPage(doc, bookData.chapters[i], i + 1, {
            contentWidth,
            marginRight,
            marginTop,
            marginBottom,
            pageHeight
        });
    }
}

/**
 * إنشاء صفحة الغلاف
 */
async function createCoverPage(doc, bookData, pageWidth, pageHeight) {
    const centerX = pageWidth / 2;
    let yPos = 50;
    
    // إضافة صورة الغلاف إذا وجدت
    if (bookData.cover && bookData.cover.startsWith('data:image')) {
        try {
            const imgProps = doc.getImageProperties(bookData.cover);
            const maxWidth = 80;
            const maxHeight = 110;
            
            let imgWidth = imgProps.width;
            let imgHeight = imgProps.height;
            
            // حساب الأبعاد مع الحفاظ على النسبة
            if (imgWidth > maxWidth) {
                const ratio = maxWidth / imgWidth;
                imgWidth = maxWidth;
                imgHeight = imgHeight * ratio;
            }
            if (imgHeight > maxHeight) {
                const ratio = maxHeight / imgHeight;
                imgHeight = maxHeight;
                imgWidth = imgWidth * ratio;
            }
            
            const imgX = centerX - (imgWidth / 2);
            doc.addImage(bookData.cover, 'JPEG', imgX, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 20;
        } catch (e) {
            console.warn('خطأ في إضافة صورة الغلاف:', e);
            yPos = 100;
        }
    } else {
        // رسم مستطيل كغلاف افتراضي
        doc.setFillColor(99, 102, 241);
        doc.roundedRect(centerX - 35, yPos, 70, 95, 3, 3, 'F');
        
        // إضافة رمز الكتاب
        doc.setFontSize(40);
        doc.setTextColor(255, 255, 255);
        doc.text('📖', centerX, yPos + 55, { align: 'center' });
        
        yPos += 115;
    }
    
    // العنوان
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(PDF_CONFIG.titleFontSize);
    doc.setTextColor(...PDF_CONFIG.textColor);
    
    const titleLines = doc.splitTextToSize(bookData.title, 150);
    const titleHeight = titleLines.length * 12;
    
    // كتابة العنوان من اليمين لليسار
    titleLines.forEach((line, index) => {
        const reversedLine = reverseArabicText(line);
        doc.text(reversedLine, centerX, yPos + (index * 12), { align: 'center' });
    });
    
    yPos += titleHeight + 15;
    
    // اسم المؤلف
    doc.setFontSize(PDF_CONFIG.authorFontSize);
    doc.setTextColor(...PDF_CONFIG.mutedColor);
    const authorReversed = reverseArabicText(bookData.author);
    doc.text(authorReversed, centerX, yPos, { align: 'center' });
    
    yPos += 20;
    
    // خط زخرفي
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(1);
    doc.line(centerX - 30, yPos, centerX + 30, yPos);
    
    // رقم الصفحة
    addPageNumber(doc, 1, pageWidth, pageHeight);
}

/**
 * إنشاء فهرس المحتويات
 */
function createTableOfContents(doc, bookData, contentWidth, marginRight, marginTop) {
    let yPos = marginTop;
    
    // العنوان
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241);
    
    const tocTitle = reverseArabicText('فهرس المحتويات');
    doc.text(tocTitle, PDF_CONFIG.pageWidth - marginRight, yPos, { align: 'right' });
    
    yPos += 8;
    
    // خط تحت العنوان
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(marginRight + 20, yPos, PDF_CONFIG.pageWidth - marginRight, yPos);
    
    yPos += 15;
    
    // عناصر الفهرس
    doc.setFontSize(12);
    doc.setTextColor(...PDF_CONFIG.textColor);
    
    bookData.chapters.forEach((chapter, index) => {
        // رقم الصفحة (الفصول تبدأ من 1)
        const pageNum = (index + 1).toString();
        doc.setTextColor(...PDF_CONFIG.mutedColor);
        doc.text(pageNum, marginRight + 20, yPos, { align: 'left' });
        
        // عنوان الفصل
        doc.setTextColor(...PDF_CONFIG.textColor);
        const chapterTitle = reverseArabicText(chapter.title);
        doc.text(chapterTitle, PDF_CONFIG.pageWidth - marginRight, yPos, { align: 'right' });
        
        // خط منقط
        doc.setDrawColor(200, 200, 200);
        doc.setLineDashPattern([1, 2], 0);
        doc.line(marginRight + 30, yPos - 2, PDF_CONFIG.pageWidth - marginRight - 60, yPos - 2);
        doc.setLineDashPattern([], 0);
        
        yPos += 12;
    });
    
    // الفهرس بدون ترقيم
}

/**
 * إنشاء صفحة فصل
 */
async function createChapterPage(doc, chapter, chapterNumber, config) {
    const { contentWidth, marginRight, marginTop, marginBottom, pageHeight } = config;
    let yPos = marginTop;
    // الترقيم يبدأ من الفصول (الفصل الأول = صفحة 1)
    let currentPage = chapterNumber;
    
    // عنوان الفصل مباشرة
    doc.setFontSize(PDF_CONFIG.chapterTitleFontSize);
    doc.setTextColor(...PDF_CONFIG.textColor);
    const chapterTitle = reverseArabicText(chapter.title);
    doc.text(chapterTitle, PDF_CONFIG.pageWidth - marginRight, yPos, { align: 'right' });
    
    yPos += 8;
    
    // خط فاصل
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(PDF_CONFIG.marginLeft, yPos, PDF_CONFIG.pageWidth - marginRight, yPos);
    
    yPos += 15;
    
    // المحتوى
    doc.setFontSize(PDF_CONFIG.bodyFontSize);
    doc.setTextColor(...PDF_CONFIG.textColor);
    
    // تحويل HTML إلى نص
    const plainText = htmlToPlainText(chapter.content);
    const paragraphs = plainText.split('\n').filter(p => p.trim());
    
    for (const paragraph of paragraphs) {
        // تقسيم الفقرة إلى أسطر
        const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);
        
        for (const line of lines) {
            // التحقق من الحاجة لصفحة جديدة
            if (yPos > pageHeight - marginBottom - 10) {
                addPageNumber(doc, currentPage, PDF_CONFIG.pageWidth, pageHeight);
                doc.addPage();
                currentPage++;
                yPos = marginTop;
            }
            
            // كتابة السطر (مع عكس النص العربي)
            const reversedLine = reverseArabicText(line.trim());
            doc.text(reversedLine, PDF_CONFIG.pageWidth - marginRight, yPos, { align: 'right' });
            yPos += PDF_CONFIG.lineHeight;
        }
        
        // مسافة بين الفقرات
        yPos += 4;
    }
    
    // معالجة الصور في المحتوى
    const images = extractImagesFromHTML(chapter.content);
    for (const imgSrc of images) {
        if (yPos > pageHeight - marginBottom - 60) {
            addPageNumber(doc, currentPage, PDF_CONFIG.pageWidth, pageHeight);
            doc.addPage();
            currentPage++;
            yPos = marginTop;
        }
        
        try {
            const imgProps = doc.getImageProperties(imgSrc);
            let imgWidth = Math.min(imgProps.width * 0.264583, contentWidth);
            let imgHeight = imgWidth * (imgProps.height / imgProps.width);
            
            if (imgHeight > 80) {
                imgHeight = 80;
                imgWidth = imgHeight * (imgProps.width / imgProps.height);
            }
            
            const imgX = (PDF_CONFIG.pageWidth - imgWidth) / 2;
            doc.addImage(imgSrc, 'JPEG', imgX, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 10;
        } catch (e) {
            console.warn('خطأ في إضافة صورة:', e);
        }
    }
    
    addPageNumber(doc, currentPage, PDF_CONFIG.pageWidth, pageHeight);
}

/**
 * إضافة رقم الصفحة
 */
function addPageNumber(doc, pageNum, pageWidth, pageHeight) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(pageNum.toString(), pageWidth / 2, pageHeight - 15, { align: 'center' });
}

/**
 * التحقق إذا كان الحرف عربياً
 */
function isArabicChar(char) {
    const code = char.charCodeAt(0);
    return (code >= 0x0600 && code <= 0x06FF) || 
           (code >= 0x0750 && code <= 0x077F) ||
           (code >= 0x08A0 && code <= 0x08FF) ||
           (code >= 0xFB50 && code <= 0xFDFF) ||
           (code >= 0xFE70 && code <= 0xFEFF);
}

/**
 * التحقق إذا كان الحرف حرفاً لا يتصل بما بعده
 */
function isNonJoining(char) {
    return NON_JOINING.includes(char);
}

/**
 * معالجة النص العربي للعرض الصحيح في PDF
 * @param {string} text - النص الأصلي
 * @returns {string} النص المعالج والمعكوس
 */
function reverseArabicText(text) {
    if (!text) return '';
    
    // التحقق من وجود أحرف عربية
    const hasArabic = [...text].some(isArabicChar);
    
    if (!hasArabic) {
        return text;
    }
    
    // معالجة النص كلمة كلمة
    const words = text.split(/(\s+)/);
    const processedWords = words.map(word => {
        if (!word.trim()) return word; // مسافات
        
        const hasArabicChars = [...word].some(isArabicChar);
        if (!hasArabicChars) return word;
        
        // عكس الكلمة العربية
        return word.split('').reverse().join('');
    });
    
    // عكس ترتيب الكلمات للنص العربي
    return processedWords.reverse().join('');
}

/**
 * استخراج الصور من HTML
 */
function extractImagesFromHTML(html) {
    const images = [];
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    temp.querySelectorAll('img').forEach(img => {
        if (img.src && img.src.startsWith('data:image')) {
            images.push(img.src);
        }
    });
    
    return images;
}

/**
 * تحويل HTML إلى نص عادي
 */
function htmlToPlainText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // إزالة الصور
    temp.querySelectorAll('img').forEach(el => el.remove());
    
    // استبدال العناصر بفواصل
    temp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    temp.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6').forEach(el => {
        el.prepend(document.createTextNode('\n'));
        el.append(document.createTextNode('\n'));
    });
    temp.querySelectorAll('li').forEach(el => {
        el.prepend(document.createTextNode('\n• '));
    });
    
    // إزالة السكريبتات والأنماط
    temp.querySelectorAll('script, style').forEach(el => el.remove());
    
    let text = temp.textContent || temp.innerText || '';
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text.trim();
}

/**
 * تنظيف اسم الملف
 */
function sanitizeFileName(fileName) {
    return fileName
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '-')
        .substring(0, 100) || 'كتاب';
}

/**
 * تحويل النص لـ HTML آمن
 */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
