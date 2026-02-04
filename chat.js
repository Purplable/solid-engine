/**
 * Seed Chat - チャット UI モジュール
 * メッセージの表示と管理
 */

const ChatUI = (function () {
    'use strict';

    // DOM 要素
    let elements = {};

    // 状態
    let messages = [];
    let roomCreatedAt = null;

    // Fix #20: Unbounded messages array limit
    const MAX_MESSAGES = 500;

    /**
     * DOM 要素を取得
     */
    function cacheElements() {
        elements = {
            messagesContainer: document.getElementById('messages-container'),
            messagesList: document.getElementById('messages-list'),
            messagesEmpty: document.getElementById('messages-empty'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            userName: document.getElementById('user-name'),
            countdownTime: document.getElementById('countdown-time'),
            roomStatus: document.getElementById('room-status')
        };
    }

    /**
     * 初期化
     */
    function init() {
        cacheElements();
        setupTextareaAutoResize();
    }

    /**
     * テキストエリアの自動リサイズ
     */
    function setupTextareaAutoResize() {
        if (elements.messageInput) {
            elements.messageInput.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
        }
    }

    /**
     * メッセージを追加
     */
    function addMessage(messageData, isOwn = false) {
        const { id, senderName, text, timestamp, senderId } = messageData;

        // 重複チェック
        if (messages.some(m => m.id === id)) {
            return;
        }

        messages.push(messageData);

        // Fix #20: Trim oldest messages if over limit
        while (messages.length > MAX_MESSAGES) {
            messages.shift();
            if (elements.messagesList && elements.messagesList.firstChild) {
                elements.messagesList.removeChild(elements.messagesList.firstChild);
            }
        }

        // 空メッセージ表示を隠す
        if (elements.messagesEmpty) {
            elements.messagesEmpty.classList.add('hidden');
        }

        // メッセージ要素を作成
        const messageEl = document.createElement('div');
        messageEl.className = `message ${isOwn ? 'own' : 'other'}`;
        messageEl.dataset.id = id;

        const locale = I18n.getLang() === 'ja' ? 'ja-JP' : 'en-US';
        const time = new Date(timestamp).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageEl.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${escapeHtml(senderName)}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${escapeHtml(text)}</div>
        `;

        elements.messagesList.appendChild(messageEl);
        scrollToBottom();
    }

    /**
     * システムメッセージを追加
     */
    function addSystemMessage(text) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message system';
        messageEl.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
        elements.messagesList.appendChild(messageEl);
        scrollToBottom();
    }

    /**
     * メッセージリストをクリア
     */
    function clearMessages() {
        messages = [];
        if (elements.messagesList) {
            elements.messagesList.innerHTML = '';
        }
        if (elements.messagesEmpty) {
            elements.messagesEmpty.classList.remove('hidden');
        }
    }

    /**
     * 最下部にスクロール
     */
    function scrollToBottom() {
        if (elements.messagesContainer) {
            elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
        }
    }

    /**
     * 入力欄をクリア
     */
    function clearInput() {
        if (elements.messageInput) {
            elements.messageInput.value = '';
            elements.messageInput.style.height = 'auto';
        }
    }

    /**
     * 入力欄にフォーカス
     */
    function focusInput() {
        if (elements.messageInput) {
            elements.messageInput.focus();
        }
    }

    /**
     * メッセージ入力を取得
     */
    function getMessageInput() {
        return elements.messageInput ? elements.messageInput.value.trim() : '';
    }

    /**
     * ユーザー名を取得
     */
    function getUserName() {
        return elements.userName ? elements.userName.value.trim() : '';
    }

    /**
     * ユーザー名を設定
     */
    function setUserName(name) {
        if (elements.userName) {
            elements.userName.value = name;
        }
    }

    /**
     * 接続状態を更新
     */
    function setConnectionStatus(status, isConnected = false) {
        if (elements.roomStatus) {
            elements.roomStatus.textContent = status;
            elements.roomStatus.className = 'room-status' + (isConnected ? ' connected' : '');
        }
    }

    /**
     * カウントダウンを更新
     */
    function updateCountdown(remainingMs) {
        if (!elements.countdownTime) return;

        if (remainingMs <= 0) {
            elements.countdownTime.textContent = I18n.t('expired');
            return;
        }

        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

        elements.countdownTime.textContent =
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * ルーム作成時刻を設定
     */
    function setRoomCreatedAt(timestamp) {
        roomCreatedAt = timestamp;
    }

    /**
     * HTML エスケープ
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * メッセージをアーカイブ形式でエクスポート
     */
    function exportToText() {
        const lines = [];
        const locale = I18n.getLang() === 'ja' ? 'ja-JP' : 'en-US';
        const now = new Date().toLocaleString(locale);

        lines.push('='.repeat(50));
        lines.push(I18n.t('archiveHeader'));
        lines.push(`${I18n.t('exportDate')}: ${now}`);
        lines.push('='.repeat(50));
        lines.push('');

        messages.forEach(msg => {
            const time = new Date(msg.timestamp).toLocaleString(locale);
            lines.push(`[${time}] ${msg.senderName}:`);
            lines.push(msg.text);
            lines.push('');
        });

        lines.push('='.repeat(50));
        lines.push(I18n.t('archiveFooter'));
        lines.push('='.repeat(50));

        return lines.join('\n');
    }

    /**
     * すべてのメッセージを取得
     */
    function getAllMessages() {
        return [...messages];
    }

    // 公開 API
    return {
        init,
        addMessage,
        addSystemMessage,
        clearMessages,
        clearInput,
        focusInput,
        getMessageInput,
        getUserName,
        setUserName,
        setConnectionStatus,
        updateCountdown,
        setRoomCreatedAt,
        exportToText,
        getAllMessages,
        scrollToBottom
    };
})();

// グローバルに公開
window.ChatUI = ChatUI;
