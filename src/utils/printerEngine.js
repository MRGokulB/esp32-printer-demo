const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const COLS_58MM = 32;

const KNOWN_PRINTER_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000ae30-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '0000abf0-0000-1000-8000-00805f9b34fb',
];

const KNOWN_WRITE_CHARACTERISTICS = [
    '00002af1-0000-1000-8000-00805f9b34fb',
    '0000ae01-0000-1000-8000-00805f9b34fb',
    '49535343-8841-43f4-a8d4-ecbe34729bb3',
    'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
    '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    '0000ffe1-0000-1000-8000-00805f9b34fb',
    '0000fff1-0000-1000-8000-00805f9b34fb',
    '0000abf1-0000-1000-8000-00805f9b34fb',
];

class PrinterEngine {
    constructor() {
        this.device = null;
        this.server = null;
        this.characteristic = null;
        this.connected = false;
        this._statusListeners = new Set();
        this._encoder = new TextEncoder();
        this._queue = [];
        this._printing = false;
        this._pendingTokens = [];
        this._reconnectAttempts = 0;
        this._maxReconnectAttempts = 3;
        this._userDisconnected = false;
    }

    onStatusChange(callback) {
        this._statusListeners.add(callback);
        return () => this._statusListeners.delete(callback);
    }

    _emitStatus(status, deviceName) {
        const payload = { connected: this.connected, status, deviceName: deviceName || this.device?.name };
        this._statusListeners.forEach(cb => cb(payload));
    }

    isSupported() {
        return !!navigator.bluetooth;
    }

    async connect() {
        if (!this.isSupported()) {
            throw new Error('Web Bluetooth is not supported in this browser. Use Chrome, Edge, or Opera over HTTPS.');
        }

        try {
            this._emitStatus('scanning');
            this._userDisconnected = false;

            let device;
            try {
                device = await navigator.bluetooth.requestDevice({
                    filters: [
                        ...KNOWN_PRINTER_SERVICES.map(s => ({ services: [s] })),
                        { namePrefix: 'Printer' },
                    ],
                    optionalServices: KNOWN_PRINTER_SERVICES,
                });
            } catch (filterErr) {
                if (filterErr.name === 'NotFoundError') throw filterErr;
                device = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: KNOWN_PRINTER_SERVICES,
                });
            }
            this.device = device;

            if (this._onDisconnect) {
                this.device.removeEventListener('gattserverdisconnected', this._onDisconnect);
            }
            this._onDisconnect = () => {
                this.connected = false;
                this.characteristic = null;
                this.server = null;

                if (this._userDisconnected) {
                    this._emitStatus('disconnected');
                    return;
                }

                if (this._reconnectAttempts < this._maxReconnectAttempts) {
                    this._reconnectAttempts++;
                    const delay = 1000 * Math.pow(2, this._reconnectAttempts - 1);
                    this._emitStatus('connecting', this.device?.name);
                    this._reconnectGatt(delay).catch(() => {
                        this._reconnectAttempts = 0;
                        this._emitStatus('disconnected');
                    });
                    return;
                }

                this._reconnectAttempts = 0;
                this._emitStatus('disconnected');
            };
            this.device.addEventListener('gattserverdisconnected', this._onDisconnect);

