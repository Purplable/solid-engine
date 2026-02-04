/**
 * Seed Chat - Internationalization Module
 * Supports Japanese (ja) and English (en)
 */

const I18n = (function () {
    'use strict';

    let currentLang = 'ja';

    const translations = {
        ja: {
            // Page
            pageTitle: 'Seed Chat - 暗号化プライベートチャット',

            // Loading
            loadingText: '暗号化を初期化中...',

            // Home screen
            tagline: 'シードを共有した人だけの、秘密のチャット',
            seedPlaceholder: 'シードを入力...',
            toggleVisibility: '表示切替',
            generateSeed: '新規シード生成',
            join: '参加',
            generatedSeedLabel: '生成されたシード:',
            copyTitle: 'コピー',
            seedHint: 'このシードを安全に保存してください。共有した人のみがチャットに参加できます。',
            featureEncrypted: '完全暗号化',
            featureNoReg: '登録不要',
            featureAutoDelete: '12時間で削除',
            footerPrivacy: 'サーバーはメッセージを読めません。あなたのプライバシーは完全に保護されています。',

            // Chat screen
            leaveTitle: '退出',
            chatTitle: '暗号化チャット',
            copySeedBtn: 'シードをコピー',
            archiveBtn: 'アーカイブ',
            welcomeMsg1: '暗号化チャットルームへようこそ！',
            welcomeMsg2: '同じシードを持つ人がここでチャットできます。',
            nameLabel: '名前:',
            namePlaceholder: 'あなたの名前',
            changeNameTitle: '名前を変更',
            messagePlaceholder: 'メッセージを入力... (Enter で送信, Shift+Enter で改行)',

            // Dynamic strings (app.js)
            newSeedGenerated: '新しいシードが生成されました',
            enterSeed: 'シードを入力してください',
            seedMinLength: 'シードは12文字以上で入力してください',
            connecting: '接続中...',
            connected: '接続済み',
            localMode: 'ローカルモード',
            localModeMsg: 'ローカルモードで動作中です。Supabaseを設定するとリアルタイム通信が可能になります。',
            joinedRoom: 'チャットルームに参加しました',
            connectionFailed: '接続に失敗しました',
            msgTooLong: 'メッセージは5000文字以内で入力してください',
            noEncryptionKey: '暗号化キーがありません',
            roomExpired: 'このチャットルームは期限切れです。新しいメッセージは送信できません。',
            sendFailed: 'メッセージの送信に失敗しました',
            enterName: '名前を入力してください',
            nameTooLong: '名前は20文字以内で入力してください',
            nameChanged: '名前を変更しました',
            leftChat: 'チャットから退出しました',
            archiveSaved: 'アーカイブを保存しました',
            ttlExpiredMsg: 'このチャットルームは12時間が経過したため、新しいメッセージは保存されません。',
            copied: 'コピーしました',
            copyFailed: 'コピーに失敗しました',
            cryptoNotAvailable: 'このブラウザは Web Crypto API に対応していません。最新のブラウザをお使いください。',
            guestPrefix: 'ゲスト',
            roomStatus: '接続中...',

            // chat.js
            expired: '期限切れ',
            archiveHeader: 'Seed Chat アーカイブ',
            exportDate: 'エクスポート日時',
            archiveFooter: 'このチャットはエンドツーエンド暗号化されていました。'
        },

        en: {
            // Page
            pageTitle: 'Seed Chat - Encrypted Private Chat',

            // Loading
            loadingText: 'Initializing encryption...',

            // Home screen
            tagline: 'A secret chat only for those who share the seed',
            seedPlaceholder: 'Enter seed...',
            toggleVisibility: 'Toggle visibility',
            generateSeed: 'Generate Seed',
            join: 'Join',
            generatedSeedLabel: 'Generated seed:',
            copyTitle: 'Copy',
            seedHint: 'Save this seed securely. Only those who share it can join the chat.',
            featureEncrypted: 'Fully Encrypted',
            featureNoReg: 'No Registration',
            featureAutoDelete: 'Auto-delete in 12h',
            footerPrivacy: 'The server cannot read your messages. Your privacy is fully protected.',

            // Chat screen
            leaveTitle: 'Leave',
            chatTitle: 'Encrypted Chat',
            copySeedBtn: 'Copy Seed',
            archiveBtn: 'Archive',
            welcomeMsg1: 'Welcome to the encrypted chat room!',
            welcomeMsg2: 'People with the same seed can chat here.',
            nameLabel: 'Name:',
            namePlaceholder: 'Your name',
            changeNameTitle: 'Change name',
            messagePlaceholder: 'Type a message... (Enter to send, Shift+Enter for newline)',

            // Dynamic strings (app.js)
            newSeedGenerated: 'New seed generated',
            enterSeed: 'Please enter a seed',
            seedMinLength: 'Seed must be at least 12 characters',
            connecting: 'Connecting...',
            connected: 'Connected',
            localMode: 'Local Mode',
            localModeMsg: 'Running in local mode. Set up Supabase for real-time messaging.',
            joinedRoom: 'Joined the chat room',
            connectionFailed: 'Connection failed',
            msgTooLong: 'Message must be 5000 characters or less',
            noEncryptionKey: 'No encryption key available',
            roomExpired: 'This chat room has expired. Cannot send new messages.',
            sendFailed: 'Failed to send message',
            enterName: 'Please enter a name',
            nameTooLong: 'Name must be 20 characters or less',
            nameChanged: 'Name changed',
            leftChat: 'Left the chat room',
            archiveSaved: 'Archive saved',
            ttlExpiredMsg: 'This chat room has passed 12 hours. New messages will not be saved.',
            copied: 'Copied',
            copyFailed: 'Copy failed',
            cryptoNotAvailable: 'This browser does not support Web Crypto API. Please use a modern browser.',
            guestPrefix: 'Guest',
            roomStatus: 'Connecting...',

            // chat.js
            expired: 'Expired',
            archiveHeader: 'Seed Chat Archive',
            exportDate: 'Export date',
            archiveFooter: 'This chat was end-to-end encrypted.'
        }
    };

    /**
     * Get translation for a key
     */
    function t(key) {
        const lang = translations[currentLang];
        return (lang && lang[key]) || key;
    }

    /**
     * Get current language
     */
    function getLang() {
        return currentLang;
    }

    /**
     * Set language and update all data-i18n elements
     */
    function setLang(lang) {
        if (!translations[lang]) return;
        currentLang = lang;

        try {
            localStorage.setItem('seedchat-lang', lang);
        } catch (e) { /* ignore */ }

        document.documentElement.lang = lang;
        applyTranslations();
    }

    /**
     * Apply translations to all elements with data-i18n attributes
     */
    function applyTranslations() {
        // data-i18n -> textContent
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });

        // data-i18n-placeholder -> placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
        });

        // data-i18n-title -> title
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.title = t(el.getAttribute('data-i18n-title'));
        });

        // Update page title
        document.title = t('pageTitle');

        // Update toggle button label
        const toggleBtn = document.getElementById('lang-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = currentLang === 'ja' ? 'EN' : 'JA';
        }
    }

    /**
     * Initialize: load saved language preference
     */
    function init() {
        try {
            const saved = localStorage.getItem('seedchat-lang');
            if (saved && translations[saved]) {
                currentLang = saved;
            }
        } catch (e) { /* ignore */ }

        document.documentElement.lang = currentLang;
        applyTranslations();
    }

    /**
     * Toggle between ja and en
     */
    function toggle() {
        setLang(currentLang === 'ja' ? 'en' : 'ja');
    }

    return {
        t,
        getLang,
        setLang,
        init,
        toggle,
        applyTranslations
    };
})();

window.I18n = I18n;
