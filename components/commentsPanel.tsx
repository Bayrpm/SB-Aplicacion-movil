import { getRelativeTime } from '@/app/features/profileCitizen/utils/timeFormat';
import { useFontSize } from '@/app/features/settings/fontSizeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export type CommentItem = {
  id: string | number;
  usuario_id?: string | number | null;
  author?: string | null;
  autor?: string | null;
  text?: string | null;
  contenido?: string | null;
  created_at?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  autor_avatar?: string | null;
  foto?: string | null;
  imagen_url?: string | null;
  parent_id?: number | null;
  likes?: number;
  liked?: boolean;
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
  currentUserName?: string | null;
  onEdit?: (commentId: string, newText: string) => Promise<void> | void;
  onDelete?: (commentId: string) => Promise<void> | void;
};

export default function CommentsPanel({
  comments,
  loading = false,
  commentText,
  setCommentText,
  onSubmit,
  onLike,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
  currentUserAvatar,
  currentUserName,
}: Props) {
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'icon');
  // Accent usado para acciones y también como fondo del avatar fallback.
  // Dark value previous was invalid ('#ffffffff') which puede causar que el fondo
  // sea blanco y las iniciales (texto blanco) queden invisibles en dark mode.
  const accentColor = useThemeColor({ light: '#0A4A90', dark: '#0A4A90' }, 'tint');
  const itemBg = useThemeColor({ light: '#F9FAFB', dark: '#0A1628' }, 'background');
  const modalBg = useThemeColor({ light: '#FFFFFF', dark: '#071018' }, 'background');
  const overlayBg = useThemeColor({ light: 'rgba(0,0,0,0.45)', dark: 'rgba(255,255,255,0.03)' }, 'background');
  const selectedBg = useThemeColor({ light: '#FFF7ED', dark: '#17202A' }, 'background');
  const { fontSize } = useFontSize();
  const inputRef = useRef<TextInput | null>(null);

  const REPLY_INDENT = 56; // px indent for replies

  const [localLikes, setLocalLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<CommentItem | null>(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const scrollRef = useRef<ScrollView | null>(null);

  // Estimación de la altura ocupada por el input (incluye padding/margins) —
  // se usa para reservar espacio en el ScrollView cuando el teclado está cerrado.
  const ESTIMATED_INPUT_HEIGHT = 88;
  const [measuredInputHeight, setMeasuredInputHeight] = useState<number | null>(null);

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

  // Listen to keyboard events to adjust bottom spacing on standalone builds
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      // Robust extraction of keyboard height across RN versions / platforms
      const h = e?.endCoordinates?.height ?? e?.end?.height ?? e?.nativeEvent?.endCoordinates?.height ?? 0;
      setKeyboardHeight(h);

      // When keyboard opens, ensure the ScrollView scrolls to the end so the input is visible
      // small timeout to allow layout to settle
      setTimeout(() => {
        try { scrollRef.current?.scrollToEnd({ animated: true }); } catch (err) {}
      }, 50);
    };
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      try { showSub.remove(); } catch {}
      try { hideSub.remove(); } catch {}
    };
  }, [insets.bottom]);

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
    // Usar 'padding' en ambos OS mejora el comportamiento dentro de modals y vistas anidadas.
    // Use KeyboardAvoidingView only on iOS (Android behaves better with adjustResize/windowSoftInputMode).
    // For Android we rely on keyboard listeners + scrollToEnd fallback.
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // Reduce the vertical offset so the input is not pushed too far up on iOS.
      // Use a small offset + safe-area bottom to keep the input above system bars.
      keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.bottom ? insets.bottom + 24 : 24) : 0}
    >
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

  {/* Contenedor relativo para permitir posicionar el input absolutado en el fondo */}
    <View style={{ flex: 1, position: 'relative' }}>
    <ScrollView
      ref={(r) => { scrollRef.current = r; }}
      style={{ flex: 1 }}
  // Reservar un espacio razonable para el input + safe-area.
  // Ajustado para que el input quede lo más abajo posible sin ocultar la barra de sistema.
    contentContainerStyle={{
          // Reserve space equal to the input height + either the keyboard height (when open)
          // or the bottom safe-area (when closed). Reduce the extra buffer so the input
          // visually sits closer to the navigation bar.
          paddingBottom: (measuredInputHeight ?? ESTIMATED_INPUT_HEIGHT)
            + (keyboardHeight > 0 ? keyboardHeight : (insets.bottom || 0))
            + 2,
        }}
      keyboardShouldPersistTaps="handled"
    >
        {tops.map((c) => {
          const likesState = localLikes[String(c.id)] ?? { count: c.likes ?? 0, liked: !!c.liked };
          // Support multiple possible avatar fields returned by different endpoints/views
          const avatarUri = c.avatar ?? c.avatar_url ?? c.autor_avatar ?? c.foto ?? c.imagen_url ?? (c.usuario_id && currentUserId && String(c.usuario_id) === String(currentUserId) ? currentUserAvatar : null);

          const childrenFlat: CommentItem[] = [];
          collectDescendants(String(c.id), childrenFlat);
          const collapsed = !!collapsedReplies[String(c.id)];

          const isSelected = selectedComment?.id === String(c.id);

          return (
            <View key={c.id} style={optionsModalVisible && !isSelected ? { opacity: 0.2 } : undefined}>
              <TouchableOpacity
                activeOpacity={0.95}
                onLongPress={() => {
                  // Allow long-press if this comment belongs to current user.
                  // Some endpoints may omit/normalize usuario_id; as a safe fallback
                  // also permit opening options when the comment avatar matches current user's avatar.
                  const authoredById = currentUserId && c.usuario_id && String(c.usuario_id) === String(currentUserId);
                  const avatarUri = c.avatar ?? c.avatar_url ?? c.autor_avatar ?? c.foto ?? c.imagen_url ?? (c.usuario_id && currentUserId && String(c.usuario_id) === String(currentUserId) ? currentUserAvatar : null);
                  const authoredByAvatar = currentUserAvatar && avatarUri && String(avatarUri) === String(currentUserAvatar);
                  // Name-based fallback: allow if comment author matches currentUserName (full or first name)
                  const commentAuthor = String(c.author ?? c.autor ?? '').trim();
                  const authoredByName = currentUserName && commentAuthor && (String(commentAuthor).toLowerCase() === String(currentUserName).toLowerCase() || commentAuthor.split(' ')[0].toLowerCase() === String(currentUserName).split(' ')[0].toLowerCase());
                  if (authoredById || authoredByAvatar || authoredByName) {
                    setSelectedComment(c);
                    setOptionsModalVisible(true);
                  }
                }}
                style={styles.commentRow}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatarFallback, { backgroundColor: accentColor }]}> 
                    <Text style={[styles.commentAvatarText, { fontSize: getFontSizeValue(fontSize, 16) }]}>{getInitials(String((c.author ?? c.autor) || 'U'))}</Text>
                  </View>
                )}

                <View style={[{ flex: 1 }, optionsModalVisible && isSelected ? { backgroundColor: selectedBg, borderRadius: 8, padding: 6 } : undefined]}>
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
              </TouchableOpacity>

              {childrenFlat.length > 0 ? (
                <View style={{ paddingLeft: REPLY_INDENT, paddingRight: 12, marginTop: 4 }}>
                  <TouchableOpacity onPress={() => setCollapsedReplies((p) => ({ ...p, [String(c.id)]: !p[String(c.id)] }))} style={{ paddingVertical: 4, alignSelf: 'center', marginTop: 2 }}>
                    <Text style={{ color: accentColor, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{collapsed ? `Mostrar respuestas (${childrenFlat.length})` : 'Ocultar respuestas'}</Text>
                  </TouchableOpacity>

                  {!collapsed && childrenFlat.map((r) => {
                    const rLikes = localLikes[String(r.id)] ?? { count: r.likes ?? 0, liked: !!r.liked };
                    const rAvatar = r.avatar ?? r.avatar_url ?? r.autor_avatar ?? r.foto ?? r.imagen_url ?? null;
                    const isReplySelected = selectedComment?.id === String(r.id);
                    return (
                      <View key={r.id} style={optionsModalVisible && !isReplySelected ? { opacity: 0.2 } : undefined}>
                        <TouchableOpacity
                          activeOpacity={0.95}
                          onLongPress={() => {
                            const rAvatar = r.avatar ?? r.avatar_url ?? r.autor_avatar ?? r.foto ?? r.imagen_url ?? null;
                            const authoredByIdR = currentUserId && r.usuario_id && String(r.usuario_id) === String(currentUserId);
                            const authoredByAvatarR = currentUserAvatar && rAvatar && String(rAvatar) === String(currentUserAvatar);
                            const rAuthor = String(r.author ?? r.autor ?? '').trim();
                            const authoredByNameR = currentUserName && rAuthor && (String(rAuthor).toLowerCase() === String(currentUserName).toLowerCase() || rAuthor.split(' ')[0].toLowerCase() === String(currentUserName).split(' ')[0].toLowerCase());
                            if (authoredByIdR || authoredByAvatarR || authoredByNameR) {
                              setSelectedComment(r);
                              setOptionsModalVisible(true);
                            }
                          }}
                          style={[styles.replyRow]}
                        >
                          {rAvatar ? (
                            <Image source={{ uri: rAvatar }} style={[styles.replyAvatar]} />
                          ) : (
                            <View style={[styles.replyAvatarFallback, { backgroundColor: accentColor }]}> 
                              <Text style={[styles.commentAvatarText, { fontSize: getFontSizeValue(fontSize, 12) }]}>{getInitials(String((r.author ?? r.autor) || 'U'))}</Text>
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
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Options modal for modify/delete */}
      <Modal visible={optionsModalVisible} transparent animationType="fade" onRequestClose={() => setOptionsModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: overlayBg }]}> 
          <View style={[styles.modalInner, { backgroundColor: modalBg }]}> 
            <Text style={[styles.modalTitle, { color: textColor }]}>Acciones</Text>
            {/* Determine permission: canEdit if within 1 hour and authored by current user */}
            {selectedComment ? (() => {
              const authored = currentUserId && selectedComment.usuario_id && String(selectedComment.usuario_id) === String(currentUserId);
              const created = selectedComment.created_at ? new Date(selectedComment.created_at) : null;
              const canEdit = authored && created ? (Date.now() - created.getTime()) <= (60 * 60 * 1000) : false;
              return (
                <>
                  {canEdit ? (
                    <TouchableOpacity style={styles.modalButton} onPress={() => {
                      // Prefill input and enter editing mode
                      setOptionsModalVisible(false);
                      setEditingCommentId(String(selectedComment.id));
                      setCommentText(selectedComment.text ?? selectedComment.contenido ?? '');
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}>
                      <Text style={[styles.modalButtonText, { color: accentColor }]}>Modificar</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity style={[styles.modalButton, { marginTop: 8 }]} onPress={async () => {
                    // Delete action
                    setOptionsModalVisible(false);
                    if (selectedComment && typeof onDelete === 'function') {
                      try {
                        await onDelete(String(selectedComment.id));
                      } catch (e) {
                        // ignore
                      }
                    }
                    setSelectedComment(null);
                  }}>
                    <Text style={[styles.modalButtonText, { color: '#EF4444', fontWeight: '700' }]}>Eliminar</Text>
                  </TouchableOpacity>
                </>
              );
            })() : null}

            <TouchableOpacity style={[styles.modalButton, { marginTop: 12 }]} onPress={() => { setOptionsModalVisible(false); setSelectedComment(null); }}>
              <Text style={[styles.modalCancelText, { color: mutedColor }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

  {/* Input */}
  {/* Ajustar marginBottom dinámicamente según la altura del teclado para builds standalone */}
  {/* Ajustar marginBottom dinámicamente según la altura del teclado para builds standalone */}
    {/* Input absolutado para quedarse pegado al borde inferior del contenedor */}
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        // Si el teclado está abierto, posicionar sobre el teclado.
        // Cuando está cerrado, anclamos el contenedor exactamente a bottom: 0
        // y reducimos el paddingBottom interno para que el input quede más cerca
        // de la barra de navegación (pero sin overlappear la safe-area).
        bottom: keyboardHeight > 0 ? Math.max(0, keyboardHeight + 8) : 0,
        paddingHorizontal: 12,
        paddingVertical: 8,
        // small reduction of safe-area padding to bring input visually closer to nav
        paddingBottom: Math.max(0, (insets.bottom || 0) - 6),
        backgroundColor: 'transparent',
      }}
      // Medir la altura real del input para ajustar el padding dinámicamente
      onLayout={(e) => {
        try {
          const h = e.nativeEvent.layout.height;
          if (h && h > 0 && h !== measuredInputHeight) setMeasuredInputHeight(h);
        } catch (err) {}
      }}
    >
        {editingCommentId ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ backgroundColor: itemBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, flex: 1 }}>
              <Text style={{ color: textColor }}>Editando comentario</Text>
            </View>
            <TouchableOpacity onPress={() => { setEditingCommentId(null); setCommentText(''); }} style={{ marginLeft: 8, padding: 6 }}>
              <IconSymbol name="close" size={16} color={mutedColor} />
            </TouchableOpacity>
          </View>
        ) : replyTo ? (
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
                setIsSubmittingLocal(true);
                // If editing a comment, call onEdit
                if (editingCommentId && typeof onEdit === 'function') {
                  await onEdit(editingCommentId, commentText.trim());
                  setEditingCommentId(null);
                  setCommentText('');
                } else {
                  setReplyTo(null);
                  // Optimistic UI: clear input immediately so user sees fast feedback
                  setCommentText('');
                  await onSubmit(replyTo ? Number(replyTo.id) : undefined);
                }
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

// Devuelve las iniciales (primera y última palabra) en mayúsculas. Ej: "Juan Pérez Gómez" -> "JG"
function getInitials(name: string): string {
  // Regla: devolver inicial del primer nombre y del primer apellido.
  // Para nombres con 1 palabra: usar primera letra.
  // Para 2 palabras: usar primera letra de cada una.
  // Para 3+ palabras: asumir que las últimas dos palabras son apellidos -> usar la penúltima como primer apellido.
  try {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    if (parts.length === 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    // 3 o más: tomar primera palabra y la penúltima (primer apellido)
    const first = parts[0].charAt(0).toUpperCase();
    const firstSurname = parts[parts.length - 2].charAt(0).toUpperCase();
    return `${first}${firstSurname}`;
  } catch (e) {
    return 'U';
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
  selectedCommentHighlight: { backgroundColor: '#fff7ed', borderRadius: 8, padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalInner: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 12, padding: 18, alignItems: 'stretch' },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  modalButton: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  modalButtonText: { fontSize: 15, fontWeight: '700' },
  modalCancelText: { color: '#6B7280', fontSize: 15, textAlign: 'center' },
});
