import { supabase } from './supabase';

export type Comment = {
    id: string;
    forecast_id: string;
    user_id: string;
    content: string;
    created_at: string;
    users?: {
        username: string;
        avatar_url: string | null;
        is_verified: boolean;
    };
};

export async function listComments(forecastId: string): Promise<Comment[]> {
    const { data, error } = await supabase
        .from('comments')
        .select('*, users(username, avatar_url, is_verified)')
        .eq('forecast_id', forecastId)
        .order('created_at', { ascending: false });
    if (error) {
        console.warn('[listComments]', error.message);
        return [];
    }
    return (data ?? []) as Comment[];
}

export async function addComment(
    forecastId: string,
    userId: string,
    content: string
): Promise<Comment | null> {
    const { data, error } = await supabase
        .from('comments')
        .insert({ forecast_id: forecastId, user_id: userId, content })
        .select('*, users(username, avatar_url, is_verified)')
        .single();
    if (error) {
        console.warn('[addComment]', error.message);
        return null;
    }
    return data as Comment;
}

export async function deleteComment(commentId: string): Promise<boolean> {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
        console.warn('[deleteComment]', error.message);
        return false;
    }
    return true;
}
