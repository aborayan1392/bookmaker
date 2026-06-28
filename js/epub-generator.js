/**
 * ============================================
 * EPUB Generator - مولد ملفات EPUB
 * ============================================
 * هذا الملف مسؤول عن تحويل محتوى الكتاب إلى ملف EPUB
 * يتم بناء ملف EPUB يدوياً باستخدام JSZip
 * 
 * هيكل ملف EPUB:
 * ├── mimetype
 * ├── META-INF/
 * │   └── container.xml
 * └── OEBPS/
 *     ├── content.opf
 *     ├── toc.ncx
 *     ├── nav.xhtml
 *     ├── styles.css
 *     ├── cover.xhtml
 *     ├── chapter-1.xhtml
 *     ├── chapter-2.xhtml
 *     └── images/
 *         └── cover.jpg
 */

// ============================================
// معرفات EPUB
// ============================================
const EPUB_CONFIG = {
    version: '3.0',
    language: 'ar',
    direction: 'rtl',
    creator: 'E-Book Maker',
    identifier: 'ebook-maker-'
};

/**
 * تصدير الكتاب إلى EPUB
 */
async function exportToEPUB() {
    // جمع بيانات الكتاب
    const bookData = collectBookData();
    
    // التحقق من وجود محتوى
    if (bookData.chapters.length === 0) {
        showToast('يجب إضافة فصل واحد على الأقل قبل التصدير', 'warning');
        return;
    }
    
    showLoading('جاري إنشاء ملف EPUB...');
    
    try {
        // إنشاء ملف ZIP جديد
        const zip = new JSZip();
        
        // إنشاء معرف فريد للكتاب
        const bookId = EPUB_CONFIG.identifier + Date.now();
        
        // ========== mimetype ==========
        // يجب أن يكون أول ملف وبدون ضغط
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        
        // ========== META-INF/container.xml ==========
        zip.file('META-INF/container.xml', createContainerXML());
        
        // ========== OEBPS/content.opf ==========
        zip.file('OEBPS/content.opf', createContentOPF(bookData, bookId));
        
        // ========== OEBPS/toc.ncx ==========
        zip.file('OEBPS/toc.ncx', createTocNCX(bookData, bookId));
        
        // ========== OEBPS/nav.xhtml ==========
        zip.file('OEBPS/nav.xhtml', createNavXHTML(bookData));
        
        // ========== OEBPS/styles.css ==========
        zip.file('OEBPS/styles.css', createStylesCSS());
        
        // ========== OEBPS/cover.xhtml ==========
        zip.file('OEBPS/cover.xhtml', createCoverXHTML(bookData));
        
        // ========== صورة الغلاف ==========
        if (bookData.cover) {
            const coverData = await dataURLtoBlob(bookData.cover);
            const extension = getImageExtension(bookData.cover);
            zip.file(`OEBPS/images/cover.${extension}`, coverData);
        }
        
        // ========== الفصول ==========
        for (let i = 0; i < bookData.chapters.length; i++) {
            const chapter = bookData.chapters[i];
            const chapterXHTML = createChapterXHTML(chapter, i + 1);
            zip.file(`OEBPS/chapter-${i + 1}.xhtml`, chapterXHTML);
            
            // استخراج الصور من الفصل
            const images = extractImagesFromContent(chapter.content);
            for (let j = 0; j < images.length; j++) {
                const imgData = await dataURLtoBlob(images[j].src);
                const ext = getImageExtension(images[j].src);
                zip.file(`OEBPS/images/chapter-${i + 1}-img-${j + 1}.${ext}`, imgData);
            }
        }
        
        // توليد الملف
        const content = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/epub+zip',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });
        
        // حفظ الملف
        const fileName = sanitizeFileName(bookData.title) + '.epub';
        saveAs(content, fileName);
        
        hideLoading();
        showToast('تم إنشاء ملف EPUB بنجاح', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('خطأ في إنشاء EPUB:', error);
        showToast('حدث خطأ في إنشاء ملف EPUB', 'error');
    }
}

// ============================================
// ملفات EPUB الأساسية
// ============================================

/**
 * إنشاء ملف container.xml
 * @returns {string} محتوى XML
 */
function createContainerXML() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`;
}

/**
 * إنشاء ملف content.opf (حزمة الكتاب)
 * @param {Object} bookData - بيانات الكتاب
 * @param {string} bookId - معرف الكتاب
 * @returns {string} محتوى OPF
 */
function createContentOPF(bookData, bookId) {
    const creationDate = new Date().toISOString().split('T')[0];
    
    // بناء قائمة العناصر (manifest)
    let manifestItems = `
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        <item id="css" href="styles.css" media-type="text/css"/>
        <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`;
    
    // إضافة صورة الغلاف
    if (bookData.cover) {
        const ext = getImageExtension(bookData.cover);
        const mediaType = getMediaType(ext);
        manifestItems += `
        <item id="cover-image" href="images/cover.${ext}" media-type="${mediaType}" properties="cover-image"/>`;
    }
    
    // إضافة الفصول
    for (let i = 0; i < bookData.chapters.length; i++) {
        manifestItems += `
        <item id="chapter-${i + 1}" href="chapter-${i + 1}.xhtml" media-type="application/xhtml+xml"/>`;
        
        // إضافة صور الفصول
        const images = extractImagesFromContent(bookData.chapters[i].content);
        for (let j = 0; j < images.length; j++) {
            const ext = getImageExtension(images[j].src);
            const mediaType = getMediaType(ext);
            manifestItems += `
        <item id="chapter-${i + 1}-img-${j + 1}" href="images/chapter-${i + 1}-img-${j + 1}.${ext}" media-type="${mediaType}"/>`;
        }
    }
    
    // بناء ترتيب القراءة (spine)
    let spineItems = `
        <itemref idref="cover"/>`;
    
    for (let i = 0; i < bookData.chapters.length; i++) {
        spineItems += `
        <itemref idref="chapter-${i + 1}"/>`;
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" dir="rtl" xml:lang="ar">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:identifier id="BookId">${escapeXML(bookId)}</dc:identifier>
        <dc:title dir="rtl">${escapeXML(bookData.title)}</dc:title>
        <dc:creator>${escapeXML(bookData.author)}</dc:creator>
        <dc:language>ar</dc:language>
        <dc:date>${creationDate}</dc:date>
        <dc:publisher>${EPUB_CONFIG.creator}</dc:publisher>
        <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
    </metadata>
    
    <manifest>${manifestItems}
    </manifest>
    
    <spine toc="ncx" page-progression-direction="rtl">${spineItems}
    </spine>
</package>`;
}

