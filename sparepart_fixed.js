// Data Management
let stockData = JSON.parse(localStorage.getItem("stockData")) || [];
let transactionLog = JSON.parse(localStorage.getItem("transactionLog")) || [];
let currentImage = null;
let editingIndex = null;
let qrCodes = JSON.parse(localStorage.getItem("qrCodes")) || {};

// HTML5-QRCode Scanner Variables
let html5QrcodeScanner = null;
let scanningActive = false;
let lastScannedCode = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded fired');
    renderTable();
    updateStats();
    renderGallery();
    setupEventListeners();
    setTimeout(() => {
        initializeQRScanner();
    }, 500);
});

// Initialize QR Code Scanner
function initializeQRScanner() {
    console.log('initializeQRScanner called');
    
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultDiv = document.getElementById('result');
    const resultActions = document.getElementById('resultActions');
    const addToInventoryBtn = document.getElementById('addToInventoryBtn');
    const qrReaderDiv = document.getElementById('qr-reader');

    if (!qrReaderDiv) {
        console.error('qr-reader div tidak ditemukan');
        return;
    }

    console.log('Elements found:', {startBtn, stopBtn, copyBtn, clearBtn, resultDiv, resultActions, addToInventoryBtn});

    // Initialize html5-qrcode scanner with new instance
    try {
        html5QrcodeScanner = new Html5Qrcode("qr-reader");
        console.log('Html5Qrcode instance created successfully');
    } catch (err) {
        console.error('Error creating Html5Qrcode instance:', err);
        showNotification('Error: Library html5-qrcode tidak bisa dimuat', 'error');
        return;
    }

    // Event: Tombol Mulai Scan
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            console.log('Start button clicked');
            startScanning();
        });
    }

    // Event: Tombol Hentikan Scan
    if (stopBtn) {
        stopBtn.addEventListener('click', function() {
            console.log('Stop button clicked');
            stopScanning();
        });
    }

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
            lastScannedCode = null;
        });
    }

    // Event: Tombol Tambah ke Inventory
    if (addToInventoryBtn) {
        addToInventoryBtn.addEventListener('click', function() {
            console.log('Add to inventory button clicked');
            showAddToInventoryForm();
        });
    }

    console.log('QR Scanner initialization complete');
}

function startScanning() {
    console.log('startScanning called');
    
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resultDiv = document.getElementById('result');

    if (!html5QrcodeScanner) {
        console.error('Html5Qrcode scanner not initialized');
        showNotification('Error: Scanner tidak terinisialisasi', 'error');
        return;
    }

    // Config for camera - Handler callbacks
    const qrCodeSuccessCallback = (qrCodeMessage) => {
        console.log('QR Code scanned:', qrCodeMessage);
        onScanSuccess(qrCodeMessage);
    };

    const qrCodeErrorCallback = (errorMessage) => {
        // Don't show error every frame
        // console.log('QR Code error:', errorMessage);
    };

    // Start scanning
    html5QrcodeScanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        qrCodeSuccessCallback,
        qrCodeErrorCallback
    ).then(ignoreValue => {
        console.log('Scanner started successfully');
        scanningActive = true;
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        showNotification('📱 Scanner dimulai. Arahkan kamera ke QR code.', 'success');
    }).catch(err => {
        console.error('Error starting scanner:', err);
        showNotification('Error: Kamera tidak bisa diakses. Pastikan izin kamera aktif.', 'error');
    });
}

function stopScanning() {
    console.log('stopScanning called');
    
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    if (html5QrcodeScanner && scanningActive) {
        html5QrcodeScanner.stop().then(ignoreValue => {
            console.log('Scanner stopped');
            scanningActive = false;
            startBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
            showNotification('⏹️ Scanner dihentikan', 'success');
        }).catch(error => {
            console.log('Error stopping scanner:', error);
        });
    }
}

function onScanSuccess(qrCodeMessage) {
    console.log('onScanSuccess called with:', qrCodeMessage);
    
    if (!scanningActive) {
        console.log('Scanning not active, ignoring');
        return;
    }

    // Prevent duplicate scans
    if (lastScannedCode === qrCodeMessage) {
        console.log('Duplicate scan detected, ignoring');
        return;
    }
    
    lastScannedCode = qrCodeMessage;
    console.log('lastScannedCode set to:', lastScannedCode);

    const resultDiv = document.getElementById('result');
    const resultActions = document.getElementById('resultActions');
    const startBtn = document.getElementById('startBtn');

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
    startBtn.style.display = 'none';

    // Stop scanning setelah berhasil membaca
    stopScanning();

    showNotification('✓ QR Code berhasil dipindai!', 'success');
    playNotificationSound();
}

