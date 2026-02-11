import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'installer';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: UserRole;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}

// Create a Supabase client for server components
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method is called from Server Components.
            // This can be ignored when middleware handles refresh.
          }
        },
      },
    }
  );
}

// Create an admin client (uses service role key, bypasses RLS)
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Get current user session
export async function getSession() {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  return session;
}

// Get current user with profile
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error getting profile:', profileError);
  }

  return {
    id: user.id,
    email: user.email!,
    profile: profile || null,
  };
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

// Check if user has admin role
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.profile?.role === 'admin';
}

// Check if user has a specific role
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.profile?.role === role;
}

// Get user role
export async function getUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();
  return user?.profile?.role || null;
}

// Create user profile after signup
export async function createUserProfile(
  userId: string,
  email: string,
  firstName?: string,
  lastName?: string,
  role: UserRole = 'installer'
): Promise<UserProfile | null> {
  const adminClient = createSupabaseAdminClient();

  const { data, error } = await adminClient
    .from('user_profiles')
    .insert({
      id: userId,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      role,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user profile:', error);
    return null;
  }

  return data;
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    return null;
  }

  return data;
}

// Get all users (admin only)
export async function getAllUsers(): Promise<UserProfile[]> {
  const adminClient = createSupabaseAdminClient();

  const { data, error } = await adminClient
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting all users:', error);
    return [];
  }

  return data || [];
}

// Get user by ID (admin only)
export async function getUserById(userId: string): Promise<UserProfile | null> {
  const adminClient = createSupabaseAdminClient();

  const { data, error } = await adminClient
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }

  return data;
}

// Update user role (admin only)
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<boolean> {
  const adminClient = createSupabaseAdminClient();

  const { error } = await adminClient
    .from('user_profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    return false;
  }

  return true;
}

// Delete user (admin only)
export async function deleteUser(userId: string): Promise<boolean> {
  const adminClient = createSupabaseAdminClient();

  // First delete from auth.users (this will cascade to user_profiles)
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    console.error('Error deleting user:', error);
    return false;
  }

  return true;
}

// Invite user by email (admin only)
export async function inviteUser(
  email: string,
  firstName?: string,
  lastName?: string,
  role: UserRole = 'installer'
): Promise<{ user: any; error: Error | null }> {
  const adminClient = createSupabaseAdminClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se';

  // Create user with invite
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      first_name: firstName,
      last_name: lastName,
      role,
    },
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (error) {
    return { user: null, error };
  }

  // Create profile
  if (data.user) {
    await createUserProfile(data.user.id, email, firstName, lastName, role);
  }

  return { user: data.user, error: null };
}

// Send password reset email
export async function sendPasswordReset(email: string): Promise<boolean> {
  const adminClient = createSupabaseAdminClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se';
  const { error } = await adminClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
  });

  if (error) {
    console.error('Error sending password reset:', error);
    return false;
  }

  return true;
}

// Set user password directly (admin only)
export async function setUserPassword(
  userId: string,
  newPassword: string
): Promise<boolean> {
  const adminClient = createSupabaseAdminClient();

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    console.error('Error setting user password:', error);
    return false;
  }

  return true;
}
