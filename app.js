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
                const registration = await navigator.serviceWorker.register('/sw.js');
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
        this.peer = new Peer({
            host: 'peerjs-server.herokuapp.com',
            port: 443,
            secure: true,
            debug: 2
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
        
        if (this.titleClickCount === 1) {
            setTimeout(() => {
                if (this.titleClickCount < 5) {
                    this.showSetupScreen();
                }
            }, 500);
        }
    }
    
    showSetupScreen() {
        document.getElementById('titleScreen').style.display = 'none';
        document.getElementById('setupScreen').style.display = 'block';
    }
    
    backToTitle() {
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('titleScreen').style.display = 'block';
        this.deviceType = null;
        document.querySelectorAll('.device-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('remotePeerIdInput').value = '';
        this.consoleLog('Returned to title screen');
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
        const console = document.getElementById('console');
        if (this.isConsoleVisible) {
            console.style.display = 'none';
            this.isConsoleVisible = false;
        } else {
            console.style.display = 'flex';
            this.isConsoleVisible = true;
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
    new HearApp();
});

function toggleConsole() {
    if (window.hearApp) {
        window.hearApp.toggleConsole();
    }
}

window.addEventListener('load', () => {
    if (window.hearApp) {
        window.hearApp = hearApp;
    }
});