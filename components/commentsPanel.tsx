import { getRelativeTime } from '@/app/features/profileCitizen/utils/timeFormat';
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type CommentItem = {
  id: string;
  denuncia_id?: string;
  usuario_id?: string | null;
  author?: string;
  text?: string;
  created_at?: string;
  avatar?: string | null;
  likes?: number;
  liked?: boolean;
  parent_id?: number | null;
  contenido?: string;
  autor?: string;
};

type Props = {
  comments: CommentItem[];
  loading?: boolean;
  commentText: string;
  setCommentText: (v: string) => void;
  onSubmit: (parentId?: number | null) => Promise<void> | void;
  onLike?: (commentId: string, currentlyLiked: boolean) => Promise<void> | void;
  onReply?: (comment: CommentItem) => void;
  currentUserId?: string | null;
  currentUserAvatar?: string | null;
};

export default function CommentsPanel({
  comments,
  loading = false,
  commentText,
  setCommentText,
  onSubmit,
  onLike,
  onReply,
  currentUserId,
  currentUserAvatar,
}: Props) {
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'icon');
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#ffffffff' }, 'tint');
  const itemBg = useThemeColor({ light: '#F9FAFB', dark: '#0A1628' }, 'background');
  const { fontSize } = useFontSize();
  const inputRef = useRef<TextInput | null>(null);

  const REPLY_INDENT = 56; // px indent for replies

  const [localLikes, setLocalLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);

  useEffect(() => {
    const map: Record<string, { count: number; liked: boolean }> = {};
    const parentCounts: Record<string, number> = {};
    (comments || []).forEach((cc: any) => {
      const id = String(cc.id);
      const likes = (cc.likes ?? cc.score ?? 0) as number;
      const liked = !!cc.liked;
      map[id] = { count: likes, liked };
      const pid = (cc.parent_id ?? null) as any;
      if (pid != null) parentCounts[String(pid)] = (parentCounts[String(pid)] || 0) + 1;
    });
    setLocalLikes(map);

    // Merge parent keys into existing collapsedReplies instead of overwriting.
    setCollapsedReplies((prev) => {
      const next: Record<string, boolean> = { ...(prev || {}) };
      // Add any new parent keys defaulting to true (collapsed)
      Object.keys(parentCounts).forEach((k) => {
        if (!(k in next)) next[k] = true;
      });
      // Remove stale keys that no longer have children
      Object.keys(next).forEach((k) => {
        if (!(k in parentCounts)) delete next[k];
      });
      return next;
    });
  }, [comments]);

  const handleLike = async (c: CommentItem) => {
    const prev = localLikes[String(c.id)] ?? { count: c.likes ?? 0, liked: !!c.liked };
    const next = { count: prev.liked ? Math.max(0, prev.count - 1) : prev.count + 1, liked: !prev.liked };
    setLocalLikes((p) => ({ ...p, [String(c.id)]: next }));
    try {
      if (onLike) await onLike(String(c.id), prev.liked);
    } catch (e) {
      setLocalLikes((p) => ({ ...p, [String(c.id)]: prev }));
    }
  };

  const handleReply = (c: CommentItem) => {
    const author = (c.author ?? c.autor ?? 'usuario') as string;
    const mention = `@${author.split(' ')[0] || author} `;
    setCommentText(mention);
    setTimeout(() => inputRef.current?.focus(), 50);
    setReplyTo({ id: String(c.id), author });
    if (onReply) onReply(c);
  };

  const parentMap: Record<string, CommentItem[]> = {};
  const tops: CommentItem[] = [];
  (comments || []).forEach((cc: any) => {
    const c = cc as CommentItem & { parent_id?: number | null };
    if (c.parent_id != null) {
      const pid = String(c.parent_id);
      parentMap[pid] = parentMap[pid] || [];
      parentMap[pid].push(c);
    } else {
      tops.push(c);
    }
  });

  const collectDescendants = (parentId: string, out: Array<CommentItem>) => {
    const direct = parentMap[parentId] || [];
    direct.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    direct.forEach((d) => {
      out.push(d);
      collectDescendants(String(d.id), out);
    });
  };

  const isSubmitting = isSubmittingLocal;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.bottom + 10}>
      {loading ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={accentColor} />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyBox}>
          <IconSymbol name="bubble.left" size={48} color={mutedColor} />
          <Text style={[styles.emptyText, { color: mutedColor, fontSize: getFontSizeValue(fontSize, 16) }]}>NO hay comentarios</Text>
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
        {tops.map((c) => {
          const likesState = localLikes[String(c.id)] ?? { count: c.likes ?? 0, liked: !!c.liked };
          const avatarUri = c.avatar ?? (c.usuario_id && currentUserId && c.usuario_id === currentUserId ? currentUserAvatar : null);

          const childrenFlat: CommentItem[] = [];
          collectDescendants(String(c.id), childrenFlat);
          const collapsed = !!collapsedReplies[String(c.id)];

          return (
            <View key={c.id}>
              <View style={styles.commentRow}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatarFallback, { backgroundColor: accentColor }]}>
                    <Text style={styles.commentAvatarText}>{(String(((c.author ?? c.autor) || 'U')).trim().charAt(0) || 'U').toUpperCase()}</Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View style={styles.commentHeaderRow}>
                    <Text style={[styles.commentAuthor, { color: textColor, fontSize: getFontSizeValue(fontSize, 14) }]}>{c.author ?? c.autor}</Text>
                    {c.created_at ? <Text style={{ color: mutedColor, fontSize: getFontSizeValue(fontSize, 12) }}>{getRelativeTime(c.created_at)}</Text> : null}
                  </View>

                  <Text style={{ color: textColor, marginTop: 6, fontSize: getFontSizeValue(fontSize, 14) }}>{c.text ?? c.contenido}</Text>

                  <View style={styles.commentActionsRow}>
                    <View style={styles.commentActionsLeft}>
                      <TouchableOpacity onPress={() => handleLike(c)} style={styles.commentActionButton}>
                        <IconSymbol name={likesState.liked ? 'heart.fill' : 'heart'} size={18} color={likesState.liked ? '#EF4444' : textColor} />
                        <Text style={[styles.commentActionText, { color: textColor }]}>{likesState.count || 0}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.commentActionsRight}>
                      <TouchableOpacity onPress={() => handleReply(c)} style={styles.commentActionButton}>
                        <IconSymbol name="reply" size={16} color={mutedColor} />
                        <Text style={[styles.commentActionText, { color: mutedColor }]}>Responder</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {childrenFlat.length > 0 ? (
                <View style={{ paddingLeft: REPLY_INDENT, paddingRight: 12, marginTop: 4 }}>
                  <TouchableOpacity onPress={() => setCollapsedReplies((p) => ({ ...p, [String(c.id)]: !p[String(c.id)] }))} style={{ paddingVertical: 4, alignSelf: 'center', marginTop: 2 }}>
                    <Text style={{ color: accentColor, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{collapsed ? `Mostrar respuestas (${childrenFlat.length})` : 'Ocultar respuestas'}</Text>
                  </TouchableOpacity>

                  {!collapsed && childrenFlat.map((r) => {
                    const rLikes = localLikes[String(r.id)] ?? { count: r.likes ?? 0, liked: !!r.liked };
                    const rAvatar = r.avatar ?? null;
                    return (
                      <View key={r.id} style={[styles.replyRow]}> 
                        {rAvatar ? (
                          <Image source={{ uri: rAvatar }} style={[styles.replyAvatar]} />
                        ) : (
                          <View style={[styles.replyAvatarFallback, { backgroundColor: accentColor }]}>
                            <Text style={[styles.commentAvatarText, { fontSize: 12 }]}>{(String(((r.author ?? r.autor) || 'U')).trim().charAt(0) || 'U').toUpperCase()}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <View style={styles.commentHeaderRow}>
                            <Text style={[styles.commentAuthor, { color: textColor, fontSize: getFontSizeValue(fontSize, 13) }]}>{r.author ?? r.autor}</Text>
                            {r.created_at ? <Text style={{ color: mutedColor, fontSize: getFontSizeValue(fontSize, 11) }}>{getRelativeTime(r.created_at)}</Text> : null}
                          </View>
                          <Text style={{ color: textColor, marginTop: 4, fontSize: getFontSizeValue(fontSize, 13) }}>{r.text ?? r.contenido}</Text>
                          <View style={[styles.commentActionsRow, { marginTop: 6 }]}>
                            <TouchableOpacity onPress={() => handleLike(r)} style={styles.commentActionButton}>
                              <IconSymbol name={rLikes.liked ? 'heart.fill' : 'heart'} size={16} color={rLikes.liked ? '#EF4444' : textColor} />
                              <Text style={[styles.commentActionText, { color: textColor }]}>{rLikes.count || 0}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleReply(r)} style={[styles.commentActionButton, { marginLeft: 10 }]}> 
                              <IconSymbol name="reply" size={14} color={mutedColor} />
                              <Text style={[styles.commentActionText, { color: mutedColor, fontSize: 13 }]}>Responder</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Input */}
      <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        {replyTo ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ backgroundColor: itemBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, flex: 1 }}>
              <Text style={{ color: textColor }}>Respondiendo a @{replyTo.author}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={{ marginLeft: 8, padding: 6 }}>
              <IconSymbol name="close" size={16} color={mutedColor} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inputRow}> 
          <TextInput
            ref={inputRef}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Escribe un comentario..."
            placeholderTextColor={mutedColor}
            style={[
              styles.input,
              { color: textColor, backgroundColor: itemBg, borderColor: '#00000010' },
            ]}
            multiline
          />
          <TouchableOpacity
            onPress={async () => {
              if (isSubmitting || !commentText.trim()) return;
              const prevText = commentText;
              try {
                // Optimistic UI: clear input immediately so user sees fast feedback
                setIsSubmittingLocal(true);
                setReplyTo(null);
                setCommentText('');
                await onSubmit(replyTo ? Number(replyTo.id) : undefined);
              } catch (e) {
                // restore previous text on error
                setCommentText(prevText);
              } finally {
                setIsSubmittingLocal(false);
              }
            }}
            disabled={isSubmitting || !commentText.trim()}
            style={{ padding: 8 }}
          >
            {isSubmitting ? <ActivityIndicator size="small" color={accentColor} /> : <IconSymbol name="paperplane" size={22} color={!commentText.trim() ? mutedColor : accentColor} />}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function getFontSizeValue(fontSize: 'small' | 'medium' | 'large', base: number): number {
  switch (fontSize) {
    case 'small':
      return base * 0.85;
    case 'medium':
      return base;
    case 'large':
      return base * 1.25;
    default:
      return base;
  }
}

const styles = StyleSheet.create({
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  commentRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, alignItems: 'flex-start' },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  commentAvatarFallback: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: '#fff', fontWeight: '700' },
  commentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentAuthor: { fontWeight: '700' },
  commentActionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  commentActionButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentActionText: { fontSize: 13, fontWeight: '600' },
  commentActionsLeft: { flexDirection: 'row', alignItems: 'center' },
  commentActionsRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 18,
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  replyRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, paddingHorizontal: 0 },
  replyAvatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  replyAvatarFallback: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
