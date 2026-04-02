import React, { createContext, useContext, useState, useCallback } from 'react';
import { SuccessToast } from './SuccessToast';

const ToastContext = createContext({ show: () => {} });

/**
 * Global toast provider. Wrap your app once, then call useToast().show(msg)
 * from any screen — no local state management needed.
 */
export const ToastProvider = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');

    const show = useCallback((msg) => {
        setMessage(msg);
        setVisible(true);
    }, []);

    const onDismiss = useCallback(() => {
        setVisible(false);
    }, []);

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            <SuccessToast visible={visible} message={message} onDismiss={onDismiss} />
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
