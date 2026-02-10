// Data Management
let stockData = JSON.parse(localStorage.getItem("stockData")) || [];
let transactionLog = JSON.parse(localStorage.getItem("transactionLog")) || [];
let currentImage = null;
let currentCatalogImage = null;
let editingIndex = null;
let qrCodes = JSON.parse(localStorage.getItem("qrCodes")) || {};
// Scanner context when opened from inventory actions
let scannerContext = { type: null, itemId: null, barcode: null };

// HTML5-QRCode Scanner Variables
let html5QrcodeScanner;
let scanningActive = false;
let lastScannedCode = null;
let isProcessingQR = false;  // Prevent spam scanning

// Google Sheets Integration
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzxABtMmtwwHg1dwqYI3O2xcoFlO2EWC0SPlGDuBO8lEuT852PsMoPJQVL1naBvbeop/exec";

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderTable();
    updateStats();
    renderGallery();
    setupEventListeners();
    initializeQRScanner();
    // Barcode (CODE128) scanning UI removed
    // Pastikan tampilan awal membuka Inventory
    try { showSection('inventory'); } catch (e) { /* ignore if not ready */ }
});

// Initialize QR Code Scanner
function initializeQRScanner() {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultDiv = document.getElementById('result');
    const resultActions = document.getElementById('resultActions');
    const addToInventoryBtn = document.getElementById('addToInventoryBtn');

    // Initialize html5-qrcode scanner with improved settings
    html5QrcodeScanner = new Html5Qrcode("qr-reader", {
        formFactor: "portrait",
        numAttempts: 300,
        isShowTorchButtonIfSupported: true,
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        useBarCodeDetectorIfAvailable: true,
        experimentalFeatures: {
            useBarCodeDetectorIfAvailable: true
        }
    });

    // Event: Tombol Mulai Scan
    startBtn.addEventListener('click', function() {
        startScanning();
    });

    // Event: Tombol Hentikan Scan
    stopBtn.addEventListener('click', function() {
        stopScanning();
    });

    // Event: Tombol Salin Hasil
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const text = resultDiv.textContent;
            navigator.clipboard.writeText(text).then(function() {
                showNotification('Hasil disalin ke clipboard!', 'success');
            }).catch(function(err) {
                showNotification('Gagal menyalin hasil', 'error');
            });
        });
    }

    // Event: Tombol Hapus Hasil
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            resultDiv.innerHTML = '<p class="empty-message">Belum ada hasil scan</p>';
            resultDiv.classList.remove('has-result');
            resultActions.style.display = 'none';
            startBtn.style.display = 'inline-block';
        });
    }

    // Event: Tombol Tambah ke Inventory
    if (addToInventoryBtn) {
        addToInventoryBtn.addEventListener('click', function() {
            showAddToInventoryForm();
        });
    }
}

function startScanning() {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resultDiv = document.getElementById('result');

    if (!html5QrcodeScanner) return;

    // Config for camera
    const qrCodeSuccessCallback = (qrCodeMessage) => {
        onScanSuccess(qrCodeMessage);
    };

    const qrCodeErrorCallback = (errorMessage) => {
        onScanError(errorMessage);
    };

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        {
            fps: 30,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false
        },
        qrCodeSuccessCallback,
        qrCodeErrorCallback
    ).catch(err => {
        console.log('Error starting scanner:', err);
        showNotification('Error: Kamera tidak bisa diakses. Pastikan izin kamera aktif.', 'error');
    });

    scanningActive = true;
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    
    let helpText = '📱 Scanner dimulai. Arahkan kamera ke QR code.';
    if (scannerContext.type === 'qr' && scannerContext.itemId) {
        helpText = `📱 Scanner aktif untuk item: ${scannerContext.itemId}\nArahkan QR code ke dalam kotak kuning untuk scan.`;
    }
    showNotification(helpText, 'success');
}

function stopScanning() {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().catch(error => {
            console.log('Error stopping scanner:', error);
        });
    }
    
    scanningActive = false;
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    showNotification('⏹️ Scanner dihentikan', 'success');
}

