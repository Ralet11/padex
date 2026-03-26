import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { messagesAPI } from '../../services/api';
import { getSocket, joinConnectionRoom, sendSocketMessage, emitTyping } from '../../services/socket';
import { screenPadding } from '../../theme/layout';

function parseMessageDate(rawValue) {
  if (!rawValue) return null;
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function buildDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function ChatScreen({ route, navigation }) {
  const { connectionId, partnerName } = route.params;
  const { user } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatRef = useRef(null);
  const typingTimeout = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await messagesAPI.list(connectionId);
      setMessages(Array.isArray(res.data.messages) ? res.data.messages : []);
    } catch (err) {
      console.error('[chat] fetch failed', err);
    }
  }, [connectionId]);

  useEffect(() => {
    fetchMessages();
    joinConnectionRoom(connectionId);

    const socket = getSocket();
    if (!socket) return undefined;

    const handleNewMessage = (msg) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 120);
    };

    const handleTyping = () => {
      setIsTyping(true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setIsTyping(false), 1800);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);

    return () => {
      clearTimeout(typingTimeout.current);
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
    };
  }, [connectionId, fetchMessages]);

  useEffect(() => {
    if (!messages.length) return;
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 120);
  }, [messages.length]);

  const groupedMessages = useMemo(() => {
    return messages.reduce((acc, msg, index) => {
      const currentDate = parseMessageDate(msg.created_at || msg.createdAt);
      const previousDate = index > 0 ? parseMessageDate(messages[index - 1].created_at || messages[index - 1].createdAt) : null;
      const currentKey = currentDate ? buildDateKey(currentDate) : 'unknown';
      const previousKey = previousDate ? buildDateKey(previousDate) : null;

      if (currentKey !== previousKey) {
        acc.push({
          id: `date_${currentKey}_${index}`,
          type: 'date',
          date: currentDate,
        });
      }

      acc.push({
        ...msg,
        parsedDate: currentDate,
      });

      return acc;
    }, []);
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    try {
      sendSocketMessage(connectionId, text);
    } catch (err) {
      console.warn('[chat] socket send failed, using REST fallback', err);
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

  function formatTime(date) {
    if (!date) return '';
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDate(date) {
    if (!date) return 'Sin fecha';

    const today = new Date();
    const todayKey = buildDateKey(today);

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const dateKey = buildDateKey(date);
    if (dateKey === todayKey) return 'Hoy';
    if (dateKey === buildDateKey(yesterday)) return 'Ayer';

    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  const styles = createStyles(colors, spacing, radius, insets);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={90}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {partnerName || 'Chat'}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          ref={flatRef}
          data={groupedMessages}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Todavia no hay mensajes</Text>
              <Text style={styles.emptyText}>Escribile a {partnerName} para empezar la conversacion.</Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'date') {
              return (
                <View style={styles.dateSeparator}>
                  <View style={styles.datePill}>
                    <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                  </View>
                </View>
              );
            }

            const isMine = item.sender_id === user?.id;
            const initial = (item.sender_name || partnerName || '?').trim().charAt(0).toUpperCase() || '?';

            return (
              <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}>
                {!isMine && (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                )}

                <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapOther]}>
                  {!isMine && !!item.sender_name && (
                    <Text style={styles.senderName}>{item.sender_name}</Text>
                  )}
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                    <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextOther]}>
                      {item.content}
                    </Text>
                    <Text style={[styles.messageTime, isMine ? styles.messageTimeMine : styles.messageTimeOther]}>
                      {formatTime(item.parsedDate)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />

        {isTyping && (
          <View style={styles.typingWrap}>
            <Text style={styles.typingText}>{partnerName} esta escribiendo...</Text>
          </View>
        )}

        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={handleInputChange}
              placeholder="Escribi un mensaje..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              maxLength={1000}
              textAlignVertical="center"
            />
            <TouchableOpacity
              style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
              activeOpacity={0.8}
            >
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors, spacing, radius, insets) {
  const floatingTabBarOffset = 60 + spacing.md + 12 + insets.bottom;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: screenPadding.horizontal,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.background,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: colors.surfaceHighlight,
    },
    backButtonText: {
      fontSize: 28,
      lineHeight: 28,
      color: colors.text.primary,
      marginTop: -4,
    },
    headerCenter: {
      flex: 1,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text.primary,
    },
    headerSpacer: {
      width: 36,
    },
    flex: {
      flex: 1,
    },
    messagesContent: {
      paddingTop: spacing.md,
      paddingHorizontal: screenPadding.horizontal,
      paddingBottom: spacing.lg,
      flexGrow: 1,
    },
    emptyState: {
      flex: 1,
      minHeight: 240,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 6,
    },
    emptyText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    dateSeparator: {
      alignItems: 'center',
      marginVertical: spacing.md,
    },
    datePill: {
      backgroundColor: colors.surfaceHighlight,
      borderColor: colors.border,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.full,
    },
    dateText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    messageRow: {
      width: '100%',
      flexDirection: 'row',
      marginBottom: spacing.sm,
      alignItems: 'flex-end',
    },
    messageRowMine: {
      justifyContent: 'flex-end',
    },
    messageRowOther: {
      justifyContent: 'flex-start',
    },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginBottom: 6,
    },
    avatarText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.primary,
    },
    bubbleWrap: {
      maxWidth: '78%',
    },
    bubbleWrapMine: {
      alignItems: 'flex-end',
    },
    bubbleWrapOther: {
      alignItems: 'flex-start',
    },
    senderName: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.tertiary,
      marginBottom: 4,
      marginLeft: 4,
    },
    bubble: {
      paddingHorizontal: 14,
      paddingTop: 11,
      paddingBottom: 8,
      borderRadius: 20,
    },
    bubbleMine: {
      backgroundColor: colors.text.primary,
      borderBottomRightRadius: 6,
    },
    bubbleOther: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderBottomLeftRadius: 6,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 21,
    },
    messageTextMine: {
      color: colors.background,
    },
    messageTextOther: {
      color: colors.text.primary,
    },
    messageTime: {
      fontSize: 11,
      marginTop: 6,
      textAlign: 'right',
    },
    messageTimeMine: {
      color: 'rgba(255,255,255,0.72)',
    },
    messageTimeOther: {
      color: colors.text.tertiary,
    },
    typingWrap: {
      paddingHorizontal: screenPadding.horizontal,
      paddingBottom: 6,
    },
    typingText: {
      fontSize: 12,
      fontStyle: 'italic',
      color: colors.text.tertiary,
    },
    composerWrap: {
      paddingHorizontal: screenPadding.horizontal,
      paddingTop: spacing.xs,
      paddingBottom: floatingTabBarOffset,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 6,
    },
    input: {
      flex: 1,
      maxHeight: 110,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text.primary,
      paddingTop: 10,
      paddingBottom: 10,
      paddingRight: 12,
    },
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.text.primary,
    },
    sendButtonDisabled: {
      backgroundColor: colors.border,
    },
    sendButtonText: {
      fontSize: 16,
      color: colors.background,
      fontWeight: '700',
      marginLeft: 2,
    },
  });
}
