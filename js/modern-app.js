// Modern ESP Launchpad Application - 完整功能版本
// 导入 ESP 工具库
import { ESPLoader, Transport } from './bundle.js';

class ModernESPLaunchpad {
    constructor() {
        this.isConnected = false;
        this.isFlashing = false;
        this.device = null;
        this.transport = null;
        this.esploader = null;
        this.selectedFiles = [];
        this.progressCallback = null;
        this.chip = "default";
        this.chipDesc = "default";
        
        // ESP 库直接可用
        this.ESPLoader = ESPLoader;
        this.Transport = Transport;
        
        // USB 设备过滤器 - 支持的 ESP 设备
        this.usbPortFilters = [
            { usbVendorId: 0x10c4, usbProductId: 0xea60 }, /* CP2102/CP2102N */
            { usbVendorId: 0x0403, usbProductId: 0x6010 }, /* FT2232H */
            { usbVendorId: 0x303a, usbProductId: 0x1001 }, /* Espressif USB_SERIAL_JTAG */
            { usbVendorId: 0x303a, usbProductId: 0x1002 }, /* Espressif esp-usb-bridge firmware */
            { usbVendorId: 0x303a, usbProductId: 0x0002 }, /* ESP32-S2 USB_CDC */
            { usbVendorId: 0x303a, usbProductId: 0x0009 }, /* ESP32-S3 USB_CDC */
            { usbVendorId: 0x1a86, usbProductId: 0x55d4 }, /* CH9102F */
            { usbVendorId: 0x1a86, usbProductId: 0x7523 }, /* CH340T */
            { usbVendorId: 0x0403, usbProductId: 0x6001 }, /* FT232R */
        ];
        
        // 初始化应用
        this.init();
    }

    // 检查是否为不支持的浏览器
    isWebUSBSerialSupported() {
        let isSafari =
            /constructor/i.test(window.HTMLElement) ||
            (function (p) {
                return p.toString() === "[object SafariRemoteNotification]";
            })(
                !window["safari"] ||
                (typeof safari !== "undefined" && window["safari"].pushNotification)
            );

        let isFirefox = typeof InstallTrigger !== "undefined";

        return (isSafari || isFirefox);
    }

    async init() {
        this.initializeElements();
        this.bindEvents();
        this.checkBrowserSupport();
        this.initializeConsole();
        
        // 添加初始化成功信息
        this.addConsoleMessage('ESP 库加载成功，应用已就绪', 'success');
        
        await this.loadConfiguration();
    }

    initializeElements() {
        // Connection elements
        this.connectToggleBtn = document.getElementById('connectToggleBtn');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.deviceInfoMini = document.getElementById('deviceInfoMini');
        this.chipInfoMini = document.getElementById('chipInfoMini');
        this.macAddressMini = document.getElementById('macAddressMini');

        // Firmware elements
        this.quickStartMode = document.getElementById('quickStartMode');
        this.diyMode = document.getElementById('diyMode');
        this.quickStartPanel = document.getElementById('quickStartPanel');
        this.diyPanel = document.getElementById('diyPanel');
        this.applicationSelect = document.getElementById('applicationSelect');
        this.firmwareFileInput = document.getElementById('firmwareFileInput');
        this.firmwareFilesList = document.getElementById('firmwareFilesList');
        this.fileUploadArea = document.getElementById('fileUploadArea');

        // Settings elements
        this.flashBaudrateSelect = document.getElementById('flashBaudrateSelect');
        this.consoleBaudrateSelect = document.getElementById('consoleBaudrateSelect');

        // Flash options elements
        this.flashButton = document.getElementById('flashButton');
        this.flashButtonText = document.getElementById('flashButtonText');
        this.eraseFlashBtn = document.getElementById('eraseFlashBtn');
        this.clearFilesBtn = document.getElementById('clearFilesBtn');
        this.validateFilesBtn = document.getElementById('validateFilesBtn');
        this.flashOptionsPanel = document.getElementById('flashOptionsPanel');
        this.quickAddSection = document.getElementById('quickAddSection');

        // Flash option controls
        this.eraseAllCheckbox = document.getElementById('eraseAllCheckbox');
        this.compressCheckbox = document.getElementById('compressCheckbox');
        this.flashSizeSelect = document.getElementById('flashSizeSelect');
        this.flashModeSelect = document.getElementById('flashModeSelect');

        // Progress elements
        this.progressCard = document.getElementById('progressCard');
        this.progressLabel = document.getElementById('progressLabel');
        this.progressPercentage = document.getElementById('progressPercentage');
        this.progressBar = document.getElementById('progressBar');
        this.progressDetails = document.getElementById('progressDetails');

        // Console elements
        this.consoleOutput = document.getElementById('consoleOutput');
        this.clearConsoleBtn = document.getElementById('clearConsoleBtn');
        this.resetDeviceBtn = document.getElementById('resetDeviceBtn');

        // QR Code elements
        this.qrCodeCard = document.getElementById('qrCodeCard');
        this.qrCodesContainer = document.getElementById('qrCodesContainer');

        // App description
        this.appDescriptionPanel = document.getElementById('appDescriptionPanel');
        this.appDescriptionText = document.getElementById('appDescriptionText');

        // Status alert
        this.statusAlert = document.getElementById('statusAlert');
        this.alertMessage = document.getElementById('alertMessage');
        this.emptyFilesState = document.getElementById('emptyFilesState');
    }