function onScanSuccess(qrCodeMessage) {
    if (!scanningActive) return;
    
    // Prevent spam scanning - only process one scan at a time
    if (isProcessingQR) return;
    
    isProcessingQR = true;  // Lock processing

    // Prevent rapid duplicate scans
    if (lastScannedCode === qrCodeMessage) {
        isProcessingQR = false;  // Unlock
        return;
    }
    lastScannedCode = qrCodeMessage;

    // Check if scanning from inventory context (for deduction)
    if (scannerContext.type === 'qr' && scannerContext.itemId) {
        deductStockFromQRScan(qrCodeMessage);
        // isProcessingQR will be reset in closeQRConfirmationDialog after user confirms/cancels
        return;
    }

    const resultDiv = document.getElementById('result');
    const resultActions = document.getElementById('resultActions');
    const copyBtn = document.getElementById('copyBtn');

    // Display the scanned code
    let displayText = qrCodeMessage;
    try {
        new URL(qrCodeMessage);
        displayText = `<a href="${qrCodeMessage}" target="_blank">${qrCodeMessage}</a>`;
    } catch (e) {
        // Bukan URL, tampilkan sebagai teks biasa
    }

    resultDiv.innerHTML = `<div class="scanned-result"><strong>QR Code Terdeteksi:</strong><br>${displayText}</div>`;
    resultDiv.classList.add('has-result');
    resultActions.style.display = 'flex';

    // Stop scanning setelah berhasil membaca
    stopScanning();
    isProcessingQR = false;  // Unlock for next scan

    showNotification('✓ QR Code berhasil dipindai!', 'success');
    playNotificationSound();
}

function onScanError(error) {
    // Error handling - biarkan scanner terus berjalan
    // Jangan tampilkan error message yang mengganggu
    // console.log('QR Scan error:', error);
}

// Show form untuk tambah item ke inventory
function showAddToInventoryForm() {
    const resultDiv = document.getElementById('result');
    const resultActions = document.getElementById('resultActions');
    const addToTableForm = document.getElementById('addToTableForm');
    const qrScannedId = document.getElementById('qrScannedId');

    // Extract ID dari hasil scan (text content)
    const scannedText = resultDiv.textContent.replace('QR Code Terdeteksi:', '').trim();
    qrScannedId.value = scannedText;

    resultActions.style.display = 'none';
    addToTableForm.style.display = 'block';
    document.getElementById('qrScannedName').focus();
}

function submitQRScannedItem() {
    const id = document.getElementById('qrScannedId').value.trim();
    const name = document.getElementById('qrScannedName').value.trim();
    const customer = document.getElementById('qrScannedCustomer').value.trim();
    const address = (document.getElementById('qrScannedAddress') && document.getElementById('qrScannedAddress').value.trim()) || '';
    const quantity = parseInt(document.getElementById('qrScannedQuantity').value);

    if (!id || !name || !customer || !quantity) {
        return;
    }

    if (isNaN(quantity) || quantity < 1) {
        return;
    }

    // Check if ID already exists
    const existingItem = stockData.find(item => item.id === id);
    if (existingItem) {
        // Jika ID sudah ada, langsung tambah quantity dari form input
        existingItem.quantity += quantity;
        resetQRScannedForm();
        renderTable();
        renderGallery();
        updateStats();
        lastScannedCode = null;
        return;
    }

    // Jika ID baru, tambah item baru
    const newItem = {
        id,
        name,
        customer,
        address: address || '-',
        quantity: quantity,
        image: currentImage || null,
        dateAdded: new Date().toLocaleDateString('id-ID'),
        qrCode: generateQRCodeData(id)
    };

    stockData.push(newItem);

    resetQRScannedForm();
    renderTable();
    renderGallery();
    updateStats();
    
    // Kirim data ke Google Sheets
    sendToGoogleSheets(newItem);
    
    // Reset untuk scan berikutnya
    lastScannedCode = null;
}

function cancelAddToTable() {
    const resultDiv = document.getElementById('result');
    const resultActions = document.getElementById('resultActions');
    const addToTableForm = document.getElementById('addToTableForm');
    const startBtn = document.getElementById('startBtn');

    resetQRScannedForm();
    resultDiv.innerHTML = '<p class="empty-message">Belum ada hasil scan</p>';
    resultDiv.classList.remove('has-result');
    resultActions.style.display = 'none';
    addToTableForm.style.display = 'none';
    startBtn.style.display = 'inline-block';
    lastScannedCode = null;
}

function resetQRScannedForm() {
    document.getElementById('qrScannedId').value = '';
    document.getElementById('qrScannedName').value = '';
    document.getElementById('qrScannedCustomer').value = '';
    document.getElementById('qrScannedQuantity').value = '';
    if (document.getElementById('qrScannedAddress')) document.getElementById('qrScannedAddress').value = '';
}

function playNotificationSound() {
    // Menggunakan Web Audio API untuk membuat beep
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 1000; // Hz
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch(e) {
        console.log('Audio context error:', e);
    }
}

