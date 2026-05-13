import { supabase } from './supabase';

export type Comment = {
    id: string;
    trade_id: string;
    user_id: string;
    content: string;
    created_at: string;
    users?: {
        username: string;
        avatar_url: string | null;
        is_verified: boolean;
    };
};

export async function listComments(tradeId: string): Promise<Comment[]> {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*, users(username, avatar_url, is_verified)')
            .eq('trade_id', tradeId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[listComments] Error:', error.message);
            return [];
        }
        return (data ?? []) as Comment[];
    } catch (err) {
        console.error('[listComments] Unexpected error:', err);
        return [];
    }
}

export async function addComment(
    tradeId: string,
    userId: string,
    content: string
): Promise<Comment | null> {
    try {
        const { data, error } = await supabase
            .from('comments')
            .insert({
                trade_id: tradeId,
                user_id: userId,
                content: content.trim()
            })
            .select('*, users(username, avatar_url, is_verified)')
            .single();

        if (error) {
            console.error('[addComment] Error:', error.message);
            return null;
        }
        return data as Comment;
    } catch (err) {
        console.error('[addComment] Unexpected error:', err);
        return null;
    }
}

export async function deleteComment(commentId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            console.error('[deleteComment] Error:', error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[deleteComment] Unexpected error:', err);
        return false;
    }
}