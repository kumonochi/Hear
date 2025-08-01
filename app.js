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
        this.currentHorrorSource = null;
        this.currentPseudoSource = null;
        this.phoneNumberInterval = null;
        
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
        const acceptBtn = document.getElementById('acceptBtn');
        const declineBtn = document.getElementById('declineBtn');
        const callHorrorBtn = document.getElementById('callHorrorBtn');
        const pseudoCallBtn = document.getElementById('pseudoCallBtn');
        const changeRingtoneBtn = document.getElementById('changeRingtoneBtn');
        const changeVibrationBtn = document.getElementById('changeVibrationBtn');
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
        const endCallBtn = document.getElementById('endCallBtn');
        
        // 受信デバイス用ボタン
        const receiverAcceptBtn = document.getElementById('receiverAcceptBtn');
        const receiverDeclineBtn = document.getElementById('receiverDeclineBtn');
        
        // QR関連の変数
        this.qrCodeInstance = null;
        this.html5QrcodeScanner = null;
        
        titleText.addEventListener('click', () => this.handleTitleClick());
        if (connectBtn) connectBtn.addEventListener('click', () => this.connectToPeer());
        if (receiverBtn) receiverBtn.addEventListener('click', () => this.selectDevice('receiver'));
        if (controllerBtn) controllerBtn.addEventListener('click', () => this.selectDevice('controller'));
        if (acceptBtn) acceptBtn.addEventListener('click', () => this.acceptCall());
        if (declineBtn) declineBtn.addEventListener('click', () => this.declineCall());
        if (callHorrorBtn) callHorrorBtn.addEventListener('click', () => this.initiateDirectCall());
        if (pseudoCallBtn) pseudoCallBtn.addEventListener('click', () => this.initiatePseudoCall());
        if (changeRingtoneBtn) changeRingtoneBtn.addEventListener('click', () => this.changeRingtone());
        if (changeVibrationBtn) changeVibrationBtn.addEventListener('click', () => this.changeVibration());
        if (setupBackBtn) setupBackBtn.addEventListener('click', () => this.backToTitle());
        if (consoleCloseBtn) consoleCloseBtn.addEventListener('click', () => this.toggleConsole());
        
        // 新しいイベントリスナー
        if (hostDeviceBtn) {
            hostDeviceBtn.addEventListener('click', () => {
                console.log('Host device button clicked');
                this.selectHostDevice();
            });
        } else {
            console.error('hostDeviceBtn not found');
        }
        
        if (clientDeviceBtn) {
            clientDeviceBtn.addEventListener('click', () => {
                console.log('Client device button clicked');
                this.selectClientDevice();
            });
        } else {
            console.error('clientDeviceBtn not found');
        }
        generateQRBtn.addEventListener('click', () => this.generateQRCode());
        scanQRBtn.addEventListener('click', () => this.startQRScanner());
        connectToHostBtn.addEventListener('click', () => this.connectToHost());
        hostBackBtn.addEventListener('click', () => this.backToTitle());
        clientBackBtn.addEventListener('click', () => this.backToTitle());
        endCallBtn.addEventListener('click', () => this.endCall());
        
        // 受信デバイス用ボタンのイベントリスナー
        if (receiverAcceptBtn) receiverAcceptBtn.addEventListener('click', () => this.acceptCall());
        if (receiverDeclineBtn) receiverDeclineBtn.addEventListener('click', () => this.declineCall());
        
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
        
        // 着信音のタイプによって異なる音を生成
        for (let i = 0; i < channelData.length; i++) {
            const time = i / sampleRate;
            let sample = 0;
            
            switch (this.ringtone) {
                case 'default':
                    // デフォルトの着信音
                    if (time < 0.5) {
                        sample = Math.sin(time * 800 * Math.PI * 2) * 0.3;
                    } else if (time > 1 && time < 1.5) {
                        sample = Math.sin(time * 800 * Math.PI * 2) * 0.3;
                    }
                    break;
                    
                case 'horror':
                    // ホラー系の着信音
                    sample = Math.sin(time * 200 * Math.PI * 2) * 0.2 + 
                             Math.sin(time * 666 * Math.PI * 2) * 0.1 + 
                             (Math.random() - 0.5) * 0.05;
                    if (Math.random() < 0.002) {
                        sample += (Math.random() - 0.5) * 0.4;
                    }
                    break;
                    
                case 'classic':
                    // クラシックな電話の音
                    const ringFreq = 440; // A音
                    if ((time % 3) < 1) {
                        sample = Math.sin(time * ringFreq * Math.PI * 2) * 0.4 * 
                                Math.sin(time * 10 * Math.PI * 2); // トレモロ効果
                    }
                    break;
            }
            
            channelData[i] = Math.max(-1, Math.min(1, sample));
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
        console.log('selectHostDevice called');
        this.deviceType = 'host';
        
        const titleScreen = document.getElementById('titleScreen');
        const hostScreen = document.getElementById('hostScreen');
        
        console.log('titleScreen:', titleScreen);
        console.log('hostScreen:', hostScreen);
        
        if (titleScreen) titleScreen.style.display = 'none';
        if (hostScreen) hostScreen.style.display = 'block';
        
        // PeerJS初期化（ホストとして）
        this.initializePeerAsHost();
        this.consoleLog('Selected as host device');
    }
    
    selectClientDevice() {
        console.log('selectClientDevice called');
        this.deviceType = 'client';
        
        const titleScreen = document.getElementById('titleScreen');
        const clientScreen = document.getElementById('clientScreen');
        
        console.log('titleScreen:', titleScreen);
        console.log('clientScreen:', clientScreen);
        
        if (titleScreen) titleScreen.style.display = 'none';
        if (clientScreen) clientScreen.style.display = 'block';
        this.consoleLog('Selected as client device');
    }
    
    initializePeerAsHost() {
        try {
            console.log('Initializing peer as host...');
            
            if (this.peer) {
                this.peer.destroy();
            }
            
            // PeerJSライブラリの確認
            if (typeof Peer === 'undefined') {
                console.warn('Peer library not loaded, attempting to load...');
                this.loadPeerJS().then(() => {
                    this.initializePeerAsHost();
                }).catch(error => {
                    console.error('Failed to load PeerJS:', error);
                    this.consoleLog('PeerJS loading failed, continuing without P2P');
                });
                return;
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
                const hostPeerIdDisplay = document.getElementById('hostPeerIdDisplay');
                if (hostPeerIdDisplay) {
                    hostPeerIdDisplay.textContent = id;
                }
                this.consoleLog(`Host peer ID: ${id}`);
            });
            
            this.peer.on('connection', (conn) => {
                this.connection = conn;
                this.setupConnection();
                const connectionStatus = document.getElementById('connectionStatus');
                if (connectionStatus) {
                    connectionStatus.textContent = '受信デバイスが接続しました！';
                }
                this.consoleLog('Client connected to host');
                
                // 操作画面に移行
                setTimeout(() => {
                    const hostScreen = document.getElementById('hostScreen');
                    const controlScreen = document.getElementById('controlScreen');
                    if (hostScreen) hostScreen.style.display = 'none';
                    if (controlScreen) {
                        controlScreen.style.display = 'block';
                        // 状態表示を有効化
                        this.updateCallStatus('待機中', '#ffff00');
                    }
                }, 2000);
            });
            
            this.peer.on('error', (error) => {
                console.error('Host peer error:', error);
                this.consoleLog(`Host peer error: ${error.message}`);
            });
            
            console.log('Peer initialization completed');
        } catch (error) {
            console.error('Error initializing peer as host:', error);
            this.consoleLog(`Peer initialization error: ${error.message}`);
        }
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
                    // QRコードコンテナに白いマージンを追加
                    setTimeout(() => {
                        const qrImg = qrContainer.querySelector('img');
                        if (qrImg) {
                            qrImg.style.border = '19px solid white';
                            qrImg.style.borderRadius = '10px';
                        }
                    }, 100);
                    this.consoleLog('QR code generated with QRCode.js library');
                } else if (typeof QRCode !== 'undefined') {
                    // シンプルなQRCode使用（設定なし）
                    console.log('Using simple QRCode');
                    this.qrCodeInstance = new QRCode(qrContainer, peerId);
                    this.consoleLog('QR code generated with simple QRCode');
                    // QRコードコンテナに白いマージンを追加
                    setTimeout(() => {
                        const qrImg = qrContainer.querySelector('img');
                        if (qrImg) {
                            qrImg.style.border = '19px solid white';
                            qrImg.style.borderRadius = '10px';
                        }
                    }, 100);
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
            
            // 背景（白） - より大きな白い余白
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 200, 200);
            
            // 追加の白い枠（内部マージン）
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 200, 200);
            
            // QRコード風パターンを生成
            ctx.fillStyle = '#000000';
            const cellSize = 6;
            const margin = 35;
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
            
            // QRコードにさらなる白い境界線を追加（5mm相当）
            canvas.style.border = '19px solid white';
            canvas.style.borderRadius = '10px';
            
            // ピアIDも表示
            const textDiv = document.createElement('div');
            textDiv.style.cssText = 'margin-top: 15px; font-family: monospace; font-size: 10px; word-break: break-all; color: black; background: rgba(255,255,255,0.95); padding: 12px; border-radius: 8px; border: 3px solid white;';
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
                <div style="background: white; border: 2px solid #000000; padding: 20px; border-radius: 10px; color: black; text-align: center; width: 200px; height: 200px; display: flex; flex-direction: column; justify-content: center; align-items: center; margin: 19px; box-shadow: 0 0 0 19px white;">
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
                // 受信待機中画面は削除されたため、何も表示しない
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
            // 受信待機中画面は削除されたため、何も表示しない
        }
    }
    
    handleIncomingData(data) {
        this.consoleLog(`Received data: ${JSON.stringify(data)}`);
        
        switch (data.type) {
            case 'direct_call':
                this.showIncomingCall(data.callerName || this.callerName);
                break;
            case 'pseudo_call':
                this.showIncomingCall(data.callerName || this.callerName, false, true);
                break;
            case 'real_call':
                this.showIncomingCall(data.callerName || this.callerName, true);
                break;
            case 'end_call':
                this.endCall();
                break;
            case 'call_accepted':
                this.handleCallAccepted(data);
                break;
            case 'call_ended':
                this.handleCallEnded();
                break;
            case 'call_declined':
                this.updateCallStatus('通話が拒否されました', '#ff0000');
                setTimeout(() => {
                    this.updateCallStatus('待機中', '#ffff00');
                }, 3000);
                break;
            case 'ringtone_changed':
                this.ringtone = data.ringtone;
                this.createRingtoneAudio();
                this.consoleLog(`Ringtone updated to: ${data.ringtone}`);
                break;
            case 'vibration_changed':
                this.vibrationPattern = data.vibrationPattern;
                this.consoleLog(`Vibration pattern updated`);
                break;
            case 'settings_update':
                this.updateSettings(data.settings);
                break;
        }
    }
    
    showIncomingCall(callerName, isRealCall = false, isPseudoCall = false) {
        // 受信デバイスの場合は真っ赤な画面を表示
        if (this.deviceType === 'client') {
            // 着信者情報を設定
            const receiverCallerNameElement = document.getElementById('receiverCallerName');
            const receiverCallerNumberElement = document.getElementById('receiverCallerNumber');
            
            if (isPseudoCall) {
                receiverCallerNameElement.textContent = this.garbleText(callerName);
                // 着信者名をリアルタイムで文字化けさせる
                this.startNameGarbling(receiverCallerNameElement, callerName);
            } else {
                receiverCallerNameElement.textContent = this.garbleText(callerName);
            }
            
            receiverCallerNumberElement.textContent = this.generatePhoneNumber();
            
            // 電話番号のリアルタイムアニメーションを開始
            this.startPhoneNumberAnimation(receiverCallerNumberElement);
            
            document.getElementById('receiverCallScreen').style.display = 'flex';
            document.getElementById('receiverIncomingButtons').style.display = 'flex';
            this.consoleLog('Receiver device: showing red screen for incoming call');
        } else {
            // 操作デバイスの場合は通常の着信画面を表示
            const callerNameElement = document.getElementById('callerName');
            callerNameElement.textContent = this.garbleText(callerName);
            document.getElementById('callerNumber').textContent = this.generatePhoneNumber();
            document.getElementById('incomingCall').style.display = 'flex';
            
            // 電話番号のリアルタイムアニメーションを開始
            this.startPhoneNumberAnimation();
            
            if (isRealCall) {
                document.getElementById('incomingCall').dataset.realCall = 'true';
            }
            
            if (isPseudoCall) {
                document.getElementById('incomingCall').dataset.pseudoCall = 'true';
                // 着信者名をリアルタイムで文字化けさせる
                this.startNameGarbling(callerNameElement, callerName);
            }
        }
        
        this.playRingtone();
        this.vibrate();
        
        this.consoleLog(`Incoming call from: ${callerName} (real: ${isRealCall}, pseudo: ${isPseudoCall})`);
    }
    
    startNameGarbling(element, originalName) {
        // 既存のアニメーションをクリア
        if (this.nameGarblingInterval) {
            clearInterval(this.nameGarblingInterval);
        }
        
        this.nameGarblingInterval = setInterval(() => {
            element.textContent = this.garbleText(originalName);
        }, 100); // 100msごとに文字化け更新
    }
    
    stopNameGarbling() {
        if (this.nameGarblingInterval) {
            clearInterval(this.nameGarblingInterval);
            this.nameGarblingInterval = null;
        }
    }
    
    garbleText(text) {
        const garbledChars = '縺ゅ↑縺溘?縺薙→繧呈爾縺励※縺?∪縺励◆縲ゅ≠縺ｪ縺溘↓螢ｰ繧貞ｱ翫￠縺溘￥縺ｦ縲√≠縺ｪ縺溘′縺?◆縺九ｉ縲√≠縺ｪ縺溘′謇句?縺ｨ縺｣縺ｦ縺上ｌ縺溘°繧峨?ゅ□縺九ｉ荳?邱偵↓縺?※縲ゅ□縺｣縺ｦ縲∬ｪｭ繧√※縺?ｋ繧薙〒縺励ｇ縺?ｼ';
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
            if (Math.random() < 0.6) {
                result += garbledChars[Math.floor(Math.random() * garbledChars.length)];
            } else {
                result += text[i];
            }
        }
        
        return result;
    }
    
    generatePhoneNumber() {
        // ランダムな数字を生成
        let number = '';
        for (let i = 0; i < 11; i++) {
            if (i === 3 || i === 7) {
                number += '-';
            } else {
                number += Math.floor(Math.random() * 10);
            }
        }
        return number;
    }
    
    startPhoneNumberAnimation(targetElement = null) {
        const phoneNumberElement = targetElement || document.getElementById('callerNumber');
        if (!phoneNumberElement) return;
        
        // 既存のアニメーションを停止
        this.stopPhoneNumberAnimation();
        
        // 100msごとに電話番号を更新
        this.phoneNumberInterval = setInterval(() => {
            phoneNumberElement.textContent = this.generatePhoneNumber();
        }, 100);
        
        this.consoleLog('Phone number animation started');
    }
    
    stopPhoneNumberAnimation() {
        if (this.phoneNumberInterval) {
            clearInterval(this.phoneNumberInterval);
            this.phoneNumberInterval = null;
            this.consoleLog('Phone number animation stopped');
        }
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
        this.stopNameGarbling();
        this.stopPhoneNumberAnimation();
        
        // 受信デバイスの場合は既に赤い画面が表示されているので、通話受理を通知してボタンを隠す
        if (this.deviceType === 'client') {
            // 着信ボタンを隠す
            document.getElementById('receiverIncomingButtons').style.display = 'none';
            
            if (this.connection) {
                this.connection.send({
                    type: 'call_accepted',
                    callType: 'direct' // 受信デバイスはシンプルに通知するだけ
                });
            }
            this.consoleLog('Call accepted by receiver device');
            return;
        }
        
        // 操作デバイスの場合の処理
        const incomingCallElement = document.getElementById('incomingCall');
        const isRealCall = incomingCallElement.dataset.realCall === 'true';
        const isPseudoCall = incomingCallElement.dataset.pseudoCall === 'true';
        
        // 操作デバイスに通話受理を通知
        if (this.connection) {
            this.connection.send({
                type: 'call_accepted',
                callType: isPseudoCall ? 'pseudo' : (isRealCall ? 'real' : 'direct')
            });
        }
        
        if (isRealCall) {
            this.startRealCall();
            this.showReceiverCallScreen();
        } else if (isPseudoCall) {
            this.playPseudoCallAudio();
            this.showReceiverCallScreen();
        } else {
            this.playHorrorAudio();
            this.showReceiverCallScreen();
        }
        
        incomingCallElement.style.display = 'none';
        // データセットをクリア
        delete incomingCallElement.dataset.realCall;
        delete incomingCallElement.dataset.pseudoCall;
        
        this.consoleLog('Call accepted');
    }
    
    declineCall() {
        this.stopRingtone();
        this.stopVibration();
        this.stopNameGarbling();
        this.stopPhoneNumberAnimation();
        this.stopAllAudio();
        
        // 受信デバイスの場合は赤い画面を非表示し、ボタンも再表示
        if (this.deviceType === 'client') {
            document.getElementById('receiverCallScreen').style.display = 'none';
            document.getElementById('receiverIncomingButtons').style.display = 'flex';
        } else {
            // 操作デバイスの場合は着信画面を非表示
            const incomingCallElement = document.getElementById('incomingCall');
            incomingCallElement.style.display = 'none';
            
            // データセットをクリア
            delete incomingCallElement.dataset.realCall;
            delete incomingCallElement.dataset.pseudoCall;
        }
        
        this.consoleLog('Call declined');
    }
    
    playHorrorAudio() {
        if (!this.audioContext || !this.horrorAudio) return;
        
        // 既存の音声を停止
        this.stopAllAudio();
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.horrorAudio;
        source.connect(this.audioContext.destination);
        source.start();
        
        this.currentHorrorSource = source;
        
        setTimeout(() => {
            if (this.currentHorrorSource === source) {
                source.stop();
                this.currentHorrorSource = null;
            }
        }, 30000);
        
        this.consoleLog('Playing horror audio');
    }
    
    playPseudoCallAudio() {
        if (!this.audioContext || !this.horrorAudio) return;
        
        // 既存の音声を停止
        this.stopAllAudio();
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.horrorAudio;
        source.connect(this.audioContext.destination);
        source.start();
        
        this.currentPseudoSource = source;
        
        // 30秒間再生
        setTimeout(() => {
            if (this.currentPseudoSource === source) {
                source.stop();
                this.currentPseudoSource = null;
            }
        }, 30000);
        
        this.consoleLog('Playing pseudo call horror audio for 30 seconds');
    }
    
    showReceiverCallScreen() {
        // receiverScreen画面は削除されたため処理不要
        document.getElementById('receiverCallScreen').style.display = 'block';
        this.consoleLog('Receiver call screen shown');
    }
    
    showControllerCallScreen() {
        document.getElementById('controlScreen').style.display = 'none';
        document.getElementById('controllerCallScreen').style.display = 'block';
        this.consoleLog('Controller call screen shown');
    }
    
    handleCallAccepted(data) {
        this.showControllerCallScreen();
        this.consoleLog(`Call accepted by receiver - type: ${data.callType}`);
    }
    
    handleCallEnded() {
        // 状態をリセット
        this.updateCallStatus('待機中', '#ffff00');
        
        // 通話中画面を隠す
        document.getElementById('receiverCallScreen').style.display = 'none';
        document.getElementById('controllerCallScreen').style.display = 'none';
        
        // 元の画面に戻る
        if (this.deviceType === 'client') {
            // 受信デバイスの場合は何も表示しない（receiverScreen削除済み）
        } else if (this.deviceType === 'host' || this.deviceType === 'controller') {
            // 操作デバイス（ホスト）の場合は操作画面に戻る
            document.getElementById('controlScreen').style.display = 'block';
        }
        
        this.consoleLog(`Call ended, returned to previous screen (deviceType: ${this.deviceType})`);
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
    
    initiateDirectCall() {
        if (!this.connection) return;
        
        this.connection.send({
            type: 'direct_call',
            callerName: this.callerName
        });
        
        this.consoleLog('Direct call initiated');
    }
    
    initiatePseudoCall() {
        if (!this.connection) return;
        
        this.connection.send({
            type: 'pseudo_call',
            callerName: this.callerName
        });
        
        this.consoleLog('Pseudo call initiated');
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
        const ringtoneNames = {
            'default': 'デフォルト',
            'horror': 'ホラー',
            'classic': 'クラシック'
        };
        
        const currentIndex = ringtones.indexOf(this.ringtone);
        this.ringtone = ringtones[(currentIndex + 1) % ringtones.length];
        
        // 新しい着信音を再生成
        this.createRingtoneAudio();
        
        // 接続先に設定変更を通知
        if (this.connection && this.connection.open) {
            this.connection.send({
                type: 'ringtone_changed',
                ringtone: this.ringtone
            });
        }
        
        // 新しい着信音をテスト再生
        this.testPlayRingtone();
        
        alert(`着信音を「${ringtoneNames[this.ringtone]}」に変更しました`);
        this.consoleLog(`Ringtone changed to: ${this.ringtone}`);
    }
    
    changeVibration() {
        const patterns = [
            [200, 100, 200],
            [100, 50, 100, 50, 100],
            [500, 200, 500]
        ];
        
        const patternNames = [
            'ノーマル',
            'ショート',
            'ロング'
        ];
        
        const currentIndex = patterns.findIndex(p => 
            JSON.stringify(p) === JSON.stringify(this.vibrationPattern)
        );
        const nextIndex = (currentIndex + 1) % patterns.length;
        this.vibrationPattern = patterns[nextIndex];
        
        // 接続先に設定変更を通知
        if (this.connection && this.connection.open) {
            this.connection.send({
                type: 'vibration_changed',
                vibrationPattern: this.vibrationPattern
            });
        }
        
        // 新しいパターンをテスト実行
        if ('vibrate' in navigator) {
            navigator.vibrate(this.vibrationPattern);
        }
        
        alert(`バイブレーションパターンを「${patternNames[nextIndex]}」に変更しました`);
        this.consoleLog(`Vibration pattern changed to: ${patternNames[nextIndex]}`);
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
        // receiverScreen画面は削除されたため処理不要
        document.getElementById('titleScreen').style.display = 'block';
        
        this.consoleLog('Disconnected from peer');
    }
    
    stopAllAudio() {
        // 着信音を停止
        this.stopRingtone();
        
        // ホラー音声を停止
        if (this.currentHorrorSource) {
            try {
                this.currentHorrorSource.stop();
            } catch (error) {
                console.warn('Horror audio already stopped:', error);
            }
            this.currentHorrorSource = null;
        }
        
        // 疑似通話音声を停止
        if (this.currentPseudoSource) {
            try {
                this.currentPseudoSource.stop();
            } catch (error) {
                console.warn('Pseudo call audio already stopped:', error);
            }
            this.currentPseudoSource = null;
        }
        
        this.consoleLog('All audio stopped');
    }
    
    endCall() {
        this.stopRingtone();
        this.stopVibration();
        this.stopNameGarbling();
        this.stopPhoneNumberAnimation();
        this.stopAllAudio();
        
        // 通話終了を相手に通知
        if (this.connection) {
            this.connection.send({
                type: 'call_ended'
            });
        }
        
        // 着信画面を隠す
        document.getElementById('incomingCall').style.display = 'none';
        
        // 通話画面を処理
        this.handleCallEnded();
        
        this.consoleLog('Call ended');
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
    
    testPlayRingtone() {
        if (!this.audioContext || !this.ringtoneAudio) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.ringtoneAudio;
        source.connect(this.audioContext.destination);
        source.start();
        
        // 2秒で停止
        setTimeout(() => {
            if (source) {
                try {
                    source.stop();
                } catch (error) {
                    console.warn('Test ringtone already stopped:', error);
                }
            }
        }, 2000);
        
        this.consoleLog('Test ringtone played');
    }
    
    updateCallStatus(text, color = '#ffff00') {
        const statusElement = document.getElementById('callStatus');
        const statusTextElement = document.getElementById('callStatusText');
        
        if (statusElement && statusTextElement) {
            statusElement.style.display = 'block';
            statusTextElement.textContent = text;
            statusTextElement.style.color = color;
            this.consoleLog(`Call status updated: ${text}`);
        }
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