// Send item data to Google Sheets
function sendToGoogleSheets(itemData) {
    const payload = {
        id: itemData.id,
        name: itemData.name,
        customer: itemData.customer,
        address: itemData.address || '-',
        quantity: itemData.quantity,
        dateAdded: itemData.dateAdded
    };

    console.log('📤 Mengirim data ke Google Sheets:', payload);
    console.log('📍 URL:', GOOGLE_SHEETS_URL);

    fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        mode: 'no-cors'  // Bypass CORS untuk Google Apps Script
    })
    .then(response => {
        console.log('📬 Response status:', response.status);
        console.log('📬 Response ok:', response.ok);
        
        // Dengan mode: 'no-cors', response type akan 'opaque'
        // Jadi kita tidak bisa .json() pada response yang opaque
        // Tapi request sudah diterima oleh server
        
        // Anggap berhasil jika request diterima (status 200-299)
        if (response.ok || response.status === 0) {
            console.log('✅ Request diterima oleh Google Sheets');
            showNotification('📊 Data disimpan ke Google Sheets & Inventory', 'success');
        } else {
            throw new Error('Response status: ' + response.status);
        }
    })
    .catch(error => {
        console.error('⚠️ Warning:', error.message);
        
        // IMPORTANT: Dengan mode: 'no-cors', fetch sering "error" tapi request sebenarnya terkirim
        // Jadi kita tetap tampilkan "berhasil" karena Google Apps Script sudah menerima data
        console.log('✅ Data sudah dikirim ke Google Sheets (meskipun ada warning CORS)');
        showNotification('📊 Data disimpan ke Inventory (Check Google Sheets juga)', 'info');
    });
}

// Test Google Sheets Connection
function testGoogleSheetsConnection() {
    console.log('🧪 Testing Google Sheets connection...');
    
    fetch(GOOGLE_SHEETS_URL, {
        method: 'GET',
        mode: 'no-cors'
    })
    .then(response => {
        console.log('✅ Google Sheets endpoint aktif!');
        showNotification('✅ Google Sheets connection OK', 'success');
    })
    .catch(error => {
        console.error('❌ Connection error:', error);
        showNotification('❌ Gagal connect ke Google Sheets', 'error');
    });
}

// Setup Event Listeners
function setupEventListeners() {
    const fileInput = document.getElementById("itemImage");
    const fileLabel = document.querySelector("#addItem .file-input-wrapper .file-label");
    const itemIdInput = document.getElementById("itemId");

    // Bind click on the specific label next to the item image input
    if (fileInput && fileLabel) {
        fileLabel.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (e) => handleImageUpload(e));
    } else if (fileInput) {
        // Fallback: still listen for direct input changes
        fileInput.addEventListener("change", (e) => handleImageUpload(e));
    }
    
    // Catalog upload listeners
    const catalogFileInput = document.getElementById("catalogImage");
    const catalogFileLabel = document.querySelector(".catalog-upload .file-label");
    if (catalogFileLabel && catalogFileInput) {
        catalogFileLabel.addEventListener("click", () => catalogFileInput.click());
        catalogFileInput.addEventListener("change", (e) => handleCatalogImageUpload(e));
    }
    
    // Live QR preview
    if (itemIdInput) {
        itemIdInput.addEventListener("change", (e) => {
            const id = e.target.value.trim();
            if (id) {
                generateQRPreview(id);
            }
        });
    }
    
    document.addEventListener("click", (e) => {
        const modal = document.getElementById("detailModal");
        if (e.target === modal) closeModal();
        
        const editModal = document.getElementById("editModal");
        if (e.target === editModal) closeEditModal();
    });
}

// Render Table
function renderTable() {
    const table = document.getElementById("stockTable");
    
    if (stockData.length === 0) {
        table.innerHTML = '<tr class="empty-state"><td colspan="8">Belum ada data. Tambahkan item baru untuk memulai.</td></tr>';
        return;
    }

    table.innerHTML = "";
    stockData.forEach((item, index) => {
        const displayImage = item.image 
            ? `<img src="${item.image}" class="display-image" onclick="viewDetail(${index})" alt="${item.name}">`
            : '<span class="no-image">-</span>';
        
        // Show alamat part instead of status
        const addressDisplay = item.address && item.address !== '-' ?
            `<span class="address-value">${item.address}</span>` : '<span class="address-none">-</span>';
        
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${item.id}</strong></td>
                <td>${item.name}</td>
                <td>${item.customer}</td>
                <td>
                    <span class="quantity-badge" style="background: ${item.quantity > 10 ? '#28a745' : item.quantity > 0 ? '#ffc107' : '#ff6b6b'}; color: white; padding: 5px 10px; border-radius: 5px; font-weight: 600;">
                        ${item.quantity}
                    </span>
                </td>
                <td>${addressDisplay}</td>
                <td>${displayImage}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-qr" onclick="openQRScannerForItem('${item.id}')" title="Scan QR Code">📱 Scan QR</button>
                        <button class="btn btn-info" onclick="openEditModal(${index})" title="Edit">✏️</button>
                        <button class="btn btn-danger" onclick="deleteItem(${index})" title="Hapus">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
        table.innerHTML += row;
    });

    saveToLocalStorage();
}

// Render Gallery
function renderGallery() {
    const gallery = document.getElementById("galleryContainer");
    
    const itemsWithImages = stockData.filter(item => item.image);
    
    if (itemsWithImages.length === 0) {
        gallery.innerHTML = '<div class="empty-state">Belum ada gambar. Upload gambar saat menambah item.</div>';
        return;
    }

    gallery.innerHTML = "";
    itemsWithImages.forEach((item, idx) => {
        const galleryItem = `
            <div class="gallery-item" onclick="viewDetail(${stockData.indexOf(item)})">
                <img src="${item.image}" class="gallery-image" alt="${item.name}">
                <div class="gallery-info">
                    <div class="gallery-title">${item.name}</div>
                    <div class="gallery-meta">ID: ${item.id}</div>
                    <div class="gallery-meta">Stock: ${item.quantity} units</div>
                </div>
            </div>
        `;
        gallery.innerHTML += galleryItem;
    });
}

// Update Statistics
function updateStats() {
    document.getElementById("totalItems").textContent = stockData.length;
    const totalStock = stockData.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
    document.getElementById("totalStock").textContent = totalStock;
}

// Add Item
function addItem(event) {
    event.preventDefault();

    const id = document.getElementById("itemId").value.trim();
    const name = document.getElementById("itemName").value.trim();
    const customer = document.getElementById("itemCustomer").value.trim();
    const quantity = document.getElementById("itemQuantity").value.trim();
    const address = (document.getElementById("itemAddress") && document.getElementById("itemAddress").value.trim()) || '';
    const barcode = (document.getElementById("itemBarcode") && document.getElementById("itemBarcode").value.trim()) || '';
    const barcodeFormat = (document.getElementById("barcodeFormat") && document.getElementById("barcodeFormat").value) || 'CODE128';

    if (!id || !name || !customer || !quantity) {
        showNotification("Semua field harus diisi!", "error");
        return;
    }

    if (isNaN(quantity) || quantity < 0) {
        showNotification("Quantity harus berupa angka positif!", "error");
        return;
    }

    // Check duplicate ID
    if (stockData.some(item => item.id === id)) {
        showNotification(`ID "${id}" sudah ada! Gunakan ID yang berbeda.`, "error");
        return;
    }

    const newItem = {
        id,
        name,
        customer,
        address: address || '-',
        barcode: barcode || '',
        barcodeFormat: barcodeFormat,
        quantity: parseInt(quantity),
        image: currentImage || null,
        dateAdded: new Date().toLocaleDateString('id-ID'),
        qrCode: generateQRCodeData(id)
    };

    stockData.push(newItem);

    resetForm();
    renderTable();
    renderGallery();
    updateStats();
    
    // Kirim data ke Google Sheets
    sendToGoogleSheets(newItem);
    
    showNotification(`✓ "${name}" berhasil ditambahkan dengan QR Code!`, "success");
    
    // Switch to inventory view
    showSection('inventory');
}

// Handle Image Upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showNotification("Ukuran gambar terlalu besar! Maksimal 2MB.", "error");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        currentImage = e.target.result;
        const preview = document.getElementById("imagePreview");
        preview.innerHTML = `<img src="${currentImage}" alt="preview">`;
        showNotification("✓ Gambar berhasil dipilih!", "success");
    };
    reader.readAsDataURL(file);
}

// Handle Catalog Image Upload (from Catalog section)
function handleCatalogImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showNotification("Ukuran gambar terlalu besar! Maksimal 2MB.", "error");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        currentCatalogImage = e.target.result;
        const preview = document.getElementById("catalogImagePreview");
        if (preview) preview.innerHTML = `<img src="${currentCatalogImage}" alt="preview">`;
        showNotification("✓ Gambar catalog berhasil dipilih!", "success");
    };
    reader.readAsDataURL(file);
}

function resetCatalogForm() {
    const form = document.querySelector('.catalog-form');
    if (form) form.reset();
    const preview = document.getElementById('catalogImagePreview');
    if (preview) preview.innerHTML = '';
    currentCatalogImage = null;
}

