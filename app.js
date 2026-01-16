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
        userName: 'ゲスト',
        roomCreatedAt: null,
        countdownInterval: null,
        localMessages: [] // ローカルモード用
    };

    // DOM 要素
    let elements = {};

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
     * シードの表示/非表示を切り替え
     */
    function toggleSeedVisibility() {
        const input = elements.seedInput;
        const showIcon = elements.toggleVisibility.querySelector('.icon-show');
        const hideIcon = elements.toggleVisibility.querySelector('.icon-hide');

        if (input.classList.contains('visible')) {
            input.classList.remove('visible');
            showIcon.classList.remove('hidden');
            hideIcon.classList.add('hidden');
        } else {
            input.classList.add('visible');
            showIcon.classList.add('hidden');
            hideIcon.classList.remove('hidden');
        }
    }

    /**
     * 新しいシードを生成
     */
    function generateNewSeed() {
        const seed = CryptoModule.generateSecureSeed();
        elements.generatedSeed.textContent = seed;
        elements.generatedSeedContainer.classList.remove('hidden');
        elements.seedInput.value = seed;
        elements.seedInput.classList.add('visible');
        showToast('新しいシードが生成されました', 'success');
    }

    /**
     * チャットに参加
     */
    async function joinChat() {
        const seed = elements.seedInput.value.trim();

        if (!seed) {
            showToast('シードを入力してください', 'error');
            return;
        }

        if (seed.length < 4) {
            showToast('シードは4文字以上で入力してください', 'error');
            return;
        }

        try {
            // ローディング表示
            elements.joinChatBtn.disabled = true;
            elements.joinChatBtn.innerHTML = '<span>⏳</span> 接続中...';

            // シードから暗号化キーとルームIDを生成
            state.currentSeed = seed;
            state.roomId = await CryptoModule.generateRoomId(seed);
            state.encryptionKey = await CryptoModule.deriveKey(seed);
            state.userId = CryptoModule.generateUserId();
            state.roomCreatedAt = Date.now();

            // ユーザー名を生成
            state.userName = 'ゲスト' + Math.floor(Math.random() * 1000);

            // UI を初期化
            ChatUI.init();
            ChatUI.setUserName(state.userName);
            ChatUI.clearMessages();
            ChatUI.setRoomCreatedAt(state.roomCreatedAt);

            // Supabase に接続（設定されている場合）
            if (SupabaseClient.getIsConfigured()) {
                await SupabaseClient.joinRoom(state.roomId, handleIncomingMessage);
                await loadExistingMessages();
                ChatUI.setConnectionStatus('接続済み', true);
            } else {
                ChatUI.setConnectionStatus('ローカルモード', true);
                ChatUI.addSystemMessage('ローカルモードで動作中です。Supabaseを設定するとリアルタイム通信が可能になります。');
            }

            // 画面を切り替え
            elements.homeScreen.classList.add('hidden');
            elements.chatScreen.classList.remove('hidden');

            // カウントダウン開始
            startCountdown();

            // 入力にフォーカス
            ChatUI.focusInput();

            showToast('チャットルームに参加しました', 'success');

        } catch (error) {
            console.error('チャット参加エラー:', error);
            showToast('接続に失敗しました', 'error');
        } finally {
            elements.joinChatBtn.disabled = false;
            elements.joinChatBtn.innerHTML = '<span>🚀</span> 参加';
        }
    }

    /**
     * 既存のメッセージを読み込み
     */
    async function loadExistingMessages() {
        const messages = await SupabaseClient.getMessages(state.roomId);

        for (const msg of messages) {
            try {
                const decrypted = await CryptoModule.decrypt(
                    msg.iv,
                    msg.ciphertext,
                    state.encryptionKey
                );

                if (decrypted) {
                    const messageData = JSON.parse(decrypted);
                    const isOwn = messageData.senderId === state.userId;
                    ChatUI.addMessage(messageData, isOwn);
                }
            } catch (error) {
                console.error('メッセージ復号エラー:', error);
            }
        }
    }

    /**
     * 受信メッセージを処理
     */
    async function handleIncomingMessage(encryptedMessage) {
        try {
            const decrypted = await CryptoModule.decrypt(
                encryptedMessage.iv,
                encryptedMessage.ciphertext,
                state.encryptionKey
            );

            if (decrypted) {
                const messageData = JSON.parse(decrypted);
                const isOwn = messageData.senderId === state.userId;
                ChatUI.addMessage(messageData, isOwn);
            }
        } catch (error) {
            console.error('受信メッセージ処理エラー:', error);
        }
    }

    /**
     * メッセージを送信
     */
    async function sendMessage() {
        const text = ChatUI.getMessageInput();

        if (!text) return;

        if (!state.encryptionKey) {
            showToast('暗号化キーがありません', 'error');
            return;
        }

        try {
            // メッセージデータを作成
            const messageData = {
                id: CryptoModule.generateUserId(),
                senderId: state.userId,
                senderName: state.userName,
                text: text,
                timestamp: Date.now()
            };

            // 暗号化
            const encrypted = await CryptoModule.encrypt(
                JSON.stringify(messageData),
                state.encryptionKey
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
            console.error('メッセージ送信エラー:', error);
            showToast('メッセージの送信に失敗しました', 'error');
        }
    }

    /**
     * 名前を変更
     */
    function changeName() {
        const newName = ChatUI.getUserName();

        if (!newName) {
            showToast('名前を入力してください', 'error');
            return;
        }

        if (newName.length > 20) {
            showToast('名前は20文字以内で入力してください', 'error');
            return;
        }

        state.userName = newName;
        showToast('名前を変更しました', 'success');
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
        elements.generatedSeedContainer.classList.add('hidden');

        // 画面を切り替え
        elements.chatScreen.classList.add('hidden');
        elements.homeScreen.classList.remove('hidden');

        showToast('チャットから退出しました', 'info');
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

        showToast('アーカイブを保存しました', 'success');
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
            const remaining = 12 * 60 * 60 * 1000 - elapsed; // 12時間
            ChatUI.updateCountdown(remaining);

            if (remaining <= 0) {
                clearInterval(state.countdownInterval);
                ChatUI.addSystemMessage('このチャットルームは12時間が経過したため、新しいメッセージは保存されません。');
            }
        };

        update();
        state.countdownInterval = setInterval(update, 1000);
    }

    /**
     * クリップボードにコピー
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast('コピーしました', 'success');
        } catch (error) {
            // フォールバック
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('コピーしました', 'success');
        }
    }

    /**
     * トースト通知を表示
     */
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * アプリを初期化
     */
    async function init() {
        // Web Crypto API の確認
        if (!CryptoModule.isAvailable()) {
            alert('このブラウザは Web Crypto API に対応していません。最新のブラウザをお使いください。');
            return;
        }

        // DOM 要素をキャッシュ
        cacheElements();

        // Supabase を初期化
        SupabaseClient.init();

        // イベントリスナーを設定
        setupEventListeners();

        // ローディング画面を非表示
        elements.loadingScreen.classList.add('hidden');
        elements.app.classList.remove('hidden');

        console.log('Seed Chat 初期化完了');
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
