import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
    PanResponder,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Trade, getTradingViewImageUrl } from './ForecastCard';
import Avatar from './Avatar';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.85;

type Props = {
    visible: boolean;
    forecast: Trade | null;
    onClose: () => void;
    onLike: () => void;
    isLiked: boolean;
    currentUserId?: string;
    onUpdate?: () => void;
};

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
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editSymbol, setEditSymbol] = useState('');
    const [editMoneyValue, setEditMoneyValue] = useState('');
    const [editTradeType, setEditTradeType] = useState<'Buy' | 'Sell'>('Buy');
    const [editEntryPrice, setEditEntryPrice] = useState('');
    const [editExitPrice, setEditExitPrice] = useState('');
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    const fetchComments = useCallback(async () => {
        if (!forecast?.id) return;
        const { data, error } = await supabase
            .from('comments')
            .select('*, users(username, avatar_url)')
            .eq('trade_id', forecast.id)
            .order('created_at', { ascending: true });

        if (!error && data) setComments(data);
    }, [forecast?.id]);

    useEffect(() => {
        if (visible) {
            setEditContent(forecast?.notes || '');
            setEditSymbol(forecast?.symbol || '');
            setEditMoneyValue(forecast?.money_value?.toString() || '');
            setEditTradeType(forecast?.trade_type || 'Buy');
            setEditEntryPrice(forecast?.entry_price?.toString() || '');
            setEditExitPrice(forecast?.exit_price?.toString() || '');
            setIsEditing(false);
            fetchComments();
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: SHEET_H, duration: 260, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start();
        }
    }, [visible, fetchComments, forecast?.notes, forecast?.symbol, forecast?.money_value, forecast?.trade_type, forecast?.entry_price, forecast?.exit_price]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUserId || !forecast?.id) return;
        setSubmittingComment(true);
        const { error } = await supabase
            .from('comments')
            .insert({
                trade_id: forecast.id,
                user_id: currentUserId,
                content: newComment.trim()
            });

        if (error) {
            Alert.alert('Error', 'Could not post comment');
        } else {
            setNewComment('');
            fetchComments();
        }
        setSubmittingComment(false);
    };

    const handleUpdateTrade = async () => {
        if (!forecast?.id) return;
        const updateData: any = {
            notes: editContent.trim(),
            symbol: editSymbol.trim().toUpperCase() || forecast.symbol,
            money_value: editMoneyValue ? Number(editMoneyValue) : forecast.money_value,
            trade_type: editTradeType,
        };
        if (editEntryPrice) updateData.entry_price = Number(editEntryPrice);
        if (editExitPrice) updateData.exit_price = Number(editExitPrice);

        const { error } = await supabase
            .from('trades')
            .update(updateData)
            .eq('id', forecast.id);

        if (error) {
            Alert.alert('Error', 'Could not update trade');
        } else {
            setIsEditing(false);
            if (onUpdate) onUpdate();
            Alert.alert('Success', 'Trade updated');
        }
    };

    const handleDeleteTrade = async () => {
        if (!forecast?.id) return;
        Alert.alert('Delete Trade', 'Are you sure you want to delete this trade?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const { error } = await supabase.from('trades').delete().eq('id', forecast.id);
                    if (error) Alert.alert('Error', 'Could not delete trade');
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
    const isProfitable = (forecast.money_value || 0) >= 0;
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
                                    <Text style={styles.username}>{user?.username ?? 'Trader'}</Text>
                                    {user?.is_verified && <MaterialIcons name="verified" size={14} color="#F5C400" />}
                                </View>
                                <Text style={styles.timestamp}>{new Date(forecast.created_at).toLocaleDateString()}</Text>
                            </View>
                            {isOwner && (
                                <View style={styles.ownerActions}>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => setIsEditing(!isEditing)}>
                                        <FontAwesome name="edit" size={20} color="#4299E1" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconBtn} onPress={handleDeleteTrade}>
                                        <FontAwesome name="trash" size={20} color="#F56565" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {isEditing ? (
                            <View style={styles.editGrid}>
                                <View style={styles.editField}>
                                    <Text style={styles.editLabel}>Symbol</Text>
                                    <TextInput
                                        style={styles.editTextInput}
                                        value={editSymbol}
                                        onChangeText={setEditSymbol}
                                        placeholder="BTC, AAPL, etc."
                                    />
                                </View>
                                <View style={styles.editField}>
                                    <Text style={styles.editLabel}>P&L ($)</Text>
                                    <TextInput
                                        style={styles.editTextInput}
                                        value={editMoneyValue}
                                        onChangeText={setEditMoneyValue}
                                        keyboardType="decimal-pad"
                                        placeholder="0.00"
                                    />
                                </View>
                                <View style={styles.editField}>
                                    <Text style={styles.editLabel}>Type</Text>
                                    <View style={styles.typeButtonsRow}>
                                        <TouchableOpacity
                                            style={[styles.typeButton, editTradeType === 'Buy' && styles.typeButtonActive]}
                                            onPress={() => setEditTradeType('Buy')}
                                        >
                                            <Text style={[styles.typeButtonText, editTradeType === 'Buy' && styles.typeButtonTextActive]}>Buy</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.typeButton, editTradeType === 'Sell' && styles.typeButtonActive]}
                                            onPress={() => setEditTradeType('Sell')}
                                        >
                                            <Text style={[styles.typeButtonText, editTradeType === 'Sell' && styles.typeButtonTextActive]}>Sell</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.editField}>
                                    <Text style={styles.editLabel}>Entry ($)</Text>
                                    <TextInput
                                        style={styles.editTextInput}
                                        value={editEntryPrice}
                                        onChangeText={setEditEntryPrice}
                                        keyboardType="decimal-pad"
                                        placeholder="0.00"
                                    />
                                </View>
                                <View style={styles.editField}>
                                    <Text style={styles.editLabel}>Exit ($)</Text>
                                    <TextInput
                                        style={styles.editTextInput}
                                        value={editExitPrice}
                                        onChangeText={setEditExitPrice}
                                        keyboardType="decimal-pad"
                                        placeholder="0.00"
                                    />
                                </View>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateTrade}>
                                    <Text style={styles.saveBtnText}>Save All Changes</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={styles.statsRow}>
                                    <View style={styles.stat}>
                                        <Text style={styles.statLabel}>Symbol</Text>
                                        <Text style={styles.statValue}>{forecast.symbol}</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.stat}>
                                        <Text style={styles.statLabel}>Profit/Loss</Text>
                                        <Text style={[styles.statValue, { color: (forecast.money_value || 0) >= 0 ? '#059669' : '#dc2626' }]}>
                                            {(forecast.money_value || 0) >= 0 ? '+' : ''}${forecast.money_value?.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.detailsGrid}>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Type</Text>
                                        <Text style={[styles.detailValue, { color: forecast.trade_type === 'Buy' ? '#3182CE' : '#E53E3E' }]}>{forecast.trade_type || '—'}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Entry</Text>
                                        <Text style={styles.detailValue}>${forecast.entry_price || '—'}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Exit</Text>
                                        <Text style={styles.detailValue}>${forecast.exit_price || '—'}</Text>
                                    </View>
                                </View>
                            </>
                        )}

                        {(forecast.chart_image_url || forecast.tradingview_link) && (
                            <View style={styles.chartWrapper}>
                                <Image 
                                    source={{ 
                                        uri: getTradingViewImageUrl(forecast.chart_image_url || forecast.tradingview_link) || '' 
                                    }} 
                                    style={styles.chartImage} 
                                    resizeMode="contain" 
                                />
                            </View>
                        )}

                        <View style={styles.analysisBox}>
                            <Text style={styles.analysisTitle}>Trade Notes</Text>
                            {isEditing ? (
                                <View style={styles.editBox}>
                                    <TextInput
                                        style={styles.editInput}
                                        value={editContent}
                                        onChangeText={setEditContent}
                                        multiline
                                        autoFocus
                                    />
                                </View>
                            ) : (
                                <Text style={styles.analysisText}>{forecast.notes || 'No notes for this trade.'}</Text>
                            )}
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.commentsSection}>
                            <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
                            {comments.map((comment) => (
                                <View key={comment.id} style={styles.commentRow}>
                                    <Avatar url={comment.users?.avatar_url} username={comment.users?.username ?? '?'} size={32} />
                                    <View style={styles.commentContent}>
                                        <Text style={styles.commentUser}>{comment.users?.username ?? 'User'}</Text>
                                        <Text style={styles.commentText}>{comment.content}</Text>
                                    </View>
                                </View>
                            ))}
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
                            disabled={!newComment.trim() || submittingComment}
                        >
                            <FontAwesome name="send" size={18} color="#1a1a1a" />
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
    editGrid: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12 },
    editField: { gap: 6 },
    editLabel: { fontSize: 12, fontWeight: '700', color: '#666', textTransform: 'uppercase' },
    editTextInput: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#eee' },
    typeButtonsRow: { flexDirection: 'row', gap: 10 },
    typeButton: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f5f5f5', borderWidth: 1.5, borderColor: '#eee', alignItems: 'center' },
    typeButtonActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
    typeButtonText: { fontSize: 14, fontWeight: '700', color: '#666' },
    typeButtonTextActive: { color: '#F5C400' },
    detailsGrid: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginVertical: 10, gap: 20 },
    detailItem: { flex: 1 },
    detailLabel: { fontSize: 11, fontWeight: '800', color: '#A0AEC0', textTransform: 'uppercase' },
    detailValue: { fontSize: 15, fontWeight: '700', color: '#2D3748', marginTop: 4 },
    chartWrapper: {
        width: '100%',
        height: 250,
        borderRadius: 16,
        backgroundColor: '#f8fafc',
        marginVertical: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    chartImage: {
        width: '100%',
        height: '100%',
    },
    analysisBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 8 },
    analysisTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', textTransform: 'uppercase' },
    analysisText: { fontSize: 15, color: '#444', lineHeight: 23 },
    editBox: { gap: 12 },
    editInput: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 12, fontSize: 15, minHeight: 100 },
    saveBtn: { backgroundColor: '#F5C400', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
    saveBtnText: { fontWeight: '800', color: '#1a1a1a', fontSize: 15 },
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