            this._emitStatus('connecting', this.device.name);
            await this._connectGatt();
            return this.device.name;

        } catch (err) {
            this.connected = false;
            if (err.name === 'NotFoundError') {
                this._emitStatus('cancelled');
                return null;
            }
            this._emitStatus('error');
            throw err;
        }
    }

    async _connectGatt() {
        this.server = await this.device.gatt.connect();
        this.characteristic = await this._discoverWriteCharacteristic();

        if (!this.characteristic) {
            throw new Error('Could not find a writable characteristic on this device. It may not be a supported printer.');
        }

        this.connected = true;
        this._reconnectAttempts = 0;
        this._emitStatus('connected', this.device.name);
        this._drainPending();
    }

    async _reconnectGatt(delay = 1000) {
        await new Promise(r => setTimeout(r, delay));
        if (!this.device?.gatt) throw new Error('Device lost');
        await this._connectGatt();
    }

    async _discoverWriteCharacteristic() {
        const knownSet = new Set(KNOWN_WRITE_CHARACTERISTICS);
        let fallback = null;

        const services = await this.server.getPrimaryServices();

        for (const service of services) {
            try {
                const characteristics = await service.getCharacteristics();
                for (const char of characteristics) {
                    const props = char.properties;
                    if (!props.write && !props.writeWithoutResponse) continue;
                    if (knownSet.has(char.uuid)) return char;
                    if (!fallback) fallback = char;
                }
            } catch (_) {
                continue;
            }
        }

        for (const serviceUuid of KNOWN_PRINTER_SERVICES) {
            try {
                const service = await this.server.getPrimaryService(serviceUuid);
                const characteristics = await service.getCharacteristics();
                for (const char of characteristics) {
                    const props = char.properties;
                    if (!props.write && !props.writeWithoutResponse) continue;
                    if (knownSet.has(char.uuid)) return char;
                    if (!fallback) fallback = char;
                }
            } catch (_) {
                continue;
            }
        }

        return fallback;
    }

    async disconnect() {
        this._userDisconnected = true;
        this._reconnectAttempts = 0;
        if (this.device?.gatt?.connected) {
            this.device.gatt.disconnect();
        }
        this.connected = false;
        this.characteristic = null;
        this.server = null;
        this._emitStatus('disconnected');
    }

    _sanitize(text) {
        const parts = text.split(' / ');
        const ascii = parts.length > 1 ? parts[parts.length - 1] : text;
        return ascii.replace(/[^\x00-\x7F]/g, '?');
    }

    _encode(text) {
        return this._encoder.encode(text);
    }

    _cmd(...bytes) {
        return new Uint8Array(bytes);
    }

    _init() {
        return this._cmd(ESC, 0x40);
    }

    _bold(on) {
        return this._cmd(ESC, 0x45, on ? 1 : 0);
    }

    _alignCenter() {
        return this._cmd(ESC, 0x61, 1);
    }

    _alignLeft() {
        return this._cmd(ESC, 0x61, 0);
    }

    _alignRight() {
        return this._cmd(ESC, 0x61, 2);
    }

    _doubleSize(on) {
        return this._cmd(GS, 0x21, on ? 0x11 : 0x00);
    }

    _feed(lines = 1) {
        return this._cmd(ESC, 0x64, lines);
    }

    _cut() {
        return this._cmd(GS, 0x56, 0x42, 0x00);
    }

    _dashedLine() {
        return this._encode('-'.repeat(COLS_58MM));
    }

    _solidLine() {
        return this._encode('='.repeat(COLS_58MM));
    }

    _formatRow(left, right) {
        const maxLeft = COLS_58MM - right.length - 1;
        const truncLeft = left.length > maxLeft ? left.substring(0, maxLeft) : left;
        const padding = COLS_58MM - truncLeft.length - right.length;
        return truncLeft + ' '.repeat(Math.max(1, padding)) + right;
    }

    _concat(...arrays) {
        const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }

    buildReceiptBytes(orderData) {
        const parts = [];

        parts.push(this._init());

        parts.push(this._alignCenter());
        parts.push(this._doubleSize(true));
        parts.push(this._bold(true));
        parts.push(this._encode('POS DEMO'));
        parts.push(this._cmd(LF));
        parts.push(this._doubleSize(false));
        parts.push(this._bold(false));
        parts.push(this._encode('Thermal Printer Demo'));
        parts.push(this._cmd(LF));

        parts.push(this._dashedLine());
        parts.push(this._cmd(LF));

        parts.push(this._alignLeft());
        const date = new Date(orderData.timestamp);
        const dateStr = date.toLocaleDateString('en-IN');
        const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        parts.push(this._encode(this._formatRow(dateStr, timeStr)));
        parts.push(this._cmd(LF));

        if (orderData.paymentMode) {
            parts.push(this._encode(this._formatRow('Payment:', orderData.paymentMode)));
            parts.push(this._cmd(LF));
        }

        parts.push(this._dashedLine());
        parts.push(this._cmd(LF));

        parts.push(this._bold(true));
        parts.push(this._encode(`ORD #${orderData.id.toString().slice(-4)}`));
        parts.push(this._cmd(LF));
        parts.push(this._bold(false));

        parts.push(this._dashedLine());
        parts.push(this._cmd(LF));

        for (const item of orderData.items) {
            const itemTotal = `Rs.${item.price * item.qty}`;
            const printName = item.printName || item.name;
            const itemLabel = `${item.qty} x ${this._sanitize(printName)}`;
            parts.push(this._encode(this._formatRow(itemLabel, itemTotal)));
            parts.push(this._cmd(LF));
        }

        parts.push(this._solidLine());
        parts.push(this._cmd(LF));

        parts.push(this._bold(true));
        parts.push(this._doubleSize(true));
        parts.push(this._alignRight());
        parts.push(this._encode(`TOTAL  Rs.${orderData.total}`));
        parts.push(this._cmd(LF));
        parts.push(this._doubleSize(false));
        parts.push(this._bold(false));

        parts.push(this._alignLeft());
        parts.push(this._solidLine());
        parts.push(this._cmd(LF));

        parts.push(this._alignCenter());
        parts.push(this._encode('Thank You!'));
        parts.push(this._cmd(LF));
        parts.push(this._encode('Visit Again'));
        parts.push(this._cmd(LF));

        parts.push(this._feed(4));
        parts.push(this._cut());

        return this._concat(...parts);
    }

    buildTokenBytes(tokenData) {
        const parts = [];
        parts.push(this._init());

        parts.push(this._alignCenter());
        parts.push(this._solidLine());
        parts.push(this._cmd(LF));
        parts.push(this._doubleSize(true));
        parts.push(this._bold(true));
        parts.push(this._encode('MEAL TOKEN'));
        parts.push(this._cmd(LF));
        parts.push(this._doubleSize(false));
        parts.push(this._bold(false));
        parts.push(this._encode('POS Demo'));
        parts.push(this._cmd(LF));
        parts.push(this._solidLine());
        parts.push(this._cmd(LF));

        parts.push(this._alignLeft());
        parts.push(this._bold(true));
        parts.push(this._encode(this._formatRow(this._sanitize(tokenData.name), tokenData.uniqueId || '')));
        parts.push(this._cmd(LF));
        parts.push(this._bold(false));

        parts.push(this._encode(this._sanitize(tokenData.planName || 'N/A')));
        parts.push(this._cmd(LF));

        parts.push(this._dashedLine());
        parts.push(this._cmd(LF));

        const used = tokenData.tokensUsed || 0;
        const total = tokenData.totalTokens || 0;
        parts.push(this._doubleSize(true));
        parts.push(this._alignCenter());
        parts.push(this._bold(true));
        parts.push(this._encode(`${used} / ${total}`));
        parts.push(this._cmd(LF));
        parts.push(this._doubleSize(false));
        parts.push(this._bold(false));

        parts.push(this._alignLeft());
        parts.push(this._dashedLine());
        parts.push(this._cmd(LF));

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN');
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        parts.push(this._encode(this._formatRow(dateStr, timeStr)));
        parts.push(this._cmd(LF));

        parts.push(this._alignCenter());
        parts.push(this._encode('Enjoy your meal!'));
        parts.push(this._cmd(LF));
        parts.push(this._solidLine());
        parts.push(this._cmd(LF));

        parts.push(this._feed(3));
        parts.push(this._cut());

        return this._concat(...parts);
    }

    async _sendBytes(bytes) {
        if (!this.connected || !this.characteristic) {
            throw new Error('Printer is not connected.');
        }
        const CHUNK_SIZE = 200;
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            const chunk = bytes.slice(i, i + CHUNK_SIZE);
            if (this.characteristic.properties.writeWithoutResponse) {
                await this.characteristic.writeValueWithoutResponse(chunk);
                await new Promise(resolve => setTimeout(resolve, 20));
            } else {
                await this.characteristic.writeValueWithResponse(chunk);
            }
        }
    }

    _enqueue(bytes) {
        if (this._queue.length >= 10) {
            return Promise.reject(new Error('Print queue full, skipping job.'));
        }
        return new Promise((resolve, reject) => {
            this._queue.push({ bytes, resolve, reject });
            this._processQueue();
        });
    }

    async _processQueue() {
        if (this._printing || this._queue.length === 0) return;
        this._printing = true;
        const job = this._queue.shift();
        try {
            await this._sendBytes(job.bytes);
            job.resolve(true);
        } catch (err) {
            job.reject(err);
        } finally {
            this._printing = false;
            if (this._queue.length > 0) this._processQueue();
        }
    }

    async printOrder(orderData) {
        const bytes = this.buildReceiptBytes(orderData);
        return this._enqueue(bytes);
    }

    async printToken(tokenData) {
        const bytes = this.buildTokenBytes(tokenData);
        return this._enqueue(bytes);
    }

    queueToken(tokenData) {
        if (this.connected) {
            return this.printToken(tokenData);
        }
        if (this._pendingTokens.length < 50) {
            this._pendingTokens.push(tokenData);
        }
        return Promise.resolve(false);
    }

    _drainPending() {
        if (this._pendingTokens.length === 0) return;
        const pending = this._pendingTokens.splice(0);
        pending.forEach(td => {
            this.printToken(td).catch(e => console.error('Drain print failed', e));
        });
    }

    get pendingCount() {
        return this._pendingTokens.length;
    }
}

const printerEngine = new PrinterEngine();

export default printerEngine;
