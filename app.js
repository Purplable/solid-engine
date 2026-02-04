/**
 * Seed Chat - メインアプリケーション
 */

const App = (function () {
    'use strict';

    // 状態管理
    let state = {
        currentSeed: null,
        roomId: null,
        encryptionKey: null,
        userId: null,
        userName: null,
        roomCreatedAt: null,
        countdownInterval: null,
        localMessages: [] // ローカルモード用
    };

    // DOM 要素
    let elements = {};

    /**
     * localStorage ヘルパー: 安全に取得
     */
    function storageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    /**
     * localStorage ヘルパー: 安全に保存
     */
    function storageSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            // storage full or unavailable
        }
    }

    /**
     * DOM 要素をキャッシュ
     */
    function cacheElements() {
        elements = {
            loadingScreen: document.getElementById('loading-screen'),
            app: document.getElementById('app'),
            homeScreen: document.getElementById('home-screen'),
            chatScreen: document.getElementById('chat-screen'),
            seedInput: document.getElementById('seed-input'),
            toggleVisibility: document.getElementById('toggle-visibility'),
            generateSeedBtn: document.getElementById('generate-seed-btn'),
            joinChatBtn: document.getElementById('join-chat-btn'),
            generatedSeedContainer: document.getElementById('generated-seed-container'),
            generatedSeed: document.getElementById('generated-seed'),
            copyGeneratedSeed: document.getElementById('copy-generated-seed'),
            leaveChatBtn: document.getElementById('leave-chat-btn'),
            copySeedBtn: document.getElementById('copy-seed-btn'),
            archiveBtn: document.getElementById('archive-btn'),
            changeNameBtn: document.getElementById('change-name-btn'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            userName: document.getElementById('user-name')
        };
    }

    /**
     * イベントリスナーを設定
     */
    function setupEventListeners() {
        // シード表示切替
        elements.toggleVisibility.addEventListener('click', toggleSeedVisibility);

        // シード生成
        elements.generateSeedBtn.addEventListener('click', generateNewSeed);

        // 生成されたシードをコピー
        elements.copyGeneratedSeed.addEventListener('click', () => {
            copyToClipboard(elements.generatedSeed.textContent);
        });

        // チャット参加
        elements.joinChatBtn.addEventListener('click', joinChat);
        elements.seedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') joinChat();
        });

        // チャット退出
        elements.leaveChatBtn.addEventListener('click', leaveChat);

        // シードをコピー
        elements.copySeedBtn.addEventListener('click', () => {
            if (state.currentSeed) {
                copyToClipboard(state.currentSeed);
            }
        });

        // アーカイブ保存
        elements.archiveBtn.addEventListener('click', saveArchive);

        // 名前変更
        elements.changeNameBtn.addEventListener('click', changeName);
        elements.userName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
                changeName();
            }
        });

        // メッセージ送信
        elements.sendBtn.addEventListener('click', sendMessage);
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    /**
     * Fix #4 JS: シードの表示/非表示を切り替え（type属性を使用）
     */
    function toggleSeedVisibility() {
        const input = elements.seedInput;
        const showIcon = elements.toggleVisibility.querySelector('.icon-show');
        const hideIcon = elements.toggleVisibility.querySelector('.icon-hide');

        if (input.type === 'text') {
            input.type = 'password';
            showIcon.classList.remove('hidden');
            hideIcon.classList.add('hidden');
        } else {
            input.type = 'text';
            showIcon.classList.add('hidden');
            hideIcon.classList.remove('hidden');
        }
    }

    /**
     * Fix #4 JS: 新しいシードを生成（type='text'で表示）
     */
    function generateNewSeed() {
        const seed = CryptoModule.generateSecureSeed();
        elements.generatedSeed.textContent = seed;
        elements.generatedSeedContainer.classList.remove('hidden');
        elements.seedInput.value = seed;
        elements.seedInput.type = 'text';

        // Update visibility toggle icons to match
        const showIcon = elements.toggleVisibility.querySelector('.icon-show');
        const hideIcon = elements.toggleVisibility.querySelector('.icon-hide');
        showIcon.classList.add('hidden');
        hideIcon.classList.remove('hidden');

        showToast(I18n.t('newSeedGenerated'), 'success');
    }

    /**
     * チャットに参加
     */
    async function joinChat() {
        const seed = elements.seedInput.value.trim();

        if (!seed) {
            showToast(I18n.t('enterSeed'), 'error');
            return;
        }

        // Fix #5: Minimum seed length raised from 4 to 12
        if (seed.length < 12) {
            showToast(I18n.t('seedMinLength'), 'error');
            return;
        }

        try {
            // ローディング表示
            elements.joinChatBtn.disabled = true;
            elements.joinChatBtn.querySelector('[data-i18n="join"]').textContent = I18n.t('connecting');

            // シードから暗号化キーとルームIDを生成
            state.currentSeed = seed;
            state.roomId = await CryptoModule.generateRoomId(seed);
            state.encryptionKey = await CryptoModule.deriveKey(seed);

            // Fix #7: Persistent userId per room
            const userIdKey = 'seedchat-userId-' + state.roomId;
            const storedUserId = storageGet(userIdKey);
            if (storedUserId) {
                state.userId = storedUserId;
            } else {
                state.userId = CryptoModule.generateUserId();
                storageSet(userIdKey, state.userId);
            }

            // Fix #16: Persistent userName per room
            const userNameKey = 'seedchat-userName-' + state.roomId;
            const storedUserName = storageGet(userNameKey);
            if (storedUserName) {
                state.userName = storedUserName;
            } else {
                state.userName = I18n.t('guestPrefix') + Math.floor(Math.random() * 1000);
                storageSet(userNameKey, state.userName);
            }

            // UI を初期化
            ChatUI.init();
            ChatUI.setUserName(state.userName);
            ChatUI.clearMessages();

            // Supabase に接続（設定されている場合）
            if (SupabaseClient.getIsConfigured()) {
                await SupabaseClient.joinRoom(state.roomId, handleIncomingMessage);
                await loadExistingMessages();
                ChatUI.setConnectionStatus(I18n.t('connected'), true);
            } else {
                ChatUI.setConnectionStatus(I18n.t('localMode'), true);
                ChatUI.addSystemMessage(I18n.t('localModeMsg'));
            }

            // Fix #6: Set roomCreatedAt AFTER loading messages (uses oldest message timestamp)
            if (!state.roomCreatedAt) {
                state.roomCreatedAt = Date.now();
            }
            ChatUI.setRoomCreatedAt(state.roomCreatedAt);

            // 画面を切り替え
            elements.homeScreen.classList.add('hidden');
            elements.chatScreen.classList.remove('hidden');

            // カウントダウン開始
            startCountdown();

            // 入力にフォーカス
            ChatUI.focusInput();

            showToast(I18n.t('joinedRoom'), 'success');

        } catch (error) {
            console.error('Chat join error:', error);
            showToast(I18n.t('connectionFailed'), 'error');
        } finally {
            elements.joinChatBtn.disabled = false;
            elements.joinChatBtn.querySelector('[data-i18n="join"]').textContent = I18n.t('join');
        }
    }

    /**
     * Fix #6: 既存のメッセージを読み込み（最古のメッセージからroomCreatedAtを設定）
     */
    async function loadExistingMessages() {
        const messages = await SupabaseClient.getMessages(state.roomId);

        // Fix #6: Use the oldest message's created_at as the room creation time
        if (messages.length > 0 && messages[0].created_at) {
            state.roomCreatedAt = new Date(messages[0].created_at).getTime();
        }

        for (const msg of messages) {
            try {
                // Fix #13: Pass roomId as AAD
                const decrypted = await CryptoModule.decrypt(
                    msg.iv,
                    msg.ciphertext,
                    state.encryptionKey,
                    state.roomId
                );

                if (decrypted) {
                    const messageData = JSON.parse(decrypted);
                    const isOwn = messageData.senderId === state.userId;
                    ChatUI.addMessage(messageData, isOwn);
                }
            } catch (error) {
                console.error('Message decryption error:', error);
            }
        }
    }

    /**
     * 受信メッセージを処理
     */
    async function handleIncomingMessage(encryptedMessage) {
        try {
            // Fix #13: Pass roomId as AAD
            const decrypted = await CryptoModule.decrypt(
                encryptedMessage.iv,
                encryptedMessage.ciphertext,
                state.encryptionKey,
                state.roomId
            );

            if (decrypted) {
                const messageData = JSON.parse(decrypted);
                const isOwn = messageData.senderId === state.userId;
                ChatUI.addMessage(messageData, isOwn);
            }
        } catch (error) {
            console.error('Incoming message error:', error);
        }
    }

    /**
     * メッセージを送信
     */
    async function sendMessage() {
        const text = ChatUI.getMessageInput();

        if (!text) return;

        // Fix #17 JS: Max message length check
        if (text.length > 5000) {
            showToast(I18n.t('msgTooLong'), 'error');
            return;
        }

        if (!state.encryptionKey) {
            showToast(I18n.t('noEncryptionKey'), 'error');
            return;
        }

        // Fix #10: Block sending after TTL expires
        if (state.roomCreatedAt && Date.now() - state.roomCreatedAt >= SupabaseClient.MESSAGE_TTL_MS) {
            showToast(I18n.t('roomExpired'), 'error');
            return;
        }

        try {
            // メッセージデータを作成
            // Fix #14: senderId is persistent (Fix #7) but without server auth, it's still forgeable client-side
            const messageData = {
                id: CryptoModule.generateUserId(),
                senderId: state.userId,
                senderName: state.userName,
                text: text,
                timestamp: Date.now()
            };

            // Fix #13: Pass roomId as AAD
            const encrypted = await CryptoModule.encrypt(
                JSON.stringify(messageData),
                state.encryptionKey,
                state.roomId
            );

            // ローカルに表示
            ChatUI.addMessage(messageData, true);
            ChatUI.clearInput();

            // Supabase に送信（設定されている場合）
            if (SupabaseClient.getIsConfigured()) {
                await SupabaseClient.sendMessage(state.roomId, encrypted);
                await SupabaseClient.saveMessage(state.roomId, encrypted);
            } else {
                // ローカルモード: メッセージをローカルに保存
                state.localMessages.push({ ...encrypted, messageData });
            }

        } catch (error) {
            console.error('Message send error:', error);
            showToast(I18n.t('sendFailed'), 'error');
        }
    }

    /**
     * Fix #16: 名前を変更（localStorageに永続化）
     */
    function changeName() {
        const newName = ChatUI.getUserName();

        if (!newName) {
            showToast(I18n.t('enterName'), 'error');
            return;
        }

        if (newName.length > 20) {
            showToast(I18n.t('nameTooLong'), 'error');
            return;
        }

        state.userName = newName;

        if (state.roomId) {
            storageSet('seedchat-userName-' + state.roomId, newName);
        }

        showToast(I18n.t('nameChanged'), 'success');
    }

    /**
     * チャットから退出
     */
    async function leaveChat() {
        // カウントダウン停止
        if (state.countdownInterval) {
            clearInterval(state.countdownInterval);
            state.countdownInterval = null;
        }

        // Supabase から退出
        await SupabaseClient.leaveRoom();

        // 状態をリセット
        state.currentSeed = null;
        state.roomId = null;
        state.encryptionKey = null;
        state.roomCreatedAt = null;
        state.localMessages = [];

        // UI をリセット
        ChatUI.clearMessages();
        elements.seedInput.value = '';
        elements.seedInput.type = 'password';
        elements.generatedSeedContainer.classList.add('hidden');

        // Reset visibility toggle icons
        const showIcon = elements.toggleVisibility.querySelector('.icon-show');
        const hideIcon = elements.toggleVisibility.querySelector('.icon-hide');
        showIcon.classList.remove('hidden');
        hideIcon.classList.add('hidden');

        // 画面を切り替え
        elements.chatScreen.classList.add('hidden');
        elements.homeScreen.classList.remove('hidden');

        showToast(I18n.t('leftChat'), 'info');
    }

    /**
     * アーカイブを保存
     */
    function saveArchive() {
        const text = ChatUI.exportToText();
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `seed-chat-archive-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(I18n.t('archiveSaved'), 'success');
    }

    /**
     * カウントダウンを開始
     */
    function startCountdown() {
        if (state.countdownInterval) {
            clearInterval(state.countdownInterval);
        }

        const update = () => {
            const elapsed = Date.now() - state.roomCreatedAt;
            const remaining = SupabaseClient.MESSAGE_TTL_MS - elapsed;
            ChatUI.updateCountdown(remaining);

            if (remaining <= 0) {
                clearInterval(state.countdownInterval);
                ChatUI.addSystemMessage(I18n.t('ttlExpiredMsg'));
            }
        };

        update();
        state.countdownInterval = setInterval(update, 1000);
    }

    /**
     * Fix #18: クリップボードにコピー（execCommand フォールバック改善）
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast(I18n.t('copied'), 'success');
        } catch (error) {
            // Fix #18: Improved fallback with proper hiding and error handling
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                const success = document.execCommand('copy');
                if (success) {
                    showToast(I18n.t('copied'), 'success');
                } else {
                    showToast(I18n.t('copyFailed'), 'error');
                }
            } catch (e) {
                showToast(I18n.t('copyFailed'), 'error');
            }
            document.body.removeChild(textarea);
        }
    }

    /**
     * Fix #8 + #19: トースト通知を表示（XSS対策 + スタッキング制限）
     */
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');

        // Fix #19: Remove oldest toasts if 3+ are visible
        while (container.children.length >= 3) {
            container.removeChild(container.firstChild);
        }

        const toast = document.createElement('div');
        toast.className = 'toast ' + type;

        // Fix #8: Use createElement/textContent instead of innerHTML to prevent XSS
        const iconSpan = document.createElement('span');
        iconSpan.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

        const msgSpan = document.createElement('span');
        msgSpan.textContent = message;

        toast.appendChild(iconSpan);
        toast.appendChild(msgSpan);
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }

    /**
     * アプリを初期化
     */
    async function init() {
        // Web Crypto API の確認
        if (!CryptoModule.isAvailable()) {
            alert(I18n.t('cryptoNotAvailable'));
            return;
        }

        // i18n を初期化
        I18n.init();

        // DOM 要素をキャッシュ
        cacheElements();

        // Supabase を初期化
        SupabaseClient.init();

        // イベントリスナーを設定
        setupEventListeners();

        // ローディング画面を非表示
        elements.loadingScreen.classList.add('hidden');
        elements.app.classList.remove('hidden');

        console.log('Seed Chat initialized');
    }

    // 公開 API
    return {
        init
    };
})();

// DOM 読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
