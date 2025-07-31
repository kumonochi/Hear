class HearApp {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.deviceType = null;
        this.titleClickCount = 0;
        this.isConsoleVisible = false;
        this.ringtone = 'default';
        this.vibrationPattern = [200, 100, 200];
        this.callerName = '不明な発信者';
        this.audioContext = null;
        this.horrorAudio = null;
        this.ringtoneAudio = null;
        
        this.init();
    }
    
    init() {
        this.registerServiceWorker();
        this.setupEventListeners();
        this.setupPeerJS();
        this.generatePeerId();
        this.setupAudioContext();
        this.consoleLog('Hear App initialized');
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered:', registration);
                
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            if (confirm('新しいバージョンが利用可能です。更新しますか？')) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                window.location.reload();
                            }
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
    
    setupEventListeners() {
        const titleText = document.getElementById('titleText');
        const connectBtn = document.getElementById('connectBtn');
        const receiverBtn = document.getElementById('receiverBtn');
        const controllerBtn = document.getElementById('controllerBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');
        const receiverDisconnectBtn = document.getElementById('receiverDisconnectBtn');
        const acceptBtn = document.getElementById('acceptBtn');
        const declineBtn = document.getElementById('declineBtn');
        const callHorrorBtn = document.getElementById('callHorrorBtn');
        const callRealBtn = document.getElementById('callRealBtn');
        const changeRingtoneBtn = document.getElementById('changeRingtoneBtn');
        const changeVibrationBtn = document.getElementById('changeVibrationBtn');
        const setCallerNameBtn = document.getElementById('setCallerNameBtn');
        const setupBackBtn = document.getElementById('setupBackBtn');
        const consoleInput = document.getElementById('consoleInput');
        const consoleCloseBtn = document.getElementById('consoleCloseBtn');
        
        // 新しいUI要素
        const hostDeviceBtn = document.getElementById('hostDeviceBtn');
        const clientDeviceBtn = document.getElementById('clientDeviceBtn');
        const generateQRBtn = document.getElementById('generateQRBtn');
        const scanQRBtn = document.getElementById('scanQRBtn');
        const connectToHostBtn = document.getElementById('connectToHostBtn');
        const hostBackBtn = document.getElementById('hostBackBtn');
        const clientBackBtn = document.getElementById('clientBackBtn');
        
        // QR関連の変数
        this.qrCodeInstance = null;
        this.html5QrcodeScanner = null;
        
        titleText.addEventListener('click', () => this.handleTitleClick());
        connectBtn.addEventListener('click', () => this.connectToPeer());
        receiverBtn.addEventListener('click', () => this.selectDevice('receiver'));
        controllerBtn.addEventListener('click', () => this.selectDevice('controller'));
        disconnectBtn.addEventListener('click', () => this.disconnect());
        receiverDisconnectBtn.addEventListener('click', () => this.disconnect());
        acceptBtn.addEventListener('click', () => this.acceptCall());
        declineBtn.addEventListener('click', () => this.declineCall());
        callHorrorBtn.addEventListener('click', () => this.initiateHorrorCall());
        callRealBtn.addEventListener('click', () => this.initiateRealCall());
        changeRingtoneBtn.addEventListener('click', () => this.changeRingtone());
        changeVibrationBtn.addEventListener('click', () => this.changeVibration());
        setCallerNameBtn.addEventListener('click', () => this.setCallerName());
        setupBackBtn.addEventListener('click', () => this.backToTitle());
        consoleCloseBtn.addEventListener('click', () => this.toggleConsole());
        
        // 新しいイベントリスナー
        hostDeviceBtn.addEventListener('click', () => this.selectHostDevice());
        clientDeviceBtn.addEventListener('click', () => this.selectClientDevice());
        generateQRBtn.addEventListener('click', () => this.generateQRCode());
        scanQRBtn.addEventListener('click', () => this.startQRScanner());
        connectToHostBtn.addEventListener('click', () => this.connectToHost());
        hostBackBtn.addEventListener('click', () => this.backToTitle());
        clientBackBtn.addEventListener('click', () => this.backToTitle());
        
        consoleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeConsoleCommand(e.target.value);
                e.target.value = '';
            }
        });
    }
    
    setupPeerJS() {
        if (typeof Peer === 'undefined') {
            this.loadPeerJS().then(() => {
                this.initializePeer();
            });
        } else {
            this.initializePeer();
        }
    }
    
    async loadPeerJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    initializePeer() {
        // PeerJSの公式サーバーを使用
        this.peer = new Peer(undefined, {
            host: '0.peerjs.com',
            port: 443,
            path: '/',
            secure: true,
            debug: 2,
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });
        
        this.peer.on('open', (id) => {
            console.log('Peer ID:', id);
            document.getElementById('peerIdInput').value = id;
            this.consoleLog(`Peer connected with ID: ${id}`);
        });
        
        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.setupConnection();
            this.consoleLog('Incoming connection established');
        });
        
        this.peer.on('error', (error) => {
            console.error('Peer error:', error);
            this.consoleLog(`Peer error: ${error.message}`);
        });
    }
    
    generatePeerId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createHorrorAudio();
            this.createRingtoneAudio();
        } catch (error) {
            console.error('Audio context setup failed:', error);
        }
    }
    
    createHorrorAudio() {
        if (!this.audioContext) return;
        
        const duration = 30;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            
            for (let i = 0; i < channelData.length; i++) {
                const time = i / sampleRate;
                
                let sample = 0;
                sample += Math.sin(time * 200 * Math.PI * 2) * 0.1;
                sample += Math.sin(time * 666 * Math.PI * 2) * 0.05;
                sample += Math.sin(time * 120 * Math.PI * 2) * 0.08;
                sample += (Math.random() - 0.5) * 0.02;
                
                if (Math.random() < 0.001) {
                    sample += (Math.random() - 0.5) * 0.3;
                }
                
                const whisper = Math.sin(time * 50 * Math.PI * 2) * 0.03 * 
                               Math.sin(time * 0.5 * Math.PI * 2);
                sample += whisper;
                
                channelData[i] = Math.max(-1, Math.min(1, sample));
            }
        }
        
        this.horrorAudio = buffer;
    }
    
    createRingtoneAudio() {
        if (!this.audioContext) return;
        
        const duration = 2;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const channelData = buffer.getChannelData(0);
        
        for (let i = 0; i < channelData.length; i++) {
            const time = i / sampleRate;
            let sample = 0;
            
            if (time < 0.5) {
                sample = Math.sin(time * 800 * Math.PI * 2) * 0.3;
            } else if (time > 1 && time < 1.5) {
                sample = Math.sin(time * 800 * Math.PI * 2) * 0.3;
            }
            
            channelData[i] = sample;
        }
        
        this.ringtoneAudio = buffer;
    }
    
    handleTitleClick() {
        this.titleClickCount++;
        this.consoleLog(`Title clicked ${this.titleClickCount} times`);
        
        if (this.titleClickCount === 5) {
            this.showConsole();
            this.titleClickCount = 0;
        }
    }
    
    showSetupScreen() {
        document.getElementById('titleScreen').style.display = 'none';
        document.getElementById('setupScreen').style.display = 'block';
    }
    
    backToTitle() {
        // すべての画面を非表示
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('hostScreen').style.display = 'none';
        document.getElementById('clientScreen').style.display = 'none';
        document.getElementById('controlScreen').style.display = 'none';
        document.getElementById('receiverScreen').style.display = 'none';
        
        // タイトル画面を表示
        document.getElementById('titleScreen').style.display = 'block';
        
        // 状態をリセット
        this.deviceType = null;
        document.querySelectorAll('.device-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('remotePeerIdInput').value = '';
        
        // P2P接続をクリーンアップ
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
        
        // QRコードをクリーンアップ
        this.cleanupQR();
        
        this.consoleLog('Returned to title screen');
    }
    
    selectHostDevice() {
        this.deviceType = 'host';
        document.getElementById('titleScreen').style.display = 'none';
        document.getElementById('hostScreen').style.display = 'block';
        
        // PeerJS初期化（ホストとして）
        this.initializePeerAsHost();
        this.consoleLog('Selected as host device');
    }
    
    selectClientDevice() {
        this.deviceType = 'client';
        document.getElementById('titleScreen').style.display = 'none';
        document.getElementById('clientScreen').style.display = 'block';
        this.consoleLog('Selected as client device');
    }
    
    initializePeerAsHost() {
        if (this.peer) {
            this.peer.destroy();
        }
        
        this.peer = new Peer(undefined, {
            host: '0.peerjs.com',
            port: 443,
            path: '/',
            secure: true,
            debug: 2,
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });
        
        this.peer.on('open', (id) => {
            document.getElementById('hostPeerIdDisplay').textContent = id;
            this.consoleLog(`Host peer ID: ${id}`);
        });
        
        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.setupConnection();
            document.getElementById('connectionStatus').textContent = '受信デバイスが接続しました！';
            this.consoleLog('Client connected to host');
            
            // 操作画面に移行
            setTimeout(() => {
                document.getElementById('hostScreen').style.display = 'none';
                document.getElementById('controlScreen').style.display = 'block';
            }, 2000);
        });
        
        this.peer.on('error', (error) => {
            console.error('Host peer error:', error);
            this.consoleLog(`Host peer error: ${error.message}`);
        });
    }
    
    generateQRCode() {
        const peerId = document.getElementById('hostPeerIdDisplay').textContent;
        if (peerId === '接続中...' || !peerId) {
            alert('ピアIDの生成を待ってください');
            return;
        }
        
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = ''; // 既存のQRコードをクリア
        
        // ライブラリ読み込み待機
        setTimeout(() => {
            try {
                // QRCode.jsライブラリの確認
                console.log('QRCode library check:', typeof QRCode);
                this.consoleLog(`QRCode library status: ${typeof QRCode}`);
                
                if (typeof QRCode !== 'undefined' && QRCode.CorrectLevel) {
                    // QRCode.jsライブラリを使用
                    console.log('Using QRCode.js library');
                    this.qrCodeInstance = new QRCode(qrContainer, {
                        text: peerId,
                        width: 200,
                        height: 200,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.M
                    });
                    this.consoleLog('QR code generated with QRCode.js library');
                } else if (typeof QRCode !== 'undefined') {
                    // シンプルなQRCode使用（設定なし）
                    console.log('Using simple QRCode');
                    this.qrCodeInstance = new QRCode(qrContainer, peerId);
                    this.consoleLog('QR code generated with simple QRCode');
                } else {
                    throw new Error('QRCode library not available');
                }
                
                // QRコードが生成されたかチェック
                setTimeout(() => {
                    const qrImg = qrContainer.querySelector('img') || qrContainer.querySelector('canvas');
                    if (qrImg) {
                        this.consoleLog('QR code image/canvas found in DOM');
                    } else {
                        this.consoleLog('QR code not found in DOM, using fallback');
                        this.generateAdvancedFallbackQR(qrContainer, peerId);
                    }
                }, 500);
                
            } catch (error) {
                console.error('QR generation error:', error);
                this.consoleLog(`QR generation error: ${error.message}`);
                // 高度なフォールバック処理
                this.generateAdvancedFallbackQR(qrContainer, peerId);
            }
        }, 100);
    }
    
    generateAdvancedFallbackQR(container, text) {
        try {
            // Canvas APIを使用して実際のQRコード風パターンを生成
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            
            // 背景（白）
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 200, 200);
            
            // QRコード風パターンを生成
            ctx.fillStyle = '#000000';
            const cellSize = 8;
            const margin = 20;
            const gridSize = Math.floor((200 - margin * 2) / cellSize);
            
            // データをハッシュ化してパターンを決定
            const hashPattern = this.generateHashPattern(text, gridSize);
            
            // QRコードパターンを描画
            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    if (hashPattern[row] && hashPattern[row][col]) {
                        const x = margin + col * cellSize;
                        const y = margin + row * cellSize;
                        ctx.fillRect(x, y, cellSize, cellSize);
                    }
                }
            }
            
            // QRコードの位置検出パターン（左上、右上、左下）
            this.drawFinderPattern(ctx, margin, margin, cellSize);
            this.drawFinderPattern(ctx, margin + (gridSize - 7) * cellSize, margin, cellSize);
            this.drawFinderPattern(ctx, margin, margin + (gridSize - 7) * cellSize, cellSize);
            
            container.appendChild(canvas);
            
            // ピアIDも表示
            const textDiv = document.createElement('div');
            textDiv.style.cssText = 'margin-top: 10px; font-family: monospace; font-size: 10px; word-break: break-all; color: black; background: rgba(255,255,255,0.9); padding: 5px; border-radius: 5px;';
            textDiv.textContent = text;
            container.appendChild(textDiv);
            
            this.consoleLog('Advanced fallback QR pattern created');
        } catch (fallbackError) {
            console.error('Advanced fallback QR error:', fallbackError);
            // 最終フォールバック
            this.generateFallbackQR(container, text);
        }
    }
    
    generateHashPattern(text, size) {
        // 簡単なハッシュ関数でパターンを生成
        const pattern = [];
        for (let i = 0; i < size; i++) {
            pattern[i] = [];
            for (let j = 0; j < size; j++) {
                const hash = this.simpleHash(text + i + j);
                pattern[i][j] = hash % 2 === 0;
            }
        }
        return pattern;
    }
    
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit整数に変換
        }
        return Math.abs(hash);
    }
    
    drawFinderPattern(ctx, x, y, cellSize) {
        // 7x7の位置検出パターン
        ctx.fillStyle = '#000000';
        
        // 外枠
        ctx.fillRect(x, y, 7 * cellSize, cellSize);
        ctx.fillRect(x, y + 6 * cellSize, 7 * cellSize, cellSize);
        ctx.fillRect(x, y, cellSize, 7 * cellSize);
        ctx.fillRect(x + 6 * cellSize, y, cellSize, 7 * cellSize);
        
        // 内側の3x3パターン
        ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
    }
    
    generateFallbackQR(container, text) {
        try {
            // シンプルなテキスト表示（最終フォールバック）
            container.innerHTML = `
                <div style="background: white; border: 2px solid #000000; padding: 20px; border-radius: 10px; color: black; text-align: center; width: 200px; height: 200px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <h3 style="color: #000000; margin: 0 0 10px 0;">ピアID</h3>
                    <p style="font-family: monospace; word-break: break-all; margin: 10px 0; font-size: 12px; line-height: 1.2;">${text}</p>
                    <small style="color: #666;">手動で入力してください</small>
                </div>
            `;
            this.consoleLog('Text-based peer ID display created');
        } catch (error) {
            console.error('Final fallback error:', error);
            container.innerHTML = '<p style="color: #ff0000;">表示エラー</p>';
        }
    }
    
    startQRScanner() {
        const qrReaderDiv = document.getElementById('qr-reader');
        
        try {
            if (typeof Html5QrcodeScanner !== 'undefined') {
                // QRスキャナーの設定を最適化
                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    disableFlip: false,
                    videoConstraints: {
                        facingMode: { ideal: "environment" } // バックカメラを優先
                    },
                    formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
                };
                
                this.html5QrcodeScanner = new Html5QrcodeScanner(
                    'qr-reader',
                    config,
                    false
                );
                
                this.html5QrcodeScanner.render(
                    (decodedText, decodedResult) => {
                        // QRコード読み取り成功
                        document.getElementById('clientPeerIdInput').value = decodedText;
                        this.html5QrcodeScanner.clear().then(() => {
                            this.connectToHost();
                            this.consoleLog(`QR code scanned: ${decodedText}`);
                        }).catch(err => {
                            console.warn('QR scanner clear warning:', err);
                            this.connectToHost();
                            this.consoleLog(`QR code scanned: ${decodedText}`);
                        });
                    },
                    (error) => {
                        // 通常のスキャン中のエラーは無視
                        // console.warn('QR scan warning:', error);
                    }
                );
                
                this.consoleLog('QR scanner started with back camera preference');
            } else if (typeof Html5Qrcode !== 'undefined') {
                // Html5Qrcodeクラスを直接使用するフォールバック
                this.startAlternativeQRScanner(qrReaderDiv);
            } else {
                throw new Error('Html5QrcodeScanner library not loaded');
            }
        } catch (error) {
            console.error('QR scanner error:', error);
            this.consoleLog(`QR scanner error: ${error.message}`);
            qrReaderDiv.innerHTML = '<p style="color: #ff0000;">QRスキャナー初期化エラー<br>カメラのアクセス許可を確認してください</p>';
        }
    }
    
    startAlternativeQRScanner(container) {
        try {
            container.innerHTML = '<div id="qr-reader-direct" style="width: 100%;"></div>';
            
            const html5QrCode = new Html5Qrcode("qr-reader-direct");
            
            // カメラの取得を試行
            Html5Qrcode.getCameras().then(devices => {
                if (devices && devices.length) {
                    // バックカメラを探す
                    let cameraId = devices[0].id;
                    for (let device of devices) {
                        if (device.label.toLowerCase().includes('back') || 
                            device.label.toLowerCase().includes('rear') ||
                            device.label.toLowerCase().includes('environment')) {
                            cameraId = device.id;
                            break;
                        }
                    }
                    
                    // QRコードスキャン開始
                    html5QrCode.start(
                        cameraId,
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 }
                        },
                        (decodedText, decodedResult) => {
                            document.getElementById('clientPeerIdInput').value = decodedText;
                            html5QrCode.stop().then(() => {
                                this.connectToHost();
                                this.consoleLog(`QR code scanned (alternative): ${decodedText}`);
                            });
                        },
                        (errorMessage) => {
                            // エラーを無視
                        }
                    ).catch(err => {
                        console.error('Alternative QR scanner start error:', err);
                        container.innerHTML = '<p style="color: #ff0000;">カメラアクセスエラー</p>';
                    });
                    
                    this.html5QrCode = html5QrCode; // クリーンアップ用に保存
                }
            }).catch(err => {
                console.error('Camera detection error:', err);
                container.innerHTML = '<p style="color: #ff0000;">カメラが見つかりません</p>';
            });
        } catch (error) {
            console.error('Alternative QR scanner error:', error);
            container.innerHTML = '<p style="color: #ff0000;">代替QRスキャナーエラー</p>';
        }
    }
    
    connectToHost() {
        const hostPeerId = document.getElementById('clientPeerIdInput').value.trim();
        
        if (!hostPeerId) {
            alert('ピアIDを入力してください');
            return;
        }
        
        // P2P接続を開始
        if (this.peer) {
            this.peer.destroy();
        }
        
        this.peer = new Peer(undefined, {
            host: '0.peerjs.com',
            port: 443,
            path: '/',
            secure: true,
            debug: 2,
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });
        
        this.peer.on('open', (id) => {
            this.connection = this.peer.connect(hostPeerId);
            this.setupConnection();
            this.consoleLog(`Connecting to host: ${hostPeerId}`);
            
            this.connection.on('open', () => {
                document.getElementById('clientScreen').style.display = 'none';
                document.getElementById('receiverScreen').style.display = 'block';
                this.consoleLog('Connected to host successfully');
            });
        });
        
        this.peer.on('error', (error) => {
            console.error('Client peer error:', error);
            alert('接続に失敗しました: ' + error.message);
            this.consoleLog(`Client peer error: ${error.message}`);
        });
    }
    
    cleanupQR() {
        // QRコードインスタンスをクリーンアップ
        if (this.qrCodeInstance) {
            const qrContainer = document.getElementById('qrcode');
            if (qrContainer) {
                qrContainer.innerHTML = '';
            }
            this.qrCodeInstance = null;
        }
        
        // QRスキャナーをクリーンアップ
        if (this.html5QrcodeScanner) {
            this.html5QrcodeScanner.clear().catch(err => {
                console.warn('QR scanner cleanup warning:', err);
            });
            this.html5QrcodeScanner = null;
        }
        
        // 代替QRスキャナーをクリーンアップ
        if (this.html5QrCode) {
            this.html5QrCode.stop().catch(err => {
                console.warn('Alternative QR scanner cleanup warning:', err);
            });
            this.html5QrCode = null;
        }
    }
    
    selectDevice(type) {
        this.deviceType = type;
        document.querySelectorAll('.device-btn').forEach(btn => btn.classList.remove('active'));
        
        if (type === 'receiver') {
            document.getElementById('receiverBtn').classList.add('active');
        } else {
            document.getElementById('controllerBtn').classList.add('active');
        }
        
        this.consoleLog(`Device type selected: ${type}`);
    }
    
    connectToPeer() {
        const remotePeerId = document.getElementById('remotePeerIdInput').value.trim();
        
        if (!remotePeerId) {
            alert('接続先のピアIDを入力してください');
            return;
        }
        
        if (!this.deviceType) {
            alert('デバイスタイプを選択してください');
            return;
        }
        
        this.connection = this.peer.connect(remotePeerId);
        this.setupConnection();
        this.consoleLog(`Connecting to peer: ${remotePeerId}`);
    }
    
    setupConnection() {
        if (!this.connection) return;
        
        this.connection.on('open', () => {
            console.log('Connection established');
            this.consoleLog('P2P connection established');
            this.showDeviceScreen();
            
            this.connection.send({
                type: 'device_type',
                deviceType: this.deviceType
            });
        });
        
        this.connection.on('data', (data) => {
            this.handleIncomingData(data);
        });
        
        this.connection.on('close', () => {
            this.consoleLog('Connection closed');
            this.disconnect();
        });
        
        this.connection.on('error', (error) => {
            console.error('Connection error:', error);
            this.consoleLog(`Connection error: ${error.message}`);
        });
    }
    
    showDeviceScreen() {
        document.getElementById('setupScreen').style.display = 'none';
        
        if (this.deviceType === 'controller') {
            document.getElementById('controlScreen').style.display = 'block';
        } else {
            document.getElementById('receiverScreen').style.display = 'block';
        }
    }
    
    handleIncomingData(data) {
        this.consoleLog(`Received data: ${JSON.stringify(data)}`);
        
        switch (data.type) {
            case 'horror_call':
                this.showIncomingCall(data.callerName || this.callerName);
                break;
            case 'real_call':
                this.showIncomingCall(data.callerName || this.callerName, true);
                break;
            case 'end_call':
                this.endCall();
                break;
            case 'settings_update':
                this.updateSettings(data.settings);
                break;
        }
    }
    
    showIncomingCall(callerName, isRealCall = false) {
        document.getElementById('callerName').textContent = this.garbleText(callerName);
        document.getElementById('callerNumber').textContent = this.generatePhoneNumber();
        document.getElementById('incomingCall').style.display = 'flex';
        
        this.playRingtone();
        this.vibrate();
        
        if (isRealCall) {
            document.getElementById('incomingCall').dataset.realCall = 'true';
        }
        
        this.consoleLog(`Incoming call from: ${callerName}`);
    }
    
    garbleText(text) {
        const garbledChars = '▓░▒█▄▀■□▲●◆★☆※〒◇◎○△▽';
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
            if (Math.random() < 0.3) {
                result += garbledChars[Math.floor(Math.random() * garbledChars.length)];
            } else {
                result += text[i];
            }
        }
        
        return result;
    }
    
    generatePhoneNumber() {
        const numbers = ['090', '080', '070'][Math.floor(Math.random() * 3)];
        return `${numbers}-XXXX-XXXX`;
    }
    
    playRingtone() {
        if (!this.audioContext || !this.ringtoneAudio) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.ringtoneAudio;
        source.loop = true;
        source.connect(this.audioContext.destination);
        source.start();
        
        this.currentRingtoneSource = source;
    }
    
    stopRingtone() {
        if (this.currentRingtoneSource) {
            this.currentRingtoneSource.stop();
            this.currentRingtoneSource = null;
        }
    }
    
    vibrate() {
        if ('vibrate' in navigator) {
            const vibrationLoop = () => {
                navigator.vibrate(this.vibrationPattern);
                this.vibrationTimeout = setTimeout(vibrationLoop, 1000);
            };
            vibrationLoop();
        }
    }
    
    stopVibration() {
        if (this.vibrationTimeout) {
            clearTimeout(this.vibrationTimeout);
            this.vibrationTimeout = null;
        }
        if ('vibrate' in navigator) {
            navigator.vibrate(0);
        }
    }
    
    acceptCall() {
        this.stopRingtone();
        this.stopVibration();
        
        const isRealCall = document.getElementById('incomingCall').dataset.realCall === 'true';
        
        if (isRealCall) {
            this.startRealCall();
        } else {
            this.playHorrorAudio();
        }
        
        document.getElementById('incomingCall').style.display = 'none';
        this.consoleLog('Call accepted');
    }
    
    declineCall() {
        this.stopRingtone();
        this.stopVibration();
        document.getElementById('incomingCall').style.display = 'none';
        this.consoleLog('Call declined');
    }
    
    playHorrorAudio() {
        if (!this.audioContext || !this.horrorAudio) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.horrorAudio;
        source.connect(this.audioContext.destination);
        source.start();
        
        setTimeout(() => {
            source.stop();
        }, 30000);
        
        this.consoleLog('Playing horror audio');
    }
    
    async startRealCall() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupVoiceChanger(stream);
            this.consoleLog('Real call started with voice changer');
        } catch (error) {
            console.error('Failed to get user media:', error);
            this.consoleLog('Failed to start real call');
        }
    }
    
    setupVoiceChanger(stream) {
        if (!this.audioContext) return;
        
        const source = this.audioContext.createMediaStreamSource(stream);
        const destination = this.audioContext.createMediaStreamDestination();
        
        const pitchShifter = this.createPitchShifter();
        const distortion = this.createDistortion();
        const reverb = this.createReverb();
        
        source.connect(pitchShifter);
        pitchShifter.connect(distortion);
        distortion.connect(reverb);
        reverb.connect(destination);
        
        const audioElement = document.createElement('audio');
        audioElement.srcObject = destination.stream;
        audioElement.play();
        
        this.voiceChangerStream = destination.stream;
    }
    
    createPitchShifter() {
        const bufferSize = 4096;
        const scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        
        let phase = 0;
        const pitchRatio = 0.7;
        
        scriptProcessor.onaudioprocess = (event) => {
            const inputBuffer = event.inputBuffer.getChannelData(0);
            const outputBuffer = event.outputBuffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                const index = Math.floor(phase);
                if (index < inputBuffer.length - 1) {
                    const fraction = phase - index;
                    outputBuffer[i] = inputBuffer[index] * (1 - fraction) + 
                                     inputBuffer[index + 1] * fraction;
                } else {
                    outputBuffer[i] = inputBuffer[inputBuffer.length - 1];
                }
                
                phase += pitchRatio;
                if (phase >= inputBuffer.length) {
                    phase -= inputBuffer.length;
                }
            }
        };
        
        return scriptProcessor;
    }
    
    createDistortion() {
        const waveShaperNode = this.audioContext.createWaveShaper();
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + 20) * x * 20 * deg) / (Math.PI + 20 * Math.abs(x));
        }
        
        waveShaperNode.curve = curve;
        waveShaperNode.oversample = '4x';
        
        return waveShaperNode;
    }
    
    createReverb() {
        const convolver = this.audioContext.createConvolver();
        const reverbTime = 2;
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * reverbTime;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, 2);
                channelData[i] = (Math.random() * 2 - 1) * decay;
            }
        }
        
        convolver.buffer = impulse;
        return convolver;
    }
    
    initiateHorrorCall() {
        if (!this.connection) return;
        
        this.connection.send({
            type: 'horror_call',
            callerName: this.callerName
        });
        
        this.consoleLog('Horror call initiated');
    }
    
    initiateRealCall() {
        if (!this.connection) return;
        
        this.connection.send({
            type: 'real_call',
            callerName: this.callerName
        });
        
        this.consoleLog('Real call initiated');
    }
    
    changeRingtone() {
        const ringtones = ['default', 'horror', 'classic'];
        const currentIndex = ringtones.indexOf(this.ringtone);
        this.ringtone = ringtones[(currentIndex + 1) % ringtones.length];
        
        alert(`着信音を「${this.ringtone}」に変更しました`);
        this.consoleLog(`Ringtone changed to: ${this.ringtone}`);
    }
    
    changeVibration() {
        const patterns = [
            [200, 100, 200],
            [100, 50, 100, 50, 100],
            [500, 200, 500]
        ];
        
        const currentIndex = patterns.findIndex(p => 
            JSON.stringify(p) === JSON.stringify(this.vibrationPattern)
        );
        this.vibrationPattern = patterns[(currentIndex + 1) % patterns.length];
        
        alert(`バイブレーションパターンを変更しました`);
        this.consoleLog(`Vibration pattern changed`);
    }
    
    setCallerName() {
        const newName = prompt('架電者の名前を入力してください:', this.callerName);
        if (newName) {
            this.callerName = newName;
            this.consoleLog(`Caller name set to: ${newName}`);
        }
    }
    
    disconnect() {
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
        
        document.getElementById('controlScreen').style.display = 'none';
        document.getElementById('receiverScreen').style.display = 'none';
        document.getElementById('titleScreen').style.display = 'block';
        
        this.consoleLog('Disconnected from peer');
    }
    
    endCall() {
        this.stopRingtone();
        this.stopVibration();
        document.getElementById('incomingCall').style.display = 'none';
    }
    
    showConsole() {
        document.getElementById('console').style.display = 'flex';
        this.isConsoleVisible = true;
        this.consoleLog('Debug console activated');
    }
    
    toggleConsole() {
        const consoleElement = document.getElementById('console');
        if (this.isConsoleVisible) {
            consoleElement.style.display = 'none';
            this.isConsoleVisible = false;
            this.consoleLog('Debug console hidden');
        } else {
            consoleElement.style.display = 'flex';
            this.isConsoleVisible = true;
            this.consoleLog('Debug console shown');
        }
    }
    
    consoleLog(message) {
        const output = document.getElementById('consoleOutput');
        const timestamp = new Date().toLocaleTimeString();
        output.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        output.scrollTop = output.scrollHeight;
    }
    
    executeConsoleCommand(command) {
        this.consoleLog(`> ${command}`);
        
        try {
            const result = eval(command);
            this.consoleLog(`< ${result}`);
        } catch (error) {
            this.consoleLog(`Error: ${error.message}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.hearApp = new HearApp();
});

function toggleConsole() {
    if (window.hearApp) {
        window.hearApp.toggleConsole();
    }
}