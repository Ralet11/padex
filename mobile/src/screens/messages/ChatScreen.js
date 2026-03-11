import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { messagesAPI } from '../../services/api';
import { getSocket, joinConnectionRoom, sendSocketMessage, emitTyping } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../theme';

export default function ChatScreen({ route, navigation }) {
  const { connectionId, partnerName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: partnerName });
  }, [partnerName]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await messagesAPI.list(connectionId);
      setMessages(res.data.messages);
    } catch (err) {
      console.error(err);
    }
  }, [connectionId]);

  useEffect(() => {
    fetchMessages();
    joinConnectionRoom(connectionId);

    const socket = getSocket();
    if (socket) {
      socket.on('new_message', (msg) => {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socket.on('user_typing', () => {
        setIsTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setIsTyping(false), 2000);
      });

      return () => {
        socket.off('new_message');
        socket.off('user_typing');
      };
    }
  }, [connectionId]);

  useEffect(() => {
    if (messages.length) setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  }, [messages.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setSending(true);
    try {
      sendSocketMessage(connectionId, text);
    } catch {
      // Fallback REST
      const res = await messagesAPI.send({ connection_id: connectionId, content: text });
      setMessages((prev) => [...prev, res.data.message]);
    } finally {
      setSending(false);
    }
  }

  function handleInputChange(text) {
    setInput(text);
    emitTyping(connectionId);
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  const groupedMessages = messages.reduce((acc, msg, i) => {
    const date = msg.created_at?.split('T')[0];
    const prevDate = i > 0 ? messages[i - 1].created_at?.split('T')[0] : null;
    if (date !== prevDate) acc.push({ type: 'date', date, id: `date_${date}` });
    acc.push(msg);
    return acc;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex} keyboardVerticalOffset={90}>
        <FlatList
          ref={flatRef}
          data={groupedMessages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            if (item.type === 'date') {
              return (
                <View style={styles.dateSeparator}>
                  <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                </View>
              );
            }
            const isMine = item.sender_id === user.id;
            return (
              <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
                {!isMine && (
                  <View style={styles.msgAvatar}>
                    <Text style={styles.msgAvatarText}>{item.sender_name?.[0] || '?'}</Text>
                  </View>
                )}
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.content}</Text>
                  <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>{formatTime(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        />

        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{partnerName} está escribiendo...</Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={handleInputChange}
            placeholder="Escribí un mensaje..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  messages: { padding: spacing.md, paddingBottom: 8 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateText: {
    fontSize: 11, color: colors.textMuted, backgroundColor: colors.card,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full,
  },
  msgRow: { flexDirection: 'row', marginBottom: 8, maxWidth: '85%' },
  msgRowRight: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgRowLeft: { alignSelf: 'flex-start' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center', marginRight: 6, marginTop: 4,
  },
  msgAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bubble: {
    borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 9,
    maxWidth: '100%',
  },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 15, color: colors.text, lineHeight: 21 },
  bubbleTextMine: { color: colors.white },
  msgTime: { fontSize: 10, color: colors.textMuted, marginTop: 3, textAlign: 'right' },
  msgTimeMine: { color: 'rgba(255,255,255,0.6)' },
  typingIndicator: { paddingHorizontal: spacing.md, paddingBottom: 4 },
  typingText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.xl,
    paddingHorizontal: 16, paddingVertical: 10, color: colors.text,
    fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendIcon: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