/**
 * إنشاء ملف toc.ncx (جدول المحتويات للإصدارات القديمة)
 * @param {Object} bookData - بيانات الكتاب
 * @param {string} bookId - معرف الكتاب
 * @returns {string} محتوى NCX
 */
function createTocNCX(bookData, bookId) {
    let navPoints = '';
    
    // الغلاف
    navPoints += `
        <navPoint id="cover" playOrder="1">
            <navLabel><text>الغلاف</text></navLabel>
            <content src="cover.xhtml"/>
        </navPoint>`;
    
    // الفصول
    for (let i = 0; i < bookData.chapters.length; i++) {
        const chapter = bookData.chapters[i];
        navPoints += `
        <navPoint id="chapter-${i + 1}" playOrder="${i + 2}">
            <navLabel><text>${escapeXML(chapter.title)}</text></navLabel>
            <content src="chapter-${i + 1}.xhtml"/>
        </navPoint>`;
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="ar" dir="rtl">
    <head>
        <meta name="dtb:uid" content="${escapeXML(bookId)}"/>
        <meta name="dtb:depth" content="1"/>
        <meta name="dtb:totalPageCount" content="0"/>
        <meta name="dtb:maxPageNumber" content="0"/>
    </head>
    <docTitle><text>${escapeXML(bookData.title)}</text></docTitle>
    <docAuthor><text>${escapeXML(bookData.author)}</text></docAuthor>
    <navMap>${navPoints}
    </navMap>
</ncx>`;
}

/**
 * تحويل الرقم حسب نمط الترقيم في EPUB
 */
function formatTocNumberEPUB(num, style) {
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
 * إنشاء ملف nav.xhtml (جدول المحتويات لـ EPUB 3) - تصميم احترافي
 * @param {Object} bookData - بيانات الكتاب
 * @returns {string} محتوى XHTML
 */
function createNavXHTML(bookData) {
    // إعدادات الفهرس
    const tocTitle = bookData.tocSettings?.title || 'فهرس المحتويات';
    const titleColor = bookData.tocSettings?.titleColor || '#1e293b';
    const titleFont = bookData.tocSettings?.titleFont || 'Cairo';
    const numberStyle = bookData.tocSettings?.numberStyle || 'arabic';
    const chapterColor = bookData.tocSettings?.chapterColor || '#6366f1';
    const listFont = bookData.tocSettings?.listFont || 'Cairo';
    const listFontSize = bookData.tocSettings?.listFontSize || 13;
    
    let tocItems = `
                <li>
                    <a href="cover.xhtml">الغلاف</a>
                </li>`;
    
    for (let i = 0; i < bookData.chapters.length; i++) {
        const chapter = bookData.chapters[i];
        const formattedNumber = formatTocNumberEPUB(i + 1, numberStyle);
        tocItems += `
                <li style="font-family: '${listFont}', sans-serif; font-size: ${listFontSize}pt;">
                    <span class="toc-number" style="color: ${chapterColor};">${formattedNumber}</span>
                    <a href="chapter-${i + 1}.xhtml" style="font-size: ${listFontSize}pt;">${escapeXML(chapter.title)}</a>
                    <span class="toc-page-num">${formattedNumber}</span>
                </li>`;
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ar" dir="rtl">
<head>
    <title>${escapeXML(tocTitle)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body class="toc-page">
    <nav epub:type="toc" id="toc">
        <h1 style="color: ${titleColor}; font-family: '${titleFont}', sans-serif;">${escapeXML(tocTitle)}</h1>
        <div class="toc-divider"></div>
        <ol style="font-family: '${listFont}', sans-serif;">${tocItems}
        </ol>
    </nav>
</body>
</html>`;
}

/**
 * إنشاء ملف styles.css - تصميم احترافي
 * @returns {string} محتوى CSS
 */
function createStylesCSS() {
    return `/* ============================================
   أنماط الكتاب الإلكتروني - تصميم احترافي
   ============================================ */
@charset "UTF-8";

/* استيراد الخطوط */
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');

/* ============================================
   إعدادات الصفحة الأساسية
   ============================================ */
html {
    font-size: 16px;
}

body {
    font-family: 'Amiri', 'Cairo', 'Traditional Arabic', serif;
    direction: rtl;
    text-align: justify;
    line-height: 2;
    margin: 0;
    padding: 1.5em 2em;
    font-size: 1.1em;
    color: #2d3748;
    background-color: #ffffff;
    -webkit-hyphens: auto;
    hyphens: auto;
}

/* ============================================
   صفحة الغلاف
   ============================================ */
.cover-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 90vh;
    text-align: center;
    padding: 2em;
    background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.cover-image-container {
    margin-bottom: 2.5em;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    overflow: hidden;
}

.cover-page img {
    max-width: 100%;
    max-height: 60vh;
    display: block;
}

.cover-title {
    font-family: 'Cairo', sans-serif;
    font-size: 2.8em;
    font-weight: 700;
    color: #1a202c;
    margin: 0.3em 0;
    line-height: 1.3;
    letter-spacing: -0.02em;
}

.cover-author {
    font-family: 'Tajawal', sans-serif;
    font-size: 1.4em;
    font-weight: 500;
    color: #6366f1;
    margin: 0.5em 0;
}

.cover-divider {
    width: 80px;
    height: 4px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    margin: 1.5em auto;
    border-radius: 2px;
}

.cover-extra-text {
    font-size: 1.1em;
    color: #4a5568;
    margin: 0.5em 0;
    font-style: italic;
}

.cover-publisher {
    font-size: 0.9em;
    color: #718096;
    margin-top: 2em;
    padding-top: 1.5em;
    border-top: 1px solid #e2e8f0;
}

/* ============================================
   فهرس المحتويات
   ============================================ */
.toc-page {
    padding: 2em;
}

.toc-page h1 {
    font-family: 'Cairo', sans-serif;
    font-size: 2em;
    color: #1a202c;
    text-align: center;
    margin-bottom: 0.5em;
    font-weight: 700;
}

.toc-divider {
    width: 60px;
    height: 3px;
    background: #6366f1;
    margin: 0 auto 2em;
    border-radius: 2px;
}

nav#toc ol {
    list-style: none;
    padding: 0;
    margin: 0;
}

nav#toc li {
    display: flex;
    align-items: baseline;
    padding: 1em 0;
    border-bottom: 1px solid #e2e8f0;
}

nav#toc li:last-child {
    border-bottom: none;
}

nav#toc .toc-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: #6366f1;
    color: white;
    border-radius: 50%;
    font-size: 0.85em;
    font-weight: 600;
    margin-left: 1em;
    flex-shrink: 0;
}

nav#toc a {
    flex: 1;
    color: #2d3748;
    font-size: 1.1em;
    font-weight: 500;
    text-decoration: none;
}

nav#toc .toc-page-num {
    color: #6366f1;
    font-weight: 600;
    margin-right: 1em;
}

/* ============================================
   صفحات الفصول
   ============================================ */
.chapter-page {
    page-break-before: always;
}

.chapter-header {
    text-align: center;
    margin-bottom: 3em;
    padding: 2em 0;
    border-bottom: 2px solid #e2e8f0;
}

.chapter-header h2 {
    font-family: 'Cairo', sans-serif;
    font-size: 2em;
    font-weight: 700;
    color: #1a202c;
    margin: 0;
    line-height: 1.4;
}

.chapter-header::before {
    content: "❧";
    display: block;
    font-size: 1.5em;
    color: #6366f1;
    margin-bottom: 0.5em;
}

.chapter-content {
    font-size: 1.1em;
    line-height: 2.2;
}

.chapter-content p {
    margin: 1.2em 0;
    text-indent: 2em;
    text-align: justify;
}

.chapter-content p:first-of-type {
    text-indent: 0;
}

.chapter-content p:first-of-type::first-letter {
    font-size: 3em;
    font-weight: 700;
    float: right;
    margin-left: 0.1em;
    line-height: 1;
    color: #6366f1;
}

/* ============================================
   العناوين
   ============================================ */
h1 {
    font-family: 'Cairo', sans-serif;
    font-size: 2em;
    color: #1a202c;
    margin: 1.5em 0 0.8em;
    font-weight: 700;
    text-align: center;
}

h2 {
    font-family: 'Cairo', sans-serif;
    font-size: 1.6em;
    color: #2d3748;
    margin: 1.5em 0 0.8em;
    padding-bottom: 0.5em;
    border-bottom: 2px solid #e2e8f0;
    font-weight: 600;
}

h3 {
    font-size: 1.3em;
    color: #4a5568;
    margin: 1.3em 0 0.6em;
    font-weight: 600;
}

h4, h5, h6 {
    color: #4a5568;
    margin: 1em 0 0.5em;
    font-weight: 600;
}

/* ============================================
   الفقرات والنصوص
   ============================================ */
p {
    margin: 1em 0;
    orphans: 3;
    widows: 3;
}

strong, b {
    font-weight: 700;
    color: #1a202c;
}

em, i {
    font-style: italic;
}

u {
    text-decoration: underline;
    text-decoration-color: #6366f1;
}

s, strike {
    text-decoration: line-through;
    color: #a0aec0;
}

/* ============================================
   القوائم
   ============================================ */
ul, ol {
    margin: 1.5em 2.5em 1.5em 0;
    padding: 0;
}

li {
    margin: 0.6em 0;
    line-height: 1.8;
}

ul li::marker {
    color: #6366f1;
}

ol li::marker {
    color: #6366f1;
    font-weight: 600;
}

/* ============================================
   الاقتباسات
   ============================================ */
blockquote {
    margin: 2em 3em 2em 1em;
    padding: 1.5em 2em;
    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
    border-right: 5px solid #6366f1;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: #4a5568;
    position: relative;
}

blockquote::before {
    content: """;
    position: absolute;
    top: -10px;
    right: 20px;
    font-size: 4em;
    color: #cbd5e0;
    font-family: Georgia, serif;
    line-height: 1;
}

blockquote p {
    margin: 0;
    text-indent: 0;
}

/* ============================================
   الصور
   ============================================ */
img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 2em auto;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

figure {
    margin: 2em 0;
    text-align: center;
}

figcaption {
    font-size: 0.9em;
    color: #718096;
    margin-top: 0.8em;
    font-style: italic;
}

/* ============================================
   الكود
   ============================================ */
code {
    font-family: 'Courier New', monospace;
    background-color: #f1f5f9;
    padding: 0.2em 0.5em;
    border-radius: 4px;
    font-size: 0.9em;
    color: #6366f1;
}

pre {
    background: linear-gradient(180deg, #1a202c 0%, #2d3748 100%);
    color: #e2e8f0;
    padding: 1.5em;
    border-radius: 12px;
    overflow-x: auto;
    direction: ltr;
    text-align: left;
    font-size: 0.9em;
    line-height: 1.6;
    margin: 2em 0;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

pre code {
    background: none;
    padding: 0;
    color: inherit;
}

/* ============================================
   الروابط
   ============================================ */
a {
    color: #6366f1;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;
}

a:hover {
    border-bottom-color: #6366f1;
}

/* ============================================
   الخطوط الفاصلة
   ============================================ */
hr {
    border: none;
    height: 1px;
    background: linear-gradient(90deg, transparent, #cbd5e0, transparent);
    margin: 3em 0;
}

/* ============================================
   الجداول
   ============================================ */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 2em 0;
    font-size: 0.95em;
}

th, td {
    padding: 1em;
    border: 1px solid #e2e8f0;
    text-align: right;
}

th {
    background: #f7fafc;
    font-weight: 600;
    color: #2d3748;
}

tr:nth-child(even) {
    background: #fafafa;
}

/* ============================================
   دعم الوضع الليلي
   ============================================ */
@media (prefers-color-scheme: dark) {
    body {
        background-color: #1a202c;
        color: #e2e8f0;
    }
    
    .cover-page {
        background: linear-gradient(180deg, #1a202c 0%, #2d3748 100%);
    }
    
    .cover-title, h1, h2, h3 {
        color: #f7fafc;
    }
    
    .chapter-header {
        border-bottom-color: #4a5568;
    }
    
    blockquote {
        background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
        color: #cbd5e0;
    }
    
    code {
        background-color: #2d3748;
    }
    
    th {
        background: #2d3748;
        color: #f7fafc;
    }
    
    tr:nth-child(even) {
        background: #2d3748;
    }
    
    td, th {
        border-color: #4a5568;
    }
    
    nav#toc li {
        border-bottom-color: #4a5568;
    }
    
    nav#toc a {
        color: #e2e8f0;
    }
}

/* ============================================
   طباعة
   ============================================ */
@media print {
    body {
        font-size: 12pt;
        line-height: 1.6;
    }
    
    .cover-page {
        page-break-after: always;
    }
    
    .chapter-page {
        page-break-before: always;
    }
    
    h2, h3 {
        page-break-after: avoid;
    }
    
    p {
        orphans: 3;
        widows: 3;
    }
}
`;
}

/**
 * إنشاء صفحة الغلاف XHTML - تصميم احترافي
 * @param {Object} bookData - بيانات الكتاب
 * @returns {string} محتوى XHTML
 */
function createCoverXHTML(bookData) {
    const coverImage = bookData.cover 
        ? `<div class="cover-image-container">
               <img src="images/cover.${getImageExtension(bookData.cover)}" alt="غلاف الكتاب"/>
           </div>`
        : '';
    
    // النصوص الإضافية من إعدادات الغلاف
    let extraTextsHtml = '';
    if (bookData.coverSettings?.extraTexts && bookData.coverSettings.extraTexts.length > 0) {
        extraTextsHtml = bookData.coverSettings.extraTexts.map(et => 
            `<p class="cover-extra-text">${escapeXML(et.text)}</p>`
        ).join('\n        ');
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ar" dir="rtl">
<head>
    <title>${escapeXML(bookData.title)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
    <div class="cover-page">
        ${coverImage}
        <h1 class="cover-title">${escapeXML(bookData.title)}</h1>
        <div class="cover-divider"></div>
        <p class="cover-author">${escapeXML(bookData.author)}</p>
        ${extraTextsHtml}
        <p class="cover-publisher"></p>
    </div>
</body>
</html>`;
}

/**
 * إنشاء صفحة فصل XHTML - تصميم احترافي
 * @param {Object} chapter - بيانات الفصل
 * @param {number} chapterNumber - رقم الفصل
 * @returns {string} محتوى XHTML
 */
function createChapterXHTML(chapter, chapterNumber) {
    // معالجة المحتوى
    let content = chapter.content || '';
    
    // تحويل الصور إلى مسارات EPUB
    content = processImagesForEPUB(content, chapterNumber);
    
    // تنظيف HTML
    content = cleanHTMLForEPUB(content);
    
    // التأكد من وجود محتوى
    if (!content || content.trim() === '') {
        content = '<p></p>';
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ar" dir="rtl">
<head>
    <title>${escapeXML(chapter.title)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body class="chapter-page">
    <div class="chapter-header">
        <h2>${escapeXML(chapter.title)}</h2>
    </div>
    <div class="chapter-content">
        ${content}
    </div>
</body>
</html>`;
}

// ============================================
// أدوات مساعدة
// ============================================

/**
 * تحويل data URL إلى Blob
 * @param {string} dataURL - رابط البيانات
 * @returns {Promise<Blob>}
 */
async function dataURLtoBlob(dataURL) {
    if (!dataURL || !dataURL.startsWith('data:')) {
        return null;
    }
    
    const response = await fetch(dataURL);
    return await response.blob();
}

/**
 * الحصول على امتداد الصورة من data URL
 * @param {string} dataURL - رابط البيانات
 * @returns {string} الامتداد
 */
function getImageExtension(dataURL) {
    if (!dataURL) return 'jpg';
    
    const match = dataURL.match(/data:image\/(\w+)/);
    if (match) {
        const ext = match[1].toLowerCase();
        if (ext === 'jpeg') return 'jpg';
        return ext;
    }
    
    return 'jpg';
}

/**
 * الحصول على نوع الوسائط للصورة
 * @param {string} extension - الامتداد
 * @returns {string} نوع الوسائط
 */
function getMediaType(extension) {
    const types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp'
    };
    
    return types[extension.toLowerCase()] || 'image/jpeg';
}

/**
 * استخراج الصور من محتوى HTML
 * @param {string} html - محتوى HTML
 * @returns {Array} قائمة الصور
 */
function extractImagesFromContent(html) {
    const images = [];
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    temp.querySelectorAll('img').forEach((img, index) => {
        if (img.src && img.src.startsWith('data:')) {
            images.push({
                src: img.src,
                index: index
            });
        }
    });
    
    return images;
}

/**
 * معالجة الصور لـ EPUB (تحويل المسارات)
 * @param {string} html - محتوى HTML
 * @param {number} chapterNumber - رقم الفصل
 * @returns {string} HTML معالج
 */
function processImagesForEPUB(html, chapterNumber) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    let imgIndex = 0;
    temp.querySelectorAll('img').forEach(img => {
        if (img.src && img.src.startsWith('data:')) {
            imgIndex++;
            const ext = getImageExtension(img.src);
            img.src = `images/chapter-${chapterNumber}-img-${imgIndex}.${ext}`;
            img.removeAttribute('style');
        }
    });
    
    return temp.innerHTML;
}

/**
 * تنظيف HTML لـ EPUB
 * @param {string} html - محتوى HTML
 * @returns {string} HTML نظيف
 */
function cleanHTMLForEPUB(html) {
    // إزالة السكريبتات والأنماط
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // إزالة الأحداث
    html = html.replace(/\s+on\w+="[^"]*"/gi, '');
    html = html.replace(/\s+on\w+='[^']*'/gi, '');
    
    // تحويل div إلى p إذا لزم الأمر
    // html = html.replace(/<div([^>]*)>/gi, '<p$1>');
    // html = html.replace(/<\/div>/gi, '</p>');
    
    // إصلاح العلامات الفارغة
    html = html.replace(/<(\w+)([^>]*)>\s*<\/\1>/gi, '');
    
    // تنظيف المسافات الزائدة
    html = html.replace(/\n\s*\n/g, '\n');
    
    return html;
}

/**
 * تحويل النص لـ XML آمن
 * @param {string} text - النص
 * @returns {string} النص المحول
 */
function escapeXML(text) {
    if (!text) return '';
    
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
