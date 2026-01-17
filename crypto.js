/**
 * Seed Chat - 暗号化モジュール
 * Web Crypto API を使用した AES-256-GCM 暗号化
 */

const CryptoModule = (function () {
    'use strict';

    // PBKDF2 のイテレーション回数（セキュリティとパフォーマンスのバランス）
    const PBKDF2_ITERATIONS = 100000;
    const KEY_LENGTH = 256;
    const IV_LENGTH = 12; // AES-GCM 推奨の IV 長

    /**
     * 文字列を Uint8Array に変換
     */
    function stringToBytes(str) {
        return new TextEncoder().encode(str);
    }

    /**
     * Uint8Array を Base64 文字列に変換
     */
    function bytesToBase64(bytes) {
        const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
        return btoa(binary);
    }

    /**
     * Base64 文字列を Uint8Array に変換
     */
    function base64ToBytes(base64) {
        const binary = atob(base64);
        return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)));
    }

    /**
     * SHA-256 ハッシュを計算（ルームID生成用）
     */
    async function sha256(message) {
        const msgBuffer = stringToBytes(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * シードからルームIDを生成
     */
    async function generateRoomId(seed) {
        const hash = await sha256(seed);
        return hash.slice(0, 32); // 32文字に短縮
    }

    /**
     * シードから暗号化キーを導出（PBKDF2）
     */
    async function deriveKey(seed) {
        const seedBytes = stringToBytes(seed);

        // シードをインポートしてキーマテリアルを作成
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            seedBytes,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        // ソルトとしてシードのハッシュを使用（固定ソルト）
        const salt = stringToBytes(await sha256(seed + '_salt'));

        // AES-GCM キーを導出
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: KEY_LENGTH },
            false,
            ['encrypt', 'decrypt']
        );

        return key;
    }

    /**
     * メッセージを暗号化
     * @returns {Object} { iv: string, ciphertext: string }
     */
    async function encrypt(plaintext, key) {
        // ランダムな IV を生成
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

        const plaintextBytes = stringToBytes(plaintext);

        const ciphertextBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            plaintextBytes
        );

        return {
            iv: bytesToBase64(iv),
            ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer))
        };
    }

    /**
     * メッセージを復号
     */
    async function decrypt(iv, ciphertext, key) {
        const ivBytes = base64ToBytes(iv);
        const ciphertextBytes = base64ToBytes(ciphertext);

        try {
            const plaintextBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivBytes },
                key,
                ciphertextBytes
            );

            return new TextDecoder().decode(plaintextBuffer);
        } catch (error) {
            console.error('復号エラー:', error);
            return null;
        }
    }

    /**
     * 安全なランダムシードを生成
     */
    function generateSecureSeed() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * ランダムなユーザーIDを生成
     */
    function generateUserId() {
        const array = new Uint8Array(8);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Web Crypto API が利用可能かチェック
     */
    function isAvailable() {
        return !!(crypto && crypto.subtle);
    }

    // 公開 API
    return {
        isAvailable,
        generateSecureSeed,
        generateUserId,
        generateRoomId,
        deriveKey,
        encrypt,
        decrypt,
        sha256
    };
})();

// グローバルに公開
window.CryptoModule = CryptoModule;