function onScanError(error) {
    // Error handling - biarkan scanner terus berjalan
    // Jangan tampilkan error message yang mengganggu
    // console.log('Scan error:', error);
}

// Show form untuk tambah item ke inventory
function showAddToInventoryForm() {
    console.log('showAddToInventoryForm called');
    
    const resultDiv = document.getElementById('result');
    const resultActions = document.getElementById('resultActions');
    const addToTableForm = document.getElementById('addToTableForm');
    const qrScannedId = document.getElementById('qrScannedId');
    const qrScannedName = document.getElementById('qrScannedName');

    if (!qrScannedId || !qrScannedName || !addToTableForm) {
        console.error('Form elements not found');
        showNotification('Error: Form elements tidak ditemukan', 'error');
        return;
    }

    // Extract ID dari hasil scan (text content)
    const scannedText = resultDiv.textContent.replace('QR Code Terdeteksi:', '').trim();
    qrScannedId.value = scannedText;

    console.log('Form opened with ID:', scannedText);

    resultActions.style.display = 'none';
    addToTableForm.style.display = 'block';
    qrScannedName.focus();
}

function submitQRScannedItem() {
    console.log('submitQRScannedItem called');
    
    const id = document.getElementById('qrScannedId').value.trim();
    const name = document.getElementById('qrScannedName').value.trim();
    const customer = document.getElementById('qrScannedCustomer').value.trim();
    const quantity = document.getElementById('qrScannedQuantity').value.trim();

    console.log('Form data:', {id, name, customer, quantity});

    if (!id || !name || !customer || !quantity) {
        showNotification("Semua field harus diisi!", "error");
        return;
    }

    if (isNaN(quantity) || parseInt(quantity) < 1) {
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
        quantity: parseInt(quantity),
        image: currentImage || null,
        dateAdded: new Date().toLocaleDateString('id-ID'),
        qrCode: generateQRCodeData(id)
    };

    console.log('Adding item:', newItem);

    stockData.push(newItem);
    saveToLocalStorage();
    resetQRScannedForm();
    renderTable();
    renderGallery();
    updateStats();
    showNotification(`✓ "${name}" berhasil ditambahkan!`, "success");
    
    // Reset untuk scan berikutnya
    lastScannedCode = null;

    // Reset form display
    const resultDiv = document.getElementById('result');
    const resultActions = document.getElementById('resultActions');
    const addToTableForm = document.getElementById('addToTableForm');
    const startBtn = document.getElementById('startBtn');
    
    resultDiv.innerHTML = '<p class="empty-message">Belum ada hasil scan</p>';
    resultDiv.classList.remove('has-result');
    resultActions.style.display = 'none';
    addToTableForm.style.display = 'none';
    startBtn.style.display = 'inline-block';
}