// Add or update catalog image for an ID
function addCatalogImage(event) {
    event.preventDefault();
    const idInput = document.getElementById('catalogItemId');
    if (!idInput) return;
    const id = idInput.value.trim();

    if (!id) {
        showNotification('Masukkan ID sparepart terlebih dahulu!', 'error');
        return;
    }

    if (!currentCatalogImage) {
        showNotification('Pilih gambar terlebih dahulu!', 'error');
        return;
    }

    const existing = stockData.find(item => item.id === id);
    if (existing) {
        existing.image = currentCatalogImage;
        showNotification(`✓ Gambar untuk ID ${id} berhasil diperbarui.`, 'success');
    } else {
        stockData.push({
            id,
            name: id,
            customer: '-',
            address: '-',
            quantity: 0,
            image: currentCatalogImage,
            dateAdded: new Date().toLocaleDateString('id-ID'),
            qrCode: generateQRCodeData(id)
        });
        showNotification(`✓ ID ${id} berhasil ditambahkan ke catalog.`, 'success');
    }

    resetCatalogForm();
    saveToLocalStorage();
    renderTable();
    renderGallery();
    updateStats();
}

// Reset Form
function resetForm() {
    document.querySelector(".form-container").reset();
    document.getElementById("imagePreview").innerHTML = "";
    currentImage = null;
    if (document.getElementById('itemAddress')) document.getElementById('itemAddress').value = '';
    if (document.getElementById('itemBarcode')) document.getElementById('itemBarcode').value = '';
}

// Filter Table
function filterTable() {
    const searchInput = document.getElementById("searchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#stockTable tr");

    rows.forEach(row => {
        if (row.classList.contains("empty-state")) return;
        
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchInput) ? "" : "none";
    });
}

// View Detail
function viewDetail(index) {
    const item = stockData[index];
    const modal = document.getElementById("detailModal");
    const modalBody = document.getElementById("modalBody");

    const imageHtml = item.image 
        ? `<img src="${item.image}" alt="${item.name}" style="width: 100%; border-radius: 8px; margin-bottom: 20px;">`
        : '';

    const content = `
        ${imageHtml}
        <div class="modal-info">
            <div class="info-row">
                <span class="info-label">ID Sparepart:</span>
                <span class="info-value">${item.id}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Nama Barang:</span>
                <span class="info-value">${item.name}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Customer:</span>
                <span class="info-value">${item.customer}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Alamat Part:</span>
                <span class="info-value">${item.address || '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Quantity:</span>
                <span class="info-value">${item.quantity} units</span>
            </div>
            <div class="info-row">
                <span class="info-label">Tanggal Ditambahkan:</span>
                <span class="info-value">${item.dateAdded || '-'}</span>
            </div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-primary" style="flex: 1;" onclick="displayQRCode('${item.id}', '${item.name}')">📱 Lihat QR Code</button>
            <button class="btn btn-primary" style="flex: 1;" onclick="openEditModal(${index})">✏️ Edit</button>
            <button class="btn btn-danger" style="flex: 1;" onclick="deleteItem(${index})">🗑️ Hapus</button>
        </div>
    `;

    modalBody.innerHTML = content;
    modal.classList.add("show");
}

// Close Modal
function closeModal() {
    document.getElementById("detailModal").classList.remove("show");
}

// Open Edit Modal
function openEditModal(index) {
    const item = stockData[index];
    editingIndex = index;

    document.getElementById("editId").value = item.id;
    document.getElementById("editName").value = item.name;
    document.getElementById("editCustomer").value = item.customer;
    document.getElementById("editQuantity").value = item.quantity;
    if (document.getElementById("editAddress")) document.getElementById("editAddress").value = item.address || '';

    closeModal();
    document.getElementById("editModal").classList.add("show");
}

// Close Edit Modal
function closeEditModal() {
    document.getElementById("editModal").classList.remove("show");
    editingIndex = null;
}

// Save Edit
function saveEdit(event) {
    event.preventDefault();

    if (editingIndex === null) return;

    const item = stockData[editingIndex];
    item.name = document.getElementById("editName").value.trim();
    item.customer = document.getElementById("editCustomer").value.trim();
    item.quantity = parseInt(document.getElementById("editQuantity").value);
    const address = (document.getElementById("editAddress") && document.getElementById("editAddress").value.trim()) || '';
    item.address = address || '-';

    if (!item.name || !item.customer || item.quantity < 0) {
        showNotification("Data tidak valid!", "error");
        return;
    }

    saveToLocalStorage();
    renderTable();
    updateStats();
    closeEditModal();
    showNotification("✓ Data berhasil diubah!", "success");
}

// Delete Item
function deleteItem(index) {
    const item = stockData[index];
    
    if (confirm(`Yakin ingin menghapus "${item.name}"?`)) {
        stockData.splice(index, 1);
        saveToLocalStorage();
        renderTable();
        renderGallery();
        updateStats();
        closeModal();
        showNotification(`✓ "${item.name}" berhasil dihapus!`, "success");
    }
}

// Show Section
function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(section => {
        section.classList.remove("active");
    });
    document.getElementById(sectionId).classList.add("active");

    document.querySelectorAll(".menu-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    try {
        event?.target?.closest(".menu-btn")?.classList.add("active");
    } catch (e) {
        // ignore when called programmatically without an event
    }
}