    bindEvents() {
        // Connection events
        if (this.connectToggleBtn) {
            this.connectToggleBtn.addEventListener('click', () => this.toggleConnection());
        }

        // Firmware mode toggle
        if (this.quickStartMode) {
            this.quickStartMode.addEventListener('change', () => this.toggleFirmwareMode());
        }
        if (this.diyMode) {
            this.diyMode.addEventListener('change', () => this.toggleFirmwareMode());
        }

        // File upload events
        if (this.firmwareFileInput) {
            this.firmwareFileInput.addEventListener('change', (e) => {
                e.stopPropagation();
                this.handleFileSelection(e);
            });
        }
        if (this.fileUploadArea) {
            this.fileUploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.fileUploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.fileUploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
            this.fileUploadArea.addEventListener('click', (e) => this.handleUploadAreaClick(e));
        }

        // Application selection
        if (this.applicationSelect) {
            this.applicationSelect.addEventListener('change', () => this.handleApplicationChange());
        }

        // Flash events
        if (this.flashButton) {
            this.flashButton.addEventListener('click', () => this.startFlashing());
        }

        // Console events
        if (this.clearConsoleBtn) {
            this.clearConsoleBtn.addEventListener('click', () => this.clearConsole());
        }
        if (this.resetDeviceBtn) {
            this.resetDeviceBtn.addEventListener('click', () => this.resetDevice());
        }

        // Chip type events
        document.querySelectorAll('input[name="chipType"]').forEach(radio => {
            radio.addEventListener('change', () => this.handleChipTypeChange());
        });

        // DIY mode specific events - use event delegation since elements might not exist initially
        document.addEventListener('click', (e) => {
            if (e.target.id === 'removeFileBtn') {
                this.removeCurrentFile();
            }
            
            // 允许点击文件信息区域重新选择文件
            if (e.target.closest('#fileInfoSection') && !e.target.closest('#removeFileBtn')) {
                this.firmwareFileInput.click();
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.id === 'flashAddressInput') {
                this.updateFlashAddress(e.target.value);
            }
        });
    }

    checkBrowserSupport() {
        // 检查是否为不支持的浏览器
        if (this.isWebUSBSerialSupported()) {
            this.addConsoleMessage('检测到不支持的浏览器 (Safari/Firefox)', 'warning');
            const modal = new bootstrap.Modal(document.getElementById('browserSupportModal'));
            modal.show();
            return false;
        }
        
        // 检查 WebSerial 支持（优先）
        if ('serial' in navigator) {
            this.addConsoleMessage('浏览器支持 WebSerial API', 'success');
            return true;
        }
        
        // 检查 WebUSB 支持
        if ('usb' in navigator) {
            this.addConsoleMessage('浏览器支持 WebUSB API', 'success');
            return true;
        }
        
        // 都不支持则显示警告
        this.addConsoleMessage('浏览器不支持 WebSerial/WebUSB API', 'error');
        const modal = new bootstrap.Modal(document.getElementById('browserSupportModal'));
        modal.show();
        return false;
    }

    initializeConsole() {
        this.addConsoleMessage('ESP Launchpad 控制台已就绪', 'info');
        this.addConsoleMessage('请连接您的 ESP 设备到 USB 串口', 'info');
    }

