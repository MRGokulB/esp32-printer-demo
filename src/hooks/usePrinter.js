import { useState, useEffect, useCallback, useRef } from 'react';
import printerEngine from '../utils/printerEngine';

const usePrinter = () => {
    const [printerStatus, setPrinterStatus] = useState(() => ({
        connected: printerEngine.connected,
        status: printerEngine.connected ? 'connected' : 'idle',
        deviceName: printerEngine.device?.name || null,
    }));
    const [isPrinting, setIsPrinting] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        const unsubscribe = printerEngine.onStatusChange((newStatus) => {
            if (mountedRef.current) {
                setPrinterStatus({
                    connected: newStatus.connected,
                    status: newStatus.status,
                    deviceName: newStatus.deviceName || null,
                });
            }
        });

        return () => {
            mountedRef.current = false;
            unsubscribe();
        };
    }, []);

    const connect = useCallback(() => printerEngine.connect(), []);

    const disconnect = useCallback(async () => {
        await printerEngine.disconnect();
    }, []);

    const printReceipt = useCallback(async (orderData) => {
        if (!printerEngine.connected) {
            return false;
        }

        setIsPrinting(true);
        try {
            await printerEngine.printOrder(orderData);
            return true;
        } catch (err) {
            throw err;
        } finally {
            if (mountedRef.current) {
                setIsPrinting(false);
            }
        }
    }, []);

    const printToken = useCallback(async (tokenData) => {
        if (!printerEngine.connected) {
            return false;
        }

        setIsPrinting(true);
        try {
            await printerEngine.printToken(tokenData);
            return true;
        } catch (err) {
            throw err;
        } finally {
            if (mountedRef.current) {
                setIsPrinting(false);
            }
        }
    }, []);

    return {
        printerStatus,
        isPrinting,
        isSupported: printerEngine.isSupported(),
        isConnected: printerStatus.connected,
        connect,
        disconnect,
        printReceipt,
        printToken,
    };
};

export default usePrinter;
