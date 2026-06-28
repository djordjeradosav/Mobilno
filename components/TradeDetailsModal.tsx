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
    ActivityIndicator,
} from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/ThemeContext';
import Colors from '@/constants/Colors';
import { Trade, getTradingViewImageUrl } from './ForecastCard';
import Avatar from './Avatar';
import { syncUserToSupabase } from '@/lib/syncUser';
import { useAuth } from '@/lib/auth';
import { updateTradeImage, deleteTradeImage } from '@/lib/updateTradeImage';

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
    const { colorScheme } = useTheme();
    const C = Colors[colorScheme];

    const slideAnim = useRef(new Animated.Value(SHEET_H)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editSymbol, setEditSymbol] = useState('');
    const [editMoneyValue, setEditMoneyValue] = useState('');
    const [editTradeType, setEditTradeType] = useState<'Buy' | 'Sell'>('Buy');
    const [editEntryPrice, setEditEntryPrice] = useState('');
    const [editExitPrice, setEditExitPrice] = useState('');
    const [editImageUri, setEditImageUri] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    const fetchComments = useCallback(async () => {
        if (!forecast?.id) return;
        const { data, error } = await supabase
            .from('comments')
            .select('*, users!comments_user_id_fkey(username, avatar_url, is_verified)')
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
            setEditImageUri(null);
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

    const { user: authUser } = useAuth();

    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUserId || !forecast?.id) return;
        setSubmittingComment(true);

        if (authUser) {
            try {
                await syncUserToSupabase(authUser.id, authUser.email?.split('@')[0] || 'trader', authUser.email || '');
            } catch (e) {
                console.error('User sync failed', e);
            }
        }

        const { error } = await supabase
            .from('comments')
            .insert({
                trade_id: forecast.id,
                user_id: currentUserId,
                content: newComment.trim()
            });

        if (error) {
            Alert.alert('Error', `Could not post comment: ${error.message}`);
        } else {
            await supabase.rpc('increment_comments', { trade_id: forecast.id });
            setNewComment('');
            fetchComments();
            if (onUpdate) onUpdate();
        }
        setSubmittingComment(false);
    };

    const pickEditImage = async () => {
        if (Platform.OS !== 'web') {
            const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!granted) return Alert.alert('Error', 'Permission needed.');
        }
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8
        });
        if (!res.canceled) setEditImageUri(res.assets[0].uri);
    };

    const handleUpdateTradeImage = async () => {
        if (!editImageUri || !forecast?.id || !currentUserId) return;
        setUploadingImage(true);
        const newImageUrl = await updateTradeImage(forecast.id, editImageUri, currentUserId);
        setUploadingImage(false);
        if (newImageUrl) {
            setEditImageUri(null);
            if (onUpdate) onUpdate();
            Alert.alert('Success', 'Chart image updated');
        } else {
            Alert.alert('Error', 'Could not update chart image');
        }
    };

    const handleDeleteTradeImage = async () => {
        if (!forecast?.id) return;
        Alert.alert('Delete Chart', 'Remove this chart image?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const success = await deleteTradeImage(forecast.id);
                    if (success) {
                        if (onUpdate) onUpdate();
                        Alert.alert('Success', 'Chart image deleted');
                    } else {
                        Alert.alert('Error', 'Could not delete chart image');
                    }
                }
            }
        ]);
    };

    const handleUpdateTrade = async () => {
        if (!forecast?.id) return;
        const updateData: any = {
            notes: editContent.trim(),
            symbol: editSymbol.trim().toUpperCase(),
            money_value: editMoneyValue ? Number(editMoneyValue) : forecast.money_value,
            trade_type: editTradeType,
            entry_price: editEntryPrice ? Number(editEntryPrice) : null,
            exit_price: editExitPrice ? Number(editExitPrice) : null,
        };

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
                <Animated.View style={[
                    styles.sheet,
                    {
                        transform: [{ translateY: slideAnim }],
                        backgroundColor: C.background
                    }
                ]}>
                    <View {...panResponder.panHandlers} style={styles.handleArea}>
                        <View style={[styles.handle, { backgroundColor: C.border }]} />
                    </View>

                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.header}>
                            <Avatar url={user?.avatar_url} username={user?.username ?? '?'} size={44} />
                            <View style={styles.headerInfo}>
                                <View style={styles.usernameRow}>
                                    <Text style={[styles.username, { color: C.text }]}>{user?.username ?? 'Trader'}</Text>
                                    {user?.is_verified && <MaterialIcons name="verified" size={14} color={C.accent} />}
                                </View>
                                <Text style={[styles.timestamp, { color: C.textMuted }]}>{new Date(forecast.created_at).toLocaleDateString()}</Text>
                            </View>
                            {isOwner && (
                                <View style={styles.ownerActions}>
                                    <TouchableOpacity style={[styles.iconBtn, { backgroundColor: C.surface }]} onPress={() => setIsEditing(!isEditing)}>
                                        <FontAwesome name="edit" size={20} color="#4299E1" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.iconBtn, { backgroundColor: C.surface }]} onPress={handleDeleteTrade}>
                                        <FontAwesome name="trash" size={20} color={C.danger} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {isEditing ? (
                            <View style={styles.editGrid}>
                                <View style={styles.editField}>
                                    <Text style={[styles.editLabel, { color: C.textMuted }]}>Symbol</Text>
                                    <TextInput
                                        style={[styles.editTextInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
                                        value={editSymbol}
                                        onChangeText={setEditSymbol}
                                        placeholderTextColor={C.placeholder}
                                        placeholder="BTC, AAPL, etc."
                                    />
                                </View>
                                <View style={styles.editField}>
                                    <Text style={[styles.editLabel, { color: C.textMuted }]}>P&L ($)</Text>
                                    <TextInput
                                        style={[styles.editTextInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
                                        value={editMoneyValue}
                                        onChangeText={setEditMoneyValue}
                                        keyboardType="decimal-pad"
                                        placeholderTextColor={C.placeholder}
                                        placeholder="0.00"
                                    />
                                </View>
                                <View style={styles.editField}>
                                    <Text style={[styles.editLabel, { color: C.textMuted }]}>Type</Text>
                                    <View style={styles.typeButtonsRow}>
                                        <TouchableOpacity
                                            style={[styles.typeButton, { backgroundColor: C.surface, borderColor: C.border }, editTradeType === 'Buy' && { backgroundColor: C.accent, borderColor: C.accent }]}
                                            onPress={() => setEditTradeType('Buy')}
                                        >
                                            <Text style={[styles.typeButtonText, { color: C.textMuted }, editTradeType === 'Buy' && { color: C.textInverse }]}>Buy</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.typeButton, { backgroundColor: C.surface, borderColor: C.border }, editTradeType === 'Sell' && { backgroundColor: C.accent, borderColor: C.accent }]}
                                            onPress={() => setEditTradeType('Sell')}
                                        >
                                            <Text style={[styles.typeButtonText, { color: C.textMuted }, editTradeType === 'Sell' && { color: C.textInverse }]}>Sell</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.editField}>
                                    <Text style={[styles.editLabel, { color: C.textMuted }]}>Entry ($)</Text>
                                    <TextInput
                                        style={[styles.editTextInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
                                        value={editEntryPrice}
                                        onChangeText={setEditEntryPrice}
                                        keyboardType="decimal-pad"
                                        placeholderTextColor={C.placeholder}
                                        placeholder="0.00"
                                    />
                                </View>
                                <View style={styles.editField}>
                                    <Text style={[styles.editLabel, { color: C.textMuted }]}>Exit ($)</Text>
                                    <TextInput
                                        style={[styles.editTextInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
                                        value={editExitPrice}
                                        onChangeText={setEditExitPrice}
                                        keyboardType="decimal-pad"
                                        placeholderTextColor={C.placeholder}
                                        placeholder="0.00"
                                    />
                                </View>
                                <View style={styles.imageEditSection}>
                                    <Text style={[styles.editLabel, { color: C.textMuted }]}>Chart Image</Text>
                                    {editImageUri ? (
                                        <View style={styles.imagePreview}>
                                            <Image source={{ uri: editImageUri }} style={styles.previewImage} />
                                            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setEditImageUri(null)}>
                                                <FontAwesome name="times" size={14} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity style={[styles.pickImageBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={pickEditImage}>
                                            <FontAwesome name="picture-o" size={20} color={C.iconDefault} />
                                            <Text style={[styles.pickImageText, { color: C.textMuted }]}>Choose new chart</Text>
                                        </TouchableOpacity>
                                    )}
                                    {editImageUri && (
                                        <TouchableOpacity style={[styles.uploadImageBtn, { backgroundColor: C.accent }, uploadingImage && { opacity: 0.6 }]} onPress={handleUpdateTradeImage} disabled={uploadingImage}>
                                            {uploadingImage ? (
                                                <ActivityIndicator color={C.textInverse} />
                                            ) : (
                                                <Text style={[styles.uploadImageBtnText, { color: C.textInverse }]}>Upload New Chart</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    {forecast.chart_image_url && !editImageUri && (
                                        <TouchableOpacity style={[styles.deleteImageBtn, { backgroundColor: 'rgba(246,70,93,0.12)' }]} onPress={handleDeleteTradeImage}>
                                            <FontAwesome name="trash" size={16} color={C.danger} />
                                            <Text style={[styles.deleteImageBtnText, { color: C.danger }]}>Remove Current Chart</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.accent }]} onPress={handleUpdateTrade}>
                                    <Text style={[styles.saveBtnText, { color: C.textInverse }]}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={styles.mainInfo}>
                                    <View style={styles.pairRow}>
                                        <Text style={[styles.pairText, { color: C.text }]}>{forecast.symbol || forecast.currency_pair}</Text>
                                        <View style={[styles.typeBadge, { backgroundColor: isProfitable ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)' }]}>
                                            <Text style={[styles.typeText, { color: isProfitable ? C.success : C.danger }]}>
                                                {isProfitable ? 'PROFIT' : 'LOSS'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.profitText, { color: isProfitable ? C.success : C.danger }]}>
                                        {isProfitable ? '+' : ''}{forecast.money_value || forecast.profit || 0}$
                                    </Text>
                                </View>

                                <View style={[styles.detailsGrid, { backgroundColor: C.surface }]}>
                                    <View style={styles.detailItem}>
                                        <Text style={[styles.detailLabel, { color: C.textMuted }]}>Type</Text>
                                        <Text style={[styles.detailValue, { color: C.text }]}>{forecast.trade_type || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={[styles.detailLabel, { color: C.textMuted }]}>Entry</Text>
                                        <Text style={[styles.detailValue, { color: C.text }]}>${forecast.entry_price || '0.00'}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={[styles.detailLabel, { color: C.textMuted }]}>Exit</Text>
                                        <Text style={[styles.detailValue, { color: C.text }]}>${forecast.exit_price || '0.00'}</Text>
                                    </View>
                                </View>

                                {forecast.notes ? (
                                    <View style={styles.notesSection}>
                                        <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Analysis</Text>
                                        <Text style={[styles.notesText, { color: C.textSecondary }]}>{forecast.notes}</Text>
                                    </View>
                                ) : null}

                                {forecast.chart_image_url ? (
                                    <View style={styles.chartSection}>
                                        <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Chart</Text>
                                        <Image
                                            source={{ uri: getTradingViewImageUrl(forecast.chart_image_url) || '' }}
                                            style={[styles.chartImage, { backgroundColor: C.surface }]}
                                            resizeMode="cover"
                                        />
                                    </View>
                                ) : null}
                            </>
                        )}

                        <View style={[styles.actions, { borderColor: C.divider }]}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: C.surface }, isLiked && { backgroundColor: 'rgba(246,70,93,0.12)' }]}
                                onPress={() => onLike(forecast.id)}
                            >
                                <FontAwesome name={isLiked ? "heart" : "heart-o"} size={20} color={isLiked ? C.danger : C.iconDefault} />
                                <Text style={[styles.actionText, { color: C.textSecondary }, isLiked && { color: C.danger }]}>
                                    {forecast.likes_count || 0}
                                </Text>
                            </TouchableOpacity>
                            <View style={[styles.actionBtn, { backgroundColor: C.surface }]}>
                                <FontAwesome name="comment-o" size={20} color={C.iconDefault} />
                                <Text style={[styles.actionText, { color: C.textSecondary }]}>{comments.length}</Text>
                            </View>
                        </View>

                        <View style={styles.commentsSection}>
                            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Comments</Text>
                            <View style={styles.commentInputRow}>
                                <TextInput
                                    style={[styles.commentInput, { backgroundColor: C.surface, color: C.text }]}
                                    placeholder="Add a comment..."
                                    placeholderTextColor={C.placeholder}
                                    value={newComment}
                                    onChangeText={setNewComment}
                                    multiline
                                />
                                <TouchableOpacity
                                    style={[styles.sendBtn, !newComment.trim() && { opacity: 0.5 }]}
                                    onPress={handleAddComment}
                                    disabled={!newComment.trim() || submittingComment}
                                >
                                    <MaterialIcons name="send" size={24} color={C.accent} />
                                </TouchableOpacity>
                            </View>

                            {comments.map((comment) => (
                                <View key={comment.id} style={styles.commentItem}>
                                    <Avatar url={comment.users?.avatar_url} username={comment.users?.username ?? '?'} size={32} />
                                    <View style={styles.commentContent}>
                                        <View style={styles.commentHeader}>
                                            <Text style={[styles.commentUser, { color: C.text }]}>{comment.users?.username}</Text>
                                            <Text style={[styles.commentTime, { color: C.textMuted }]}>{new Date(comment.created_at).toLocaleDateString()}</Text>
                                        </View>
                                        <Text style={[styles.commentText, { color: C.textSecondary }]}>{comment.content}</Text>
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
    sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, height: SHEET_H, overflow: 'hidden' },
    handleArea: { height: 32, alignItems: 'center', justifyContent: 'center' },
    handle: { width: 40, height: 4, borderRadius: 2 },
    content: { padding: 24, paddingBottom: 100 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    headerInfo: { flex: 1, marginLeft: 12 },
    usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    username: { fontSize: 16, fontWeight: '700' },
    timestamp: { fontSize: 12, marginTop: 2 },
    ownerActions: { flexDirection: 'row', gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    mainInfo: { marginBottom: 24 },
    pairRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    pairText: { fontSize: 28, fontWeight: '800' },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    typeText: { fontSize: 10, fontWeight: '800' },
    profitText: { fontSize: 36, fontWeight: '900' },
    detailsGrid: { flexDirection: 'row', borderRadius: 20, padding: 20, marginBottom: 24 },
    detailItem: { flex: 1 },
    detailLabel: { fontSize: 12, marginBottom: 4, fontWeight: '600' },
    detailValue: { fontSize: 16, fontWeight: '700' },
    notesSection: { marginBottom: 24 },
    sectionLabel: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    notesText: { fontSize: 16, lineHeight: 24 },
    chartSection: { marginBottom: 24 },
    chartImage: { width: '100%', height: 220, borderRadius: 12 },
    actions: { flexDirection: 'row', gap: 16, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 24 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    actionText: { fontSize: 14, fontWeight: '700' },
    commentsSection: {},
    commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    commentInput: { flex: 1, borderRadius: 16, padding: 12, fontSize: 14, maxHeight: 100 },
    sendBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    commentItem: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    commentContent: { flex: 1 },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    commentUser: { fontSize: 14, fontWeight: '700' },
    commentTime: { fontSize: 12 },
    commentText: { fontSize: 14, lineHeight: 20 },
    editGrid: { gap: 16 },
    editField: { gap: 8 },
    editLabel: { fontSize: 12, fontWeight: '700' },
    editTextInput: { borderRadius: 12, padding: 12, fontSize: 16, borderWidth: 1 },
    typeButtonsRow: { flexDirection: 'row', gap: 12 },
    typeButton: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    typeButtonText: { fontSize: 14, fontWeight: '700' },
    imageEditSection: { gap: 8, marginTop: 8 },
    imagePreview: { borderRadius: 12, overflow: 'hidden', position: 'relative' },
    previewImage: { width: '100%', height: 160, backgroundColor: 'rgba(0,0,0,0.05)' },
    removeImageBtn: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
    pickImageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, paddingVertical: 16, borderWidth: 1.5, borderStyle: 'dashed' },
    pickImageText: { fontSize: 14, fontWeight: '600' },
    uploadImageBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    uploadImageBtnText: { fontSize: 14, fontWeight: '700' },
    deleteImageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, marginTop: 8 },
    deleteImageBtnText: { fontSize: 14, fontWeight: '700' },
    saveBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    saveBtnText: { fontSize: 16, fontWeight: '800' },
});