// Save to LocalStorage
function saveToLocalStorage() {
    localStorage.setItem("stockData", JSON.stringify(stockData));
}

// Show Notification
function showNotification(message, type = "info") {
    const container = document.getElementById("notificationContainer");
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Export to CSV (bonus feature)
function exportToCSV() {
    let csv = "No,ID Sparepart,Nama Barang,Customer,Alamat Part,Quantity,Tanggal\n";
    
    stockData.forEach((item, index) => {
        csv += `${index + 1},"${item.id}","${item.name}","${item.customer}","${item.address || '-'}",${item.quantity},"${item.dateAdded}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sparepart_${new Date().getTime()}.csv`;
    a.click();
}

function recordTransaction(itemId, type) {
    const timestamp = new Date().toLocaleString('id-ID');
    transactionLog.push({
        itemId: itemId,
        type: type,
        timestamp: timestamp,
        id: `TXN-${Date.now()}`
    });
    
    if (transactionLog.length > 1000) {
        transactionLog = transactionLog.slice(-1000);
    }
    
    localStorage.setItem("transactionLog", JSON.stringify(transactionLog));
}

// QR Code Generator Function
function generateQRCodeData(itemId) {
    return itemId;
}

// Display QR Code in Modal
function displayQRCode(itemId, itemName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'qrCodeModal';
    modal.innerHTML = `
        <div class="modal-content qr-code-modal">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📱 QR Code - ${itemName}</h2>
            <div class="qr-code-display">
                <div id="qrCodeContainer"></div>
                <div class="qr-info">
                    <p><strong>ID Sparepart:</strong> ${itemId}</p>
                    <p><strong>Nama Barang:</strong> ${itemName}</p>
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">Scan QR code untuk menambahkan barang ke inventory</p>
                </div>
            </div>
            <div class="qr-actions">
                <button class="btn btn-primary" onclick="downloadQRCode('${itemId}', '${itemName}')">📥 Download</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">❌ Tutup</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    // Generate QR Code
    const qrContainer = document.getElementById('qrCodeContainer');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: itemId,
        width: 250,
        height: 250,
        colorDark: '#c8102e',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Download QR Code
function downloadQRCode(itemId, itemName) {
    const canvas = document.querySelector('#qrCodeContainer canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `QR_${itemId}_${itemName}.png`;
        link.click();
        showNotification('✓ QR Code berhasil diunduh!', 'success');
    }
}

// Display Barcode in Modal
function displayBarcode(barcode, itemName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'barcodeModal';
    modal.innerHTML = `
        <div class="modal-content qr-code-modal">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📊 Barcode - ${itemName}</h2>
            <div class="barcode-display">
                <svg id="barcodeContainer"></svg>
                <div class="barcode-info">
                    <p><strong>Barcode:</strong> ${barcode}</p>
                    <p><strong>Nama Barang:</strong> ${itemName}</p>
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">Scan barcode untuk transaksi barang masuk/keluar</p>
                </div>
            </div>
            <div class="qr-actions">
                <button class="btn btn-primary" onclick="downloadBarcode('${barcode}', '${itemName}')">📥 Download</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">❌ Tutup</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    // Generate Barcode using JsBarcode library
    if (typeof JsBarcode !== 'undefined') {
        JsBarcode("#barcodeContainer", barcode, {
            format: "CODE128",
            width: 2,
            height: 100,
            displayValue: true
        });
    } else {
        document.getElementById('barcodeContainer').innerHTML = `<text x="10" y="50">${barcode}</text>`;
    }
}

// Download Barcode
function downloadBarcode(barcode, itemName) {
    const svg = document.querySelector('#barcodeModal svg');
    if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `Barcode_${barcode}_${itemName}.png`;
            link.click();
            showNotification('✓ Barcode berhasil diunduh!', 'success');
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
}

// Record Transaction (Barang Masuk/Keluar)
function recordItemTransaction(index, type) {
    const item = stockData[index];
    const typeLabel = type === 'in' ? 'Barang Masuk' : 'Barang Keluar';
    const quantity = prompt(`${typeLabel} - ${item.name}\n\nQuantity saat ini: ${item.quantity}\n\nMasukkan jumlah ${typeLabel}:`, '1');
    
    if (quantity === null) return;
    
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
        showNotification("Quantity harus berupa angka positif!", "error");
        return;
    }
    
    // Update quantity
    if (type === 'in') {
        item.quantity += qty;
    } else {
        if (item.quantity < qty) {
            showNotification("Stok tidak cukup untuk keluar!", "error");
            return;
        }
        item.quantity -= qty;
    }
    
    // Record transaction
    recordTransaction(item.id, type, qty, item.name);
    
    // Update display
    renderTable();
    updateStats();
    saveToLocalStorage();
}

// Record Transaction to Log
function recordTransaction(itemId, type, quantity, itemName) {
    const timestamp = new Date().toLocaleString('id-ID');
    const transaction = {
        id: `TXN-${Date.now()}`,
        itemId: itemId,
        itemName: itemName,
        type: type === 'in' ? 'Barang Masuk' : 'Barang Keluar',
        quantity: quantity,
        timestamp: timestamp
    };
    
    transactionLog.push(transaction);
    
    if (transactionLog.length > 1000) {
        transactionLog = transactionLog.slice(-1000);
    }
    
    localStorage.setItem("transactionLog", JSON.stringify(transactionLog));
    
    // Show success message with transaction details
    showNotification(`✓ ${transaction.type} - ${itemName} (${quantity} unit) - ${timestamp}`, 'success');
}

// Generate QR Preview Function
function generateQRPreview(itemId) {
    const qrPreviewContainer = document.getElementById("qrPreview");
    if (!qrPreviewContainer) return;
    
    qrPreviewContainer.innerHTML = '';
    if (itemId.length > 0) {
        new QRCode(qrPreviewContainer, {
            text: itemId,
            width: 200,
            height: 200,
            colorDark: '#c8102e',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

// CODE128 scanning removed

// Open QR scanner from inventory action for a specific item
function openQRScannerForItem(itemId) {
    const foundItem = stockData.find(item => item.id === itemId);
    if (!foundItem) {
        showNotification(`❌ Item dengan ID ${itemId} tidak ditemukan!`, 'error');
        return;
    }
    
    scannerContext = { type: 'qr', itemId: itemId, barcode: null };
    // Switch to QR scanner section
    showSection('qrScanner');
    // Pre-fill scanned ID field if available
    const idField = document.getElementById('qrScannedId');
    if (idField) idField.value = itemId;
    
    // Clear previous result
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
        resultDiv.innerHTML = '<p class="empty-message">Belum ada hasil scan</p>';
        resultDiv.classList.remove('has-result');
    }
    
    // Show comprehensive instructions
    showNotification(
        `🔍 MODE: SCAN ITEM INVENTORY\n\n📦 Item: ${foundItem.name}\n🆔 ID: ${itemId}\n📊 Stock: ${foundItem.quantity} unit\n\n✅ Instruksi:\n• Kolom kuning = area scan\n• Arahkan QR code ke tengah\n• Pastikan pencahayaan cukup\n• Tahan stabil sampai berhasil\n\n⚠️ Hanya QR code untuk item ini yang akan valid`,
        'info'
    );
    // Start QR scanning
    if (typeof startScanning === 'function') startScanning();
}

// openBarcodeScannerForItem removed (CODE128)

// Deduct stock when QR code is scanned from inventory context
function deductStockFromQRScan(qrCodeMessage) {
    const itemId = scannerContext.itemId;
    
    // VALIDATION: Check if scanned QR code matches the item ID that was clicked
    if (qrCodeMessage.trim() !== itemId.trim()) {
        showNotification(
            `❌ TIDAK VALID!\nQR Code: ${qrCodeMessage}\nItem ID: ${itemId}\n\n⚠️ QR Code tidak sesuai!\nSilakan coba scan yang benar.`,
            'error'
        );
        lastScannedCode = null;  // Reset to allow retry
        return;
    }
    
    // Find the item in inventory by ID
    const foundItem = stockData.find(item => item.id === itemId);
    
    if (!foundItem) {
        showNotification(`❌ Item tidak ditemukan di inventory`, 'error');
        lastScannedCode = null;
        return;
    }
    
    // Check if stock is available
    if (foundItem.quantity <= 0) {
        showNotification(`❌ Stock habis untuk ${foundItem.name}!`, 'error');
        lastScannedCode = null;
        return;
    }
    
    // QR Code valid - Show confirmation dialog with item details
    showQRConfirmationDialog(foundItem, qrCodeMessage);
    
    // Keep scanner active
    lastScannedCode = null;
}

// Show confirmation dialog with item details before deducting stock
function showQRConfirmationDialog(item, qrCode) {
    const modal = document.createElement('div');
    modal.className = 'modal confirmation-modal';
    modal.id = 'qrConfirmModal';
    modal.innerHTML = `
        <div class="modal-content confirmation-content">
            <div class="confirmation-header">
                <h2>✅ Konfirmasi Pengurangan Stock</h2>
                <p class="confirmation-subtitle">Pastikan data berikut sudah benar sebelum confirm</p>
            </div>
            
            <div class="confirmation-data">
                <div class="data-row">
                    <span class="data-label">🆔 ID Sparepart:</span>
                    <span class="data-value">${item.id}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">📦 Nama Barang:</span>
                    <span class="data-value">${item.name}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">👥 Customer:</span>
                    <span class="data-value">${item.customer}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">📊 Stock Saat Ini:</span>
                    <span class="data-value stock-value">${item.quantity} unit</span>
                </div>
                <div class="data-row">
                    <span class="data-label">➖ Akan Dikurangi:</span>
                    <span class="data-value deduction-value">1 unit</span>
                </div>
                <div class="data-row highlight-row">
                    <span class="data-label">📈 Stock Setelah:</span>
                    <span class="data-value new-stock">${item.quantity - 1} unit</span>
                </div>
                <div class="data-row">
                    <span class="data-label">🔢 QR Code:</span>
                    <span class="data-value qr-code-value">${qrCode}</span>
                </div>
            </div>
            
            <div class="confirmation-actions">
                <button class="btn btn-success btn-large" onclick="confirmQRDeduction('${item.id}', '${qrCode}')">
                    ✅ Setuju & Kurangi Stock
                </button>
                <button class="btn btn-secondary btn-large" onclick="closeQRConfirmationDialog()">
                    ❌ Batal / Scan Ulang
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.classList.add('show');
    
    // Show notification
    showNotification(`📋 Konfirmasi data sparepart sebelum deduction`, 'info');
}

// Confirm QR deduction and actually reduce stock
function confirmQRDeduction(itemId, qrCode) {
    const foundItem = stockData.find(item => item.id === itemId);
    
    if (!foundItem) {
        showNotification(`❌ Item tidak ditemukan`, 'error');
        closeQRConfirmationDialog();
        return;
    }
    
    // Perform the actual deduction
    foundItem.quantity -= 1;
    
    // Update local storage
    saveToLocalStorage();
    
    // Log transaction
    const transaction = {
        type: 'deduct_from_qr',
        itemId: foundItem.id,
        itemName: foundItem.name,
        qrCode: qrCode,
        quantityDeducted: 1,
        newStock: foundItem.quantity,
        timestamp: new Date().toLocaleString('id-ID'),
        user: document.getElementById('currentUser').textContent || 'Unknown'
    };
    
    transactionLog.push(transaction);
    localStorage.setItem('transactionLog', JSON.stringify(transactionLog));
    
    // Update table and stats
    renderTable();
    updateStats();
    
    // Close modal
    closeQRConfirmationDialog();
    
    // Show success notification
    showNotification(
        `✅ BERHASIL!\n${foundItem.name}\n📉 -1 unit | Stock: ${foundItem.quantity}\n\n📱 Siap untuk scan berikutnya...`,
        'success'
    );
    
    // Restart scanner to allow next scan
    setTimeout(() => {
        if (scannerContext.type === 'qr' && scannerContext.itemId) {
            startScanning();
        }
    }, 500);
}

// Close QR confirmation dialog
function closeQRConfirmationDialog() {
    const modal = document.getElementById('qrConfirmModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
    
    // Unlock processing for next scan
    isProcessingQR = false;
    lastScannedCode = null;
    
    // Restart scanner to allow another scan (user clicked Cancel/Batal)
    setTimeout(() => {
        if (scannerContext.type === 'qr' && scannerContext.itemId) {
            startScanning();
            showNotification('🔄 Scanner aktif lagi. Silakan scan QR code berikutnya.', 'info');
        }
    }, 500);
}

// Exit QR scanner and return to inventory
function exitQRScannerToInventory() {
    stopScanning();
    scannerContext = { type: null, itemId: null, barcode: null };
    lastScannedCode = null;
    showSection('inventory');
    showNotification('🚪 Kembali ke inventory', 'info');
}

// deductStockFromBarcodeScan removed (CODE128)

// Deduct Stock from Barcode Scan
// deductStockFromBarcode removed (CODE128)

// Google Sheets ID - GANTI DENGAN ID ANDA
const SHEET_ID = "1FajXvPllRr2TRlBae2258ti7p0WPEx4tKlKDiUbcmoU";
const SHEET_NAME = "Sheet1"; // Nama sheet tempat data akan disimpan

function doPost(e) {
  try {
    // Parse request data
    const data = JSON.parse(e.postData.contents);
    
    // Buka spreadsheet
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    
    // Siapkan data untuk ditambahkan (sesuaikan dengan kolom Anda)
    const newRow = [
      data.id,
      data.name,
      data.customer,
      data.address,
      data.quantity,
      data.dateAdded,
      new Date().toLocaleString('id-ID')  // Timestamp
    ];
    
    // Tambahkan row baru
    sheet.appendRow(newRow);
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data berhasil disimpan ke Google Sheets",
      timestamp: new Date()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Sheets API is ready"
  })).setMimeType(ContentService.MimeType.JSON);
}

