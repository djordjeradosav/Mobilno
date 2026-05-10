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
    onLike: (id: string) => void;
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
            .select('*, users(username, avatar_url, is_verified)')
            .eq('forecast_id', forecast.id)
            .order('created_at', { ascending: false });

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
                forecast_id: forecast.id,
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
            content: editContent.trim(),
            currency_pair: editSymbol.trim().toUpperCase() || forecast.currency_pair,
            profit: editMoneyValue ? Number(editMoneyValue) : forecast.profit,
        };

        const { error } = await supabase
            .from('forecasts')
            .update(updateData)
            .eq('id', forecast.id);

        if (error) {
            Alert.alert('Error', 'Could not update forecast');
        } else {
            setIsEditing(false);
            if (onUpdate) onUpdate();
            Alert.alert('Success', 'Forecast updated');
        }
    };

    const handleDeleteTrade = async () => {
        if (!forecast?.id) return;
        Alert.alert('Delete Forecast', 'Are you sure you want to delete this forecast?', [
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
                                    <Text style={styles.saveBtnText}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={styles.mainInfo}>
                                    <View style={styles.pairRow}>
                                        <Text style={styles.pairText}>{forecast.symbol || forecast.currency_pair}</Text>
                                        <View style={[styles.typeBadge, { backgroundColor: isProfitable ? '#E6FFFA' : '#FFF5F5' }]}>
                                            <Text style={[styles.typeText, { color: isProfitable ? '#319795' : '#E53E3E' }]}>
                                                {isProfitable ? 'PROFIT' : 'LOSS'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.profitText}>
                                        {isProfitable ? '+' : ''}{forecast.money_value || forecast.profit || 0}$
                                    </Text>
                                </View>

                                <View style={styles.detailsGrid}>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Type</Text>
                                        <Text style={styles.detailValue}>{forecast.trade_type || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Entry</Text>
                                        <Text style={styles.detailValue}>${forecast.entry_price || '0.00'}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Exit</Text>
                                        <Text style={styles.detailValue}>${forecast.exit_price || '0.00'}</Text>
                                    </View>
                                </View>

                                {forecast.notes || forecast.content ? (
                                    <View style={styles.notesSection}>
                                        <Text style={styles.sectionLabel}>Analysis</Text>
                                        <Text style={styles.notesText}>{forecast.notes || forecast.content}</Text>
                                    </View>
                                ) : null}

                                {forecast.tradingview_link || forecast.chart_image_url ? (
                                    <View style={styles.chartSection}>
                                        <Text style={styles.sectionLabel}>Chart</Text>
                                        <Image
                                            source={{ uri: getTradingViewImageUrl(forecast.tradingview_link || forecast.chart_image_url || '') || '' }}
                                            style={styles.chartImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                ) : null}
                            </>
                        )}

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, isLiked && styles.actionBtnActive]}
                                onPress={() => onLike(forecast.id)}
                            >
                                <FontAwesome name={isLiked ? "heart" : "heart-o"} size={20} color={isLiked ? "#E53E3E" : "#4A5568"} />
                                <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                                    {forecast.likes_count || 0}
                                </Text>
                            </TouchableOpacity>
                            <View style={styles.actionBtn}>
                                <FontAwesome name="comment-o" size={20} color="#4A5568" />
                                <Text style={styles.actionText}>{comments.length}</Text>
                            </View>
                        </View>

                        <View style={styles.commentsSection}>
                            <Text style={styles.sectionLabel}>Comments</Text>
                            <View style={styles.commentInputRow}>
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
                                    <MaterialIcons name="send" size={24} color="#F5C400" />
                                </TouchableOpacity>
                            </View>

                            {comments.map((comment) => (
                                <View key={comment.id} style={styles.commentItem}>
                                    <Avatar url={comment.users?.avatar_url} username={comment.users?.username ?? '?'} size={32} />
                                    <View style={styles.commentContent}>
                                        <View style={styles.commentHeader}>
                                            <Text style={styles.commentUser}>{comment.users?.username}</Text>
                                            <Text style={styles.commentTime}>{new Date(comment.created_at).toLocaleDateString()}</Text>
                                        </View>
                                        <Text style={styles.commentText}>{comment.content}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: SHEET_H, overflow: 'hidden' },
    handleArea: { height: 32, alignItems: 'center', justifyContent: 'center' },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' },
    content: { padding: 24, paddingBottom: 100 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    headerInfo: { flex: 1, marginLeft: 12 },
    usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    username: { fontSize: 16, fontWeight: '700', color: '#1A202C' },
    timestamp: { fontSize: 12, color: '#718096', marginTop: 2 },
    ownerActions: { flexDirection: 'row', gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7FAFC', alignItems: 'center', justifyContent: 'center' },
    mainInfo: { marginBottom: 24 },
    pairRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    pairText: { fontSize: 28, fontWeight: '800', color: '#1A202C' },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    typeText: { fontSize: 10, fontWeight: '800' },
    profitText: { fontSize: 36, fontWeight: '900', color: '#1A202C' },
    detailsGrid: { flexDirection: 'row', backgroundColor: '#F7FAFC', borderRadius: 20, padding: 20, marginBottom: 24 },
    detailItem: { flex: 1 },
    detailLabel: { fontSize: 12, color: '#718096', marginBottom: 4, fontWeight: '600' },
    detailValue: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
    notesSection: { marginBottom: 24 },
    sectionLabel: { fontSize: 14, fontWeight: '800', color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    notesText: { fontSize: 16, color: '#4A5568', lineHeight: 24 },
    chartSection: { marginBottom: 24 },
    chartImage: { width: '100%', height: 200, borderRadius: 16, backgroundColor: '#F7FAFC' },
    actions: { flexDirection: 'row', gap: 16, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EDF2F7', marginBottom: 24 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F7FAFC', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    actionBtnActive: { backgroundColor: '#FFF5F5' },
    actionText: { fontSize: 14, fontWeight: '700', color: '#4A5568' },
    actionTextActive: { color: '#E53E3E' },
    commentsSection: {},
    commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    commentInput: { flex: 1, backgroundColor: '#F7FAFC', borderRadius: 16, padding: 12, fontSize: 14, maxHeight: 100 },
    sendBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    commentItem: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    commentContent: { flex: 1 },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    commentUser: { fontSize: 14, fontWeight: '700', color: '#2D3748' },
    commentTime: { fontSize: 12, color: '#A0AEC0' },
    commentText: { fontSize: 14, color: '#4A5568', lineHeight: 20 },
    editGrid: { gap: 16 },
    editField: { gap: 8 },
    editLabel: { fontSize: 12, fontWeight: '700', color: '#718096' },
    editTextInput: { backgroundColor: '#F7FAFC', borderRadius: 12, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    typeButtonsRow: { flexDirection: 'row', gap: 12 },
    typeButton: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#F7FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    typeButtonActive: { backgroundColor: '#F5C400', borderColor: '#F5C400' },
    typeButtonText: { fontSize: 14, fontWeight: '700', color: '#718096' },
    typeButtonTextActive: { color: '#1A202C' },
    saveBtn: { backgroundColor: '#F5C400', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    saveBtnText: { fontSize: 16, fontWeight: '800', color: '#1A202C' },
});
