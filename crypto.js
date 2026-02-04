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

    // Fix #3: Fixed application salt (32 cryptographically random bytes, generated once)
    const APP_SALT = new Uint8Array([
        0x3a, 0x1f, 0x8b, 0x4c, 0xe7, 0x52, 0xd9, 0x06,
        0xa4, 0x71, 0xbe, 0x33, 0xf0, 0x85, 0x6d, 0xc2,
        0x19, 0xe8, 0x7a, 0x4f, 0xdb, 0x63, 0x0e, 0x95,
        0xb7, 0x28, 0xac, 0x5d, 0xf1, 0x46, 0x83, 0x70
    ]);

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
     * SHA-256 ハッシュを計算
     */
    async function sha256(message) {
        const msgBuffer = stringToBytes(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * HMAC-SHA256 を計算
     */
    async function hmacSha256(key, message) {
        const keyBytes = stringToBytes(key);
        const msgBytes = stringToBytes(message);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
        const hashArray = Array.from(new Uint8Array(signature));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Fix #1: シードからルームIDを生成（HMAC-SHA256ベース）
     * SHA-256(seed) ではシードが逆算可能だったため、HMACに変更
     */
    async function generateRoomId(seed) {
        const hmac = await hmacSha256(seed, 'seedchat-room-id');
        return hmac.slice(0, 32);
    }

    /**
     * Fix #3: シードから暗号化キーを導出（PBKDF2）
     * 固定 APP_SALT を使用（以前はシードから派生したソルトを使用していた）
     */
    async function deriveKey(seed) {
        const seedBytes = stringToBytes(seed);

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            seedBytes,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: APP_SALT,
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
     * Fix #13: メッセージを暗号化（roomId を AAD として使用）
     * @param {string} plaintext
     * @param {CryptoKey} key
     * @param {string} roomId - Additional Authenticated Data
     * @returns {Object} { iv: string, ciphertext: string }
     */
    async function encrypt(plaintext, key, roomId) {
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const plaintextBytes = stringToBytes(plaintext);

        const params = { name: 'AES-GCM', iv: iv };
        if (roomId) {
            params.additionalData = stringToBytes(roomId);
        }

        const ciphertextBuffer = await crypto.subtle.encrypt(
            params,
            key,
            plaintextBytes
        );

        return {
            iv: bytesToBase64(iv),
            ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer))
        };
    }

    /**
     * Fix #13: メッセージを復号（roomId を AAD として使用）
     * @param {string} iv
     * @param {string} ciphertext
     * @param {CryptoKey} key
     * @param {string} roomId - Additional Authenticated Data
     */
    async function decrypt(iv, ciphertext, key, roomId) {
        const ivBytes = base64ToBytes(iv);
        const ciphertextBytes = base64ToBytes(ciphertext);

        const params = { name: 'AES-GCM', iv: ivBytes };
        if (roomId) {
            params.additionalData = stringToBytes(roomId);
        }

        try {
            const plaintextBuffer = await crypto.subtle.decrypt(
                params,
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
