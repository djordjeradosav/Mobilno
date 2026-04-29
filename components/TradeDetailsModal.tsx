import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Forecast, getTradingViewImageUrl } from './ForecastCard';
import { supabase } from '@/lib/supabase';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.9;

type Comment = {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    users: {
        username: string;
        avatar_url: string | null;
    };
};

type Props = {
    visible: boolean;
    forecast: Forecast | null;
    onClose: () => void;
    onLike: (id: string) => void;
    isLiked: boolean;
    currentUserId?: string;
    onUpdate?: () => void;
};

function Avatar({ url, username, size = 32 }: { url?: string | null; username: string; size?: number }) {
    if (url) {
        return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F5C400', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: size * 0.4, fontWeight: '800', color: '#1a1a1a' }}>
                {username?.[0]?.toUpperCase() ?? '?'}
            </Text>
        </View>
    );
}

export default function TradeDetailsModal({
    visible,
    forecast,
    onClose,
    onLike,
    isLiked,
    currentUserId,
    onUpdate,
}: Props) {
    const slideAnim = useRef(new Animated.Value(SHEET_H)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    const fetchComments = useCallback(async () => {
        if (!forecast?.id) return;
        setLoadingComments(true);
        const { data, error } = await supabase
            .from('comments')
            .select('*, users(username, avatar_url)')
            .eq('forecast_id', forecast.id)
            .order('created_at', { ascending: true });

        if (error) console.error('[fetchComments]', error.message);
        if (data) setComments(data as Comment[]);
        setLoadingComments(false);
    }, [forecast?.id]);

    useEffect(() => {
        if (visible) {
            fetchComments();
            setEditContent(forecast?.content || '');
            setIsEditing(false);
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: SHEET_H, duration: 260, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start();
        }
    }, [visible, fetchComments, forecast?.content]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUserId || !forecast?.id) return;
        setSubmittingComment(true);
        const { error } = await supabase
            .from('comments')
            .insert({
                forecast_id: forecast.id,
                user_id: currentUserId,
                content: newComment.trim()
            });

        if (error) {
            Alert.alert('Error', 'Could not post comment');
        } else {
            setNewComment('');
            fetchComments();
            await supabase.rpc('increment_comments', { forecast_id: forecast.id });
        }
        setSubmittingComment(false);
    };

    const handleUpdateForecast = async () => {
        if (!forecast?.id || !editContent.trim()) return;
        const { error } = await supabase
            .from('forecasts')
            .update({ content: editContent.trim() })
            .eq('id', forecast.id);

        if (error) {
            Alert.alert('Error', 'Could not update forecast');
        } else {
            setIsEditing(false);
            if (onUpdate) onUpdate();
            Alert.alert('Success', 'Forecast updated');
        }
    };

    const handleDeleteForecast = async () => {
        if (!forecast?.id) return;
        Alert.alert('Delete Forecast', 'Are you sure you want to delete this post?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const { error } = await supabase.from('forecasts').delete().eq('id', forecast.id);
                    if (error) Alert.alert('Error', 'Could not delete forecast');
                    else {
                        onClose();
                        if (onUpdate) onUpdate();
                    }
                }
            }
        ]);
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, { dy }) => dy > 10,
            onPanResponderMove: (_, { dy }) => { if (dy > 0) slideAnim.setValue(dy); },
            onPanResponderRelease: (_, { dy, vy }) => {
                if (dy > 120 || vy > 1.2) onClose();
                else Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
            },
        })
    ).current;

    if (!forecast) return null;

    const user = forecast.users;
    const isProfitable = forecast.profit >= 0;
    const isOwner = currentUserId === forecast.user_id;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
            </Animated.View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1, justifyContent: 'flex-end' }}
            >
                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View {...panResponder.panHandlers} style={styles.handleArea}>
                        <View style={styles.handle} />
                    </View>

                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.header}>
                            <Avatar url={user?.avatar_url} username={user?.username ?? '?'} size={44} />
                            <View style={styles.headerInfo}>
                                <View style={styles.usernameRow}>
                                    <Text style={styles.username}>@{user?.username ?? 'unknown'}</Text>
                                    {user?.is_verified && <MaterialIcons name="verified" size={16} color="#F5C400" />}
                                </View>
                                <Text style={styles.timestamp}>{new Date(forecast.created_at).toLocaleString()}</Text>
                            </View>
                            {isOwner && (
                                <View style={styles.ownerActions}>
                                    <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.iconBtn}>
                                        <FontAwesome name="edit" size={18} color="#666" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleDeleteForecast} style={styles.iconBtn}>
                                        <FontAwesome name="trash-o" size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.stat}>
                                <Text style={styles.statLabel}>Pair</Text>
                                <Text style={styles.statValue}>{forecast.currency_pair}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.stat}>
                                <Text style={styles.statLabel}>Return</Text>
                                <Text style={[styles.statValue, { color: isProfitable ? '#059669' : '#dc2626' }]}>
                                    {isProfitable ? '+' : ''}{forecast.profit.toFixed(2)}%
                                </Text>
                            </View>
                        </View>

                        {forecast.chart_image_url && (
                            <Image 
                                source={{ uri: getTradingViewImageUrl(forecast.chart_image_url) || '' }} 
                                style={styles.chartImage} 
                                resizeMode="contain" 
                            />
                        )}

                        <View style={styles.analysisBox}>
                            <Text style={styles.analysisTitle}>Analysis</Text>
                            {isEditing ? (
                                <View style={styles.editBox}>
                                    <TextInput
                                        style={styles.editInput}
                                        value={editContent}
                                        onChangeText={setEditContent}
                                        multiline
                                    />
                                    <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateForecast}>
                                        <Text style={styles.saveBtnText}>Save Changes</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <Text style={styles.analysisText}>{forecast.content}</Text>
                            )}
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.commentsSection}>
                            <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
                            {loadingComments ? (
                                <ActivityIndicator color="#F5C400" style={{ marginVertical: 20 }} />
                            ) : (
                                comments.map((c) => (
                                    <View key={c.id} style={styles.commentRow}>
                                        <Avatar url={c.users.avatar_url} username={c.users.username} size={32} />
                                        <View style={styles.commentContent}>
                                            <Text style={styles.commentUser}>@{c.users.username}</Text>
                                            <Text style={styles.commentText}>{c.content}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </ScrollView>

                    <View style={styles.commentInputArea}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Add a comment..."
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, !newComment.trim() && { opacity: 0.5 }]}
                            onPress={handleAddComment}
                            disabled={submittingComment || !newComment.trim()}
                        >
                            {submittingComment ? <ActivityIndicator size="small" color="#1a1a1a" /> : <FontAwesome name="send" size={18} color="#1a1a1a" />}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: { backgroundColor: '#FAFAF8', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', height: SHEET_H },
    handleArea: { paddingVertical: 14, alignItems: 'center' },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd' },
    content: { padding: 20, paddingBottom: 100, gap: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerInfo: { flex: 1, gap: 3 },
    usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    username: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
    timestamp: { fontSize: 12, color: '#aaa' },
    ownerActions: { flexDirection: 'row', gap: 12 },
    iconBtn: { padding: 8 },
    statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center' },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statLabel: { fontSize: 11, color: '#aaa', fontWeight: '600' },
    statValue: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
    statDivider: { width: 1, height: 36, backgroundColor: '#eee' },
    chartImage: { width: '100%', height: 240, borderRadius: 16, backgroundColor: '#f5f5f5' },
    analysisBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 8 },
    analysisTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', textTransform: 'uppercase' },
    analysisText: { fontSize: 15, color: '#444', lineHeight: 23 },
    editBox: { gap: 12 },
    editInput: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 12, fontSize: 15, minHeight: 100 },
    saveBtn: { backgroundColor: '#F5C400', borderRadius: 12, padding: 12, alignItems: 'center' },
    saveBtnText: { fontWeight: '800', color: '#1a1a1a' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
    commentsSection: { gap: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
    commentRow: { flexDirection: 'row', gap: 12 },
    commentContent: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10 },
    commentUser: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
    commentText: { fontSize: 14, color: '#444', lineHeight: 20 },
    commentInputArea: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', gap: 12 },
    commentInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5C400', alignItems: 'center', justifyContent: 'center' },
});