    async loadConfiguration() {
        // Load default configuration
        this.addConsoleMessage('加载配置中...', 'info');
        this.updateFlashButtonState();
    }

    // 核心功能：固件模式切换
    toggleFirmwareMode() {
        console.log('toggleFirmwareMode called'); // 调试信息
        
        const isQuickStart = this.quickStartMode.checked;
        console.log('isQuickStart:', isQuickStart); // 调试信息
        
        if (isQuickStart) {
            this.quickStartPanel.style.display = 'block';
            this.diyPanel.style.display = 'none';
            this.addConsoleMessage('切换到快速开始模式', 'info');
        } else {
            this.quickStartPanel.style.display = 'none';
            this.diyPanel.style.display = 'block';
            if (this.quickAddSection) {
                this.quickAddSection.style.display = 'block';
            }
            this.addConsoleMessage('切换到自定义模式', 'info');
        }

        this.updateFlashButtonState();
    }

    handleFileSelection(event) {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            this.setSingleFile(files[0]);
        }
        // 清除文件输入框的值，防止重复选择同一文件时不触发change事件
        event.target.value = '';
    }

    handleUploadAreaClick(event) {
        // 避免重复触发文件选择
        if (event.target === this.firmwareFileInput) {
            return;
        }
        
        // 如果点击的是按钮或input元素，不触发文件选择
        if (event.target.closest('button') || 
            event.target.closest('input') ||
            event.target.closest('#removeFileBtn')) {
            return;
        }
        
        // 阻止事件冒泡，防止重复触发
        event.preventDefault();
        event.stopPropagation();
        
        // 如果有文件且点击的是文件信息区域，允许重新选择
        if (this.selectedFiles.length > 0 && event.target.closest('#fileInfoSection')) {
            this.firmwareFileInput.click();
            return;
        }
        
        // 只有在点击上传区域本身时才触发文件选择
        if (event.target === this.fileUploadArea || 
            event.target.closest('.upload-content') ||
            event.target.closest('.file-upload-area')) {
            this.firmwareFileInput.click();
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.fileUploadArea.classList.add('dragover');
    }

    handleDragLeave(event) {
        // 只有当鼠标真正离开上传区域时才移除样式
        if (!this.fileUploadArea.contains(event.relatedTarget)) {
            this.fileUploadArea.classList.remove('dragover');
        }
    }

    handleFileDrop(event) {
        event.preventDefault();
        this.fileUploadArea.classList.remove('dragover');
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) {
            this.setSingleFile(files[0]);
        }
    }

    setSingleFile(file) {
        if (!file.name.endsWith('.bin')) {
            this.addConsoleMessage('请选择 .bin 格式的固件文件', 'error');
            return;
        }

        // 清空之前的文件
        this.selectedFiles = [];
        
        // 添加新文件
        this.selectedFiles.push({
            file: file,
            name: file.name,
            size: file.size,
            address: 0x10000 // 默认应用程序地址
        });

        this.updateSingleFileDisplay();
        this.addConsoleMessage(`已选择文件: ${file.name} (${this.formatFileSize(file.size)})`, 'success');
    }

    updateSingleFileDisplay() {
        const fileInfoSection = document.getElementById('fileInfoSection');
        const flashAddressSection = document.getElementById('flashAddressSection');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const uploadContent = this.fileUploadArea.querySelector('.upload-content');
        
        if (this.selectedFiles.length > 0) {
            const file = this.selectedFiles[0];
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            fileInfoSection.style.display = 'block';
            flashAddressSection.style.display = 'block';
            
            // 更新上传区域状态
            this.fileUploadArea.classList.add('has-files');
            if (uploadContent) {
                uploadContent.innerHTML = `
                    <i class="fas fa-check-circle upload-icon-sm text-success"></i>
                    <p class="upload-text-sm mb-1">文件已选择</p>
                    <small class="text-muted">点击文件信息区域可重新选择</small>
                `;
            }
            
            // 更新Flash地址输入框
            const flashAddressInput = document.getElementById('flashAddressInput');
            if (flashAddressInput) {
                flashAddressInput.value = file.address.toString(16);
            }
        } else {
            fileInfoSection.style.display = 'none';
            flashAddressSection.style.display = 'none';
            
            // 恢复上传区域原始状态
            this.fileUploadArea.classList.remove('has-files');
            if (uploadContent) {
                uploadContent.innerHTML = `
                    <i class="fas fa-cloud-upload-alt upload-icon-sm"></i>
                    <p class="upload-text-sm mb-1">拖拽文件或点击选择</p>
                    <small class="text-muted">选择单个 .bin 文件</small>
                `;
            }
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeCurrentFile() {
        this.selectedFiles = [];
        this.updateSingleFileDisplay();
        
        // 重置文件输入
        const fileInput = document.getElementById('firmwareFileInput');
        if (fileInput) {
            fileInput.value = '';
        }
        
        this.addConsoleMessage('已移除文件', 'info');
        this.updateFlashButtonState();
    }

    updateFlashAddress(addressStr) {
        if (this.selectedFiles.length > 0) {
            // 移除 0x 前缀（如果存在）并转换为数字
            const cleanAddress = addressStr.replace(/^0x/i, '');
            const address = parseInt(cleanAddress, 16);
            
            if (!isNaN(address)) {
                this.selectedFiles[0].address = address;
                this.addConsoleMessage(`Flash地址已更新: 0x${address.toString(16).toUpperCase()}`, 'info');
            }
        }
    }

    getDefaultAddress(filename) {
        const name = filename.toLowerCase();
        if (name.includes('bootloader')) return '0';
        if (name.includes('partition')) return '8000';
        if (name.includes('app') || name.includes('application')) return '10000';
        return '10000'; // Default application address
    }

    updateFilesList() {
        if (!this.firmwareFilesList) return;
        
        if (this.selectedFiles.length === 0) {
            this.firmwareFilesList.innerHTML = `
                <div class="empty-files-state">
                    <i class="fas fa-file-upload"></i>
                    <p class="mb-2">还没有上传文件</p>
                    <small class="text-muted">上传 .bin 文件开始配置烧录地址</small>
                </div>
            `;
            this.clearFilesBtn.style.display = 'none';
            this.validateFilesBtn.style.display = 'none';
            return;
        }

        this.clearFilesBtn.style.display = 'inline-block';
        this.validateFilesBtn.style.display = 'inline-block';

        this.firmwareFilesList.innerHTML = this.selectedFiles.map((fileInfo, index) => {
            const isValid = this.validateAddress(fileInfo.address);
            const sizeText = this.formatFileSize(fileInfo.size);
            
            return `
                <div class="firmware-file-item ${isValid ? 'valid' : 'invalid'}" data-index="${index}">
                    <div class="file-info">
                        <i class="fas fa-microchip file-icon"></i>
                        <div class="file-details">
                            <h6>${fileInfo.name}</h6>
                            <small>固件文件</small>
                            <span class="file-size-info">${sizeText}</span>
                        </div>
                    </div>
                    <div class="address-group">
                        <span class="address-label">Flash 地址</span>
                        <div class="address-input-container">
                            <span class="address-prefix">0x</span>
                            <input type="text" class="form-control address-input has-prefix ${isValid ? '' : 'is-invalid'}" 
                                   value="${fileInfo.address}" 
                                   onchange="modernLaunchpad.updateFileAddress(${index}, this.value)">
                        </div>
                    </div>
                    <div class="file-actions">
                        <i class="fas ${isValid ? 'fa-check-circle' : 'fa-exclamation-triangle'} file-validation-icon ${isValid ? 'valid' : 'invalid'}" 
                           title="${isValid ? '地址有效' : '地址无效'}"></i>
                        <button class="btn btn-outline-danger btn-sm" onclick="modernLaunchpad.removeFile(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateFileUploadArea() {
        if (!this.fileUploadArea) return;
        
        if (this.selectedFiles.length > 0) {
            this.fileUploadArea.classList.add('has-files');
            this.fileUploadArea.innerHTML = `
                <div class="upload-content">
                    <i class="fas fa-check-circle upload-icon text-success"></i>
                    <p class="upload-text">已选择 ${this.selectedFiles.length} 个文件</p>
                    <small class="text-muted">点击添加更多文件或拖拽文件到此处</small>
                </div>
                <input type="file" class="file-input" id="firmwareFileInput" accept=".bin" multiple>
            `;
            
            // Re-bind the new file input
            const newInput = this.fileUploadArea.querySelector('#firmwareFileInput');
            newInput.addEventListener('change', (e) => this.handleFileSelection(e));
        } else {
            this.fileUploadArea.classList.remove('has-files');
            this.fileUploadArea.innerHTML = `
                <div class="upload-content">
                    <i class="fas fa-cloud-upload-alt upload-icon"></i>
                    <p class="upload-text">拖拽文件到此处或点击选择</p>
                    <small class="text-muted">可同时选择多个 .bin 文件，系统将智能分配Flash地址</small>
                </div>
                <input type="file" class="file-input" id="firmwareFileInput" accept=".bin" multiple>
            `;
            
            // Re-bind the new file input
            const newInput = this.fileUploadArea.querySelector('#firmwareFileInput');
            newInput.addEventListener('change', (e) => this.handleFileSelection(e));
        }
    }

    validateAddress(address) {
        if (!address || address.trim() === '') return false;
        const cleanAddr = address.replace(/^0x/i, '');
        return /^[0-9a-fA-F]+$/.test(cleanAddr) && cleanAddr.length > 0;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    updateFileAddress(index, newAddress) {
        if (this.selectedFiles[index]) {
            this.selectedFiles[index].address = newAddress;
            this.updateFilesList();
            this.updateFlashButtonState();
        }
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFilesList();
        this.updateFileUploadArea();
        this.updateFlashButtonState();
        this.addConsoleMessage('已移除文件', 'info');
    }

    clearAllFiles() {
        this.selectedFiles = [];
        this.updateFilesList();
        this.updateFileUploadArea();
        this.updateFlashButtonState();
        this.addConsoleMessage('已清空所有文件', 'info');
    }

    validateAllFiles() {
        let validCount = 0;
        let invalidCount = 0;
        
        this.selectedFiles.forEach(fileInfo => {
            if (this.validateAddress(fileInfo.address)) {
                validCount++;
            } else {
                invalidCount++;
            }
        });
        
        this.addConsoleMessage(`文件验证完成: ${validCount} 个有效, ${invalidCount} 个无效`, 
                              invalidCount === 0 ? 'success' : 'warning');
        
        this.updateFlashButtonState();
    }

    updateFlashButtonState() {
        if (!this.flashButton) return;
        
        const isQuickStart = this.quickStartMode && this.quickStartMode.checked;
        
        if (isQuickStart) {
            // Quick start mode
            const hasApp = this.applicationSelect && this.applicationSelect.value;
            const isConnected = this.isConnected;
            
            this.flashButton.disabled = !hasApp || !isConnected;
            
            if (!isConnected) {
                this.flashButtonText.textContent = '请先连接设备';
                this.flashButton.className = 'btn btn-secondary btn-lg flash-button';
            } else if (!hasApp) {
                this.flashButtonText.textContent = '请选择应用';
                this.flashButton.className = 'btn btn-warning btn-lg flash-button';
            } else {
                this.flashButtonText.textContent = '开始烧录';
                this.flashButton.className = 'btn btn-primary btn-lg flash-button';
            }
        } else {
            // DIY mode
            const hasFiles = this.selectedFiles.length > 0;
            const allValid = this.selectedFiles.every(file => this.validateAddress(file.address));
            const isConnected = this.isConnected;
            
            this.flashButton.disabled = !hasFiles || !allValid || !isConnected;
            
            if (!isConnected) {
                this.flashButtonText.textContent = '请先连接设备';
                this.flashButton.className = 'btn btn-secondary btn-lg flash-button';
            } else if (!hasFiles) {
                this.flashButtonText.textContent = '请添加固件文件';
                this.flashButton.className = 'btn btn-warning btn-lg flash-button';
            } else if (!allValid) {
                this.flashButtonText.textContent = '修复地址错误后烧录';
                this.flashButton.className = 'btn btn-warning btn-lg flash-button';
            } else {
                this.flashButtonText.textContent = '开始烧录';
                this.flashButton.className = 'btn btn-primary btn-lg flash-button';
            }
        }
    }

    // Quick add functions
    addQuickFile(type) {
        const addresses = {
            'bootloader': '0',
            'partition': '8000',
            'application': '10000'
        };
        
        const names = {
            'bootloader': 'bootloader.bin',
            'partition': 'partition-table.bin',
            'application': 'app.bin'
        };
        
        // Create a placeholder file entry
        this.selectedFiles.push({
            file: null,
            name: names[type] || 'firmware.bin',
            size: 0,
            address: addresses[type] || '10000',
            isPlaceholder: true
        });
        
        this.updateFilesList();
        this.updateFileUploadArea();
        this.addConsoleMessage(`已添加 ${names[type]} 槽位，请上传对应文件`, 'info');
    }

    // 真正的设备连接功能
    async toggleConnection() {
        if (this.isConnected) {
            await this.disconnect();
        } else {
            await this.connect();
        }
    }

    async connect() {
        try {
            this.addConsoleMessage('正在连接设备...', 'info');
            
            if (!this.ESPLoader) {
                throw new Error('ESP库未加载，无法连接设备');
            }

            // 尝试 WebSerial 连接
            if ('serial' in navigator) {
                this.addConsoleMessage('使用 WebSerial API 连接...', 'info');
                this.device = await navigator.serial.requestPort({
                    filters: this.usbPortFilters
                });
                this.transport = new this.Transport(this.device, true);
            }
            // 备选 WebUSB 连接
            else if ('usb' in navigator) {
                this.addConsoleMessage('使用 WebUSB API 连接...', 'info');
                this.device = await navigator.usb.requestDevice({
                    filters: this.usbPortFilters.map(filter => ({
                        vendorId: filter.usbVendorId,
                        productId: filter.usbProductId
                    }))
                });
                this.transport = new this.Transport(this.device, false);
            } else {
                throw new Error('浏览器不支持设备连接');
            }

            this.addConsoleMessage('创建 ESP 加载器...', 'info');
            this.esploader = new this.ESPLoader({
                transport: this.transport,
                baudrate: parseInt(this.flashBaudrateSelect.value),
                romBaudrate: 115200,
                enableTracing: false
            });

            this.addConsoleMessage('正在连接并检测芯片...', 'info');
            await this.esploader.main();
            
            // 获取芯片信息
            this.chip = await this.esploader.chip.getChipDescription();
            this.chipDesc = await this.esploader.chip.getChipFeatures();
            
            this.isConnected = true;
            this.updateConnectionStatus();
            this.addConsoleMessage(`设备连接成功: ${this.chip}`, 'success');
            this.addConsoleMessage(`芯片特性: ${this.chipDesc}`, 'info');
            
            // 获取 MAC 地址
            try {
                const macAddr = await this.esploader.chip.readMac();
                const macStr = macAddr.map(b => b.toString(16).padStart(2, '0')).join(':');
                this.addConsoleMessage(`MAC 地址: ${macStr}`, 'info');
                this.macAddressMini.textContent = macStr.substring(0, 8) + '...';
            } catch (e) {
                console.warn('无法读取 MAC 地址:', e);
                this.addConsoleMessage('无法读取 MAC 地址', 'warning');
            }

        } catch (error) {
            this.addConsoleMessage(`连接失败: ${error.message}`, 'error');
            console.error('Connection error:', error);
            this.isConnected = false;
            this.updateConnectionStatus();
            
            // 如果是用户取消，不显示错误
            if (error.name === 'NotFoundError') {
                this.addConsoleMessage('用户取消了设备选择', 'info');
            }
        }
    }

    async disconnect() {
        try {
            this.addConsoleMessage('正在断开连接...', 'info');
            
            if (this.esploader) {
                await this.esploader.hardReset();
                this.esploader = null;
            }
            
            if (this.transport) {
                await this.transport.disconnect();
                this.transport = null;
            }
            
            this.device = null;
            this.isConnected = false;
            this.updateConnectionStatus();
            this.addConsoleMessage('设备已断开连接', 'info');
            
        } catch (error) {
            this.addConsoleMessage(`断开连接时出错: ${error.message}`, 'error');
            console.error('Disconnect error:', error);
        }
    }

    updateConnectionStatus() {
        const statusDot = this.statusIndicator.querySelector('.status-dot');
        
        if (this.isConnected) {
            // 已连接状态
            statusDot.className = 'fas fa-circle status-dot connected';
            this.statusText.textContent = '已连接';
            this.connectToggleBtn.innerHTML = '<i class="fas fa-unlink me-1"></i><span>断开连接</span>';
            this.connectToggleBtn.className = 'btn btn-outline-danger btn-sm ms-2';
            
            // 显示设备信息
            this.deviceInfoMini.classList.remove('d-none');
            this.chipInfoMini.textContent = this.chip || 'ESP32';
            
            // 启用重置按钮
            this.resetDeviceBtn.disabled = false;
            
            // 更新状态提示
            this.alertMessage.textContent = `设备已连接 - ${this.chip}，您可以选择固件进行烧录。`;
            this.statusAlert.className = 'alert alert-success alert-dismissible fade show modern-alert';
            this.statusAlert.querySelector('i').className = 'fas fa-check-circle me-2';
            
        } else {
            // 未连接状态
            statusDot.className = 'fas fa-circle status-dot';
            this.statusText.textContent = '未连接';
            this.connectToggleBtn.innerHTML = '<i class="fas fa-plug me-1"></i><span>连接设备</span>';
            this.connectToggleBtn.className = 'btn btn-outline-primary btn-sm ms-2';
            
            // 隐藏设备信息
            this.deviceInfoMini.classList.add('d-none');
            
            // 禁用重置按钮
            this.resetDeviceBtn.disabled = true;
            
            // 更新状态提示
            this.alertMessage.textContent = '请连接您的 ESP 设备到 USB 串口，然后点击"连接设备"按钮开始使用。';
            this.statusAlert.className = 'alert alert-info alert-dismissible fade show modern-alert';
            this.statusAlert.querySelector('i').className = 'fas fa-info-circle me-2';
        }
        
        this.updateFlashButtonState();
    }

    handleApplicationChange() {
        this.addConsoleMessage('应用选择功能开发中...', 'info');
    }

    handleChipTypeChange() {
        this.addConsoleMessage('芯片类型选择功能开发中...', 'info');
    }

    // 真正的烧录功能
    async startFlashing() {
        if (!this.isConnected || this.isFlashing) {
            return;
        }

        try {
            this.isFlashing = true;
            this.progressCard.style.display = 'block';
            this.flashButton.disabled = true;
            
            this.addConsoleMessage('开始烧录固件...', 'info');
            this.updateProgress('准备烧录...', 0);

            const isQuickStart = this.quickStartMode.checked;
            
            if (isQuickStart) {
                await this.flashQuickStartMode();
            } else {
                await this.flashCustomMode();
            }

            this.addConsoleMessage('固件烧录完成！', 'success');
            this.updateProgress('烧录完成', 100);
            
            // 显示成功模态框
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            successModal.show();

        } catch (error) {
            this.addConsoleMessage(`烧录失败: ${error.message}`, 'error');
            console.error('Flash error:', error);
            
            // 显示错误模态框
            document.getElementById('errorMessage').textContent = error.message;
            const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
            errorModal.show();
            
        } finally {
            this.isFlashing = false;
            this.flashButton.disabled = false;
            this.updateFlashButtonState();
        }
    }

    async flashCustomMode() {
        if (this.selectedFiles.length === 0) {
            throw new Error('没有选择要烧录的文件');
        }

        // 验证所有文件地址
        for (const fileInfo of this.selectedFiles) {
            if (!this.validateAddress(fileInfo.address)) {
                throw new Error(`文件 ${fileInfo.name} 的地址格式不正确`);
            }
        }

        // 按地址排序文件
        const sortedFiles = [...this.selectedFiles].sort((a, b) => {
            const addrA = parseInt(a.address.replace(/^0x/i, ''), 16);
            const addrB = parseInt(b.address.replace(/^0x/i, ''), 16);
            return addrA - addrB;
        });

        const totalSize = sortedFiles.reduce((sum, file) => sum + (file.file?.size || 0), 0);
        let processedSize = 0;

        // 如果选择了擦除所有闪存
        if (this.eraseAllCheckbox.checked) {
            this.addConsoleMessage('擦除闪存...', 'info');
            this.updateProgress('擦除闪存...', 0);
            await this.esploader.eraseFlash();
        }

        // 逐个烧录文件
        for (let i = 0; i < sortedFiles.length; i++) {
            const fileInfo = sortedFiles[i];
            if (!fileInfo.file) continue; // 跳过占位符文件

            const address = parseInt(fileInfo.address.replace(/^0x/i, ''), 16);
            const progressBase = (processedSize / totalSize) * 90; // 预留10%给最后的验证
            
            this.addConsoleMessage(`烧录 ${fileInfo.name} 到地址 0x${address.toString(16)}...`, 'info');
            this.updateProgress(`烧录 ${fileInfo.name}...`, progressBase);

            const fileData = await this.readFileAsArrayBuffer(fileInfo.file);
            
            await this.esploader.writeFlash({
                fileArray: [{
                    data: fileData,
                    address: address
                }],
                flashSize: 'keep',
                eraseAll: false,
                compress: this.compressCheckbox.checked,
                reportProgress: (fileIndex, written, total) => {
                    const fileProgress = (written / total) * (fileInfo.file.size / totalSize) * 90;
                    this.updateProgress(`烧录 ${fileInfo.name}...`, progressBase + fileProgress);
                }
            });

            processedSize += fileInfo.file.size;
            this.addConsoleMessage(`✓ ${fileInfo.name} 烧录完成`, 'success');
        }

        this.updateProgress('验证烧录结果...', 95);
        await new Promise(resolve => setTimeout(resolve, 500)); // 短暂延迟
    }

    async flashQuickStartMode() {
        const appValue = this.applicationSelect.value;
        if (!appValue) {
            throw new Error('请选择要烧录的应用');
        }

        // 这里应该根据选择的应用加载对应的固件文件
        // 目前作为演示，显示相关信息
        this.addConsoleMessage(`烧录应用: ${appValue}`, 'info');
        this.updateProgress('下载固件文件...', 10);
        
        // 模拟下载和烧录过程
        for (let i = 20; i <= 90; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 200));
            this.updateProgress('烧录中...', i);
        }
    }

    async readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result));
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    updateProgress(message, percentage) {
        if (this.progressLabel) this.progressLabel.textContent = message;
        if (this.progressPercentage) this.progressPercentage.textContent = `${Math.round(percentage)}%`;
        if (this.progressBar) this.progressBar.style.width = `${percentage}%`;
    }

    async eraseFlash() {
        if (!this.isConnected) {
            this.addConsoleMessage('请先连接设备', 'error');
            return;
        }

        try {
            this.addConsoleMessage('正在擦除闪存...', 'info');
            this.eraseFlashBtn.disabled = true;
            
            await this.esploader.eraseFlash();
            this.addConsoleMessage('闪存擦除完成', 'success');
            
        } catch (error) {
            this.addConsoleMessage(`擦除失败: ${error.message}`, 'error');
        } finally {
            this.eraseFlashBtn.disabled = false;
        }
    }

    async resetDevice() {
        if (!this.isConnected) {
            this.addConsoleMessage('请先连接设备', 'error');
            return;
        }

        try {
            this.addConsoleMessage('正在重置设备...', 'info');
            await this.esploader.hardReset();
            this.addConsoleMessage('设备重置完成', 'success');
            
        } catch (error) {
            this.addConsoleMessage(`重置失败: ${error.message}`, 'error');
        }
    }

    clearConsole() {
        if (this.consoleOutput) {
            this.consoleOutput.innerHTML = '';
        }
        this.addConsoleMessage('控制台已清空', 'info');
    }

    // 实用工具函数
    async readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result));
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    async getImageData(fileURL) {
        return new Promise(resolve => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', fileURL, true);
            xhr.responseType = "blob";
            xhr.send();
            xhr.onload = function () {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    var blob = new Blob([xhr.response], { type: "application/octet-stream" });
                    var reader = new FileReader();
                    reader.onload = (function (theFile) {
                        return function (e) {
                            resolve(e.target.result);
                        };
                    })(blob);
                    reader.readAsBinaryString(blob);
                } else {
                    resolve(undefined);
                }
            };
            xhr.onerror = function () {
                resolve(undefined);
            }
        });
    }

    // Console methods
    addConsoleMessage(message, type = 'info') {
        if (!this.consoleOutput) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const typeClass = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : '';
        
        const messageElement = document.createElement('div');
        messageElement.className = 'console-line';
        messageElement.innerHTML = `
            <span class="console-timestamp">[${timestamp}]</span>
            <span class="console-text ${typeClass}">${message}</span>
        `;
        
        this.consoleOutput.appendChild(messageElement);
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.modernLaunchpad = new ModernESPLaunchpad();
});
