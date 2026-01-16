/**
 * Seed Chat - Supabase クライアント
 * リアルタイムメッセージング機能
 */

const SupabaseClient = (function () {
    'use strict';

    // Supabase 設定
    // 注意: 本番環境ではこれらを環境変数から取得してください
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

    let supabase = null;
    let currentChannel = null;
    let isConfigured = false;

    /**
     * Supabase が設定されているかチェック
     */
    function checkConfiguration() {
        return SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
            SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
    }

    /**
     * Supabase クライアントを初期化
     */
    function init() {
        isConfigured = checkConfiguration();

        if (isConfigured && typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase クライアント初期化完了');
            return true;
        }

        console.log('Supabase 未設定 - ローカルモードで動作します');
        return false;
    }

    /**
     * チャットルームに参加
     */
    async function joinRoom(roomId, onMessage) {
        if (!isConfigured || !supabase) {
            console.log('ローカルモード: ルーム参加をスキップ');
            return null;
        }

        // 既存のチャンネルがあれば退出
        if (currentChannel) {
            await leaveRoom();
        }

        // Realtime チャンネルに参加
        currentChannel = supabase.channel(`room:${roomId}`)
            .on('broadcast', { event: 'message' }, (payload) => {
                if (onMessage) {
                    onMessage(payload.payload);
                }
            })
            .subscribe((status) => {
                console.log('チャンネル状態:', status);
            });

        return currentChannel;
    }

    /**
     * メッセージを送信
     */
    async function sendMessage(roomId, encryptedMessage) {
        if (!isConfigured || !supabase || !currentChannel) {
            console.log('ローカルモード: メッセージ送信をスキップ');
            return false;
        }

        try {
            await currentChannel.send({
                type: 'broadcast',
                event: 'message',
                payload: encryptedMessage
            });
            return true;
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
            return false;
        }
    }

    /**
     * メッセージをデータベースに保存
     */
    async function saveMessage(roomId, encryptedData) {
        if (!isConfigured || !supabase) {
            return null;
        }

        try {
            const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12時間後

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    room_id: roomId,
                    iv: encryptedData.iv,
                    ciphertext: encryptedData.ciphertext,
                    expires_at: expiresAt.toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('メッセージ保存エラー:', error);
            return null;
        }
    }

    /**
     * 過去のメッセージを取得
     */
    async function getMessages(roomId) {
        if (!isConfigured || !supabase) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', roomId)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('メッセージ取得エラー:', error);
            return [];
        }
    }

    /**
     * ルームから退出
     */
    async function leaveRoom() {
        if (currentChannel) {
            await supabase.removeChannel(currentChannel);
            currentChannel = null;
        }
    }

    /**
     * 設定状態を取得
     */
    function getIsConfigured() {
        return isConfigured;
    }

    // 公開 API
    return {
        init,
        joinRoom,
        sendMessage,
        saveMessage,
        getMessages,
        leaveRoom,
        getIsConfigured
    };
})();

// グローバルに公開
window.SupabaseClient = SupabaseClient;