function cancelAddToTable() {
    console.log('cancelAddToTable called');
    
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

// Setup Event Listeners
function setupEventListeners() {
    const fileInput = document.getElementById("itemImage");
    const fileLabel = document.querySelector(".file-label");
    const itemIdInput = document.getElementById("itemId");
    
    if (fileLabel) {
        fileLabel.addEventListener("click", () => fileInput.click());
    }
    
    if (fileInput) {
        fileInput.addEventListener("change", (e) => handleImageUpload(e));
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
        
        const lastTransaction = transactionLog
            .filter(t => t.itemId === item.id)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        const statusDisplay = lastTransaction 
            ? `<span class="status-badge status-${lastTransaction.type}" title="${lastTransaction.timestamp}">${lastTransaction.type === 'in' ? '📥 Masuk' : '📤 Keluar'}</span>`
            : '<span class="status-badge status-none">-</span>';
        
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
                <td>${statusDisplay}</td>
                <td>${displayImage}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-qr" onclick="displayQRCode('${item.id}', '${item.name}')" title="Lihat QR Code">📱</button>
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

    if (!id || !name || !customer || !quantity) {
        showNotification("Semua field harus diisi!", "error");
        return;
    }

    if (isNaN(quantity) || quantity < 0) {
        showNotification("Quantity harus berupa angka yang valid!", "error");
        return;
    }

    if (stockData.some(item => item.id === id)) {
        showNotification(`ID "${id}" sudah ada! Gunakan ID yang berbeda.`, "error");
        return;
    }

    stockData.push({
        id,
        name,
        customer,
        quantity: parseInt(quantity),
        image: currentImage || null,
        dateAdded: new Date().toLocaleDateString('id-ID'),
        qrCode: generateQRCodeData(id)
    });

    resetQRScannedForm();
    renderTable();
    renderGallery();
    updateStats();
    showNotification(`✓ "${name}" berhasil ditambahkan dengan QR Code!`, "success");
    
    currentImage = null;
    document.getElementById("itemImage").value = "";
    document.getElementById("addItemForm").reset();
    document.getElementById("qrPreview").innerHTML = "";
}

// Handle Image Upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    
    if (file.size > 2 * 1024 * 1024) {
        showNotification("Ukuran gambar terlalu besar! Maksimal 2MB.", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        currentImage = event.target.result;
        showNotification("✓ Gambar berhasil dipilih!", "success");
    };
    reader.readAsDataURL(file);
}

// Delete Item
function deleteItem(index) {
    if (confirm(`Apakah Anda yakin ingin menghapus "${stockData[index].name}"?`)) {
        stockData.splice(index, 1);
        renderTable();
        renderGallery();
        updateStats();
        showNotification("✓ Item berhasil dihapus!", "success");
    }
}

// View Detail Modal
function viewDetail(index) {
    const item = stockData[index];
    const modal = document.getElementById("detailModal");
    const modalBody = document.getElementById("modalBody");
    
    modalBody.innerHTML = `
        <div class="detail-container">
            ${item.image ? `<img src="${item.image}" class="detail-image">` : '<div class="no-image-detail">Tidak ada gambar</div>'}
            <div class="detail-info">
                <p><strong>ID Sparepart:</strong> ${item.id}</p>
                <p><strong>Nama Barang:</strong> ${item.name}</p>
                <p><strong>Customer:</strong> ${item.customer}</p>
                <p><strong>Quantity:</strong> ${item.quantity} unit</p>
                <p><strong>Tanggal Ditambahkan:</strong> ${item.dateAdded}</p>
                <p><strong>Status:</strong> ${item.quantity > 10 ? '📊 Stock Baik' : item.quantity > 0 ? '⚠️ Stock Menipis' : '❌ Habis'}</p>
            </div>
        </div>
    `;
    modal.style.display = "block";
}

// Close Modal
function closeModal() {
    document.getElementById("detailModal").style.display = "none";
}

// Edit Item Modal
function openEditModal(index) {
    editingIndex = index;
    const item = stockData[index];
    document.getElementById("editId").value = item.id;
    document.getElementById("editName").value = item.name;
    document.getElementById("editCustomer").value = item.customer;
    document.getElementById("editQuantity").value = item.quantity;
    document.getElementById("editModal").style.display = "block";
}

// Save Edit
function saveEdit(event) {
    event.preventDefault();
    
    const item = stockData[editingIndex];
    
    if (!item) {
        showNotification("Data tidak valid!", "error");
        return;
    }

    item.name = document.getElementById("editName").value.trim();
    item.customer = document.getElementById("editCustomer").value.trim();
    item.quantity = parseInt(document.getElementById("editQuantity").value);

    renderTable();
    renderGallery();
    updateStats();
    closeEditModal();
    showNotification("✓ Item berhasil diperbarui!", "success");
}

// Close Edit Modal
function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

// Filter Table
function filterTable() {
    const input = document.getElementById("searchInput");
    const filter = input.value.toLowerCase();
    const table = document.getElementById("stockTable");
    const rows = table.getElementsByTagName("tr");

    Array.from(rows).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? "" : "none";
    });
}

function saveToLocalStorage() {
    localStorage.setItem("stockData", JSON.stringify(stockData));
}

// Show Notification
function showNotification(message, type = "info") {
    const container = document.getElementById("notificationContainer");
    
    if (!container) {
        console.error('notificationContainer not found');
        return;
    }
    
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
    let csv = "No,ID Sparepart,Nama Barang,Customer,Quantity,Tanggal\n";
    
    stockData.forEach((item, index) => {
        csv += `${index + 1},"${item.id}","${item.name}","${item.customer}",${item.quantity},"${item.dateAdded}"\n`;
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
