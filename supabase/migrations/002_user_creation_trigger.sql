-- 7P Education Platform - User Auto-Creation Trigger
-- This migration fixes the profile fetch error by automatically creating
-- users in the custom users table when they sign up via Supabase Auth

-- Function to handle new user creation from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_domain TEXT;
    org_id UUID;
BEGIN
    -- Extract domain from email
    user_domain := SPLIT_PART(NEW.email, '@', 2);
    
    -- Try to find organization by domain
    SELECT id INTO org_id
    FROM public.organizations
    WHERE domain = user_domain
    LIMIT 1;
    
    -- Insert new user into public.users table
    INSERT INTO public.users (
        id,
        email,
        name,
        avatar_url,
        organization_id,
        email_verified,
        created_at,
        updated_at,
        last_login,
        metadata
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        org_id,
        NEW.email_confirmed_at IS NOT NULL,
        NEW.created_at,
        NEW.updated_at,
        NEW.last_sign_in_at,
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        email_verified = EXCLUDED.email_verified,
        updated_at = EXCLUDED.updated_at,
        last_login = EXCLUDED.last_login,
        metadata = EXCLUDED.metadata;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users for INSERT and UPDATE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to be more permissive for user creation
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- More robust RLS policies
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow user profile creation" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.users TO authenticated;
GRANT SELECT ON public.organizations TO authenticated, anon;

-- Create function to manually sync existing auth users if needed
CREATE OR REPLACE FUNCTION public.sync_auth_users()
RETURNS INTEGER AS $$
DECLARE
    sync_count INTEGER := 0;
    user_record RECORD;
    user_domain TEXT;
    org_id UUID;
BEGIN
    -- Loop through auth.users that don't exist in public.users
    FOR user_record IN 
        SELECT au.* 
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    LOOP
        -- Extract domain from email
        user_domain := SPLIT_PART(user_record.email, '@', 2);
        
        -- Try to find organization by domain
        SELECT id INTO org_id
        FROM public.organizations
        WHERE domain = user_domain
        LIMIT 1;
        
        -- Insert user
        INSERT INTO public.users (
            id,
            email,
            name,
            avatar_url,
            organization_id,
            email_verified,
            created_at,
            updated_at,
            last_login,
            metadata
        ) VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'name', user_record.raw_user_meta_data->>'full_name', SPLIT_PART(user_record.email, '@', 1)),
            user_record.raw_user_meta_data->>'avatar_url',
            org_id,
            user_record.email_confirmed_at IS NOT NULL,
            user_record.created_at,
            user_record.updated_at,
            user_record.last_sign_in_at,
            COALESCE(user_record.raw_user_meta_data, '{}'::jsonb)
        );
        
        sync_count := sync_count + 1;
    END LOOP;
    
    RETURN sync_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function to fix existing users
SELECT public.sync_auth_users();

-- Comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates users in public.users when they sign up via Supabase Auth';
COMMENT ON FUNCTION public.sync_auth_users() IS 'Manually sync existing auth.users to public.users table';