-- Create superadmin user in auth.users
-- First check if the user already exists
DO $$
DECLARE
  user_exists boolean;
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Check if user already exists
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin@jainuniversity.ac.in') INTO user_exists;
  
  -- Only insert if user doesn't exist
  IF NOT user_exists THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_user_meta_data
    )
    VALUES (
      new_user_id,
      'superadmin@jainuniversity.ac.in',
      -- This is not the actual encrypted password, just a placeholder
      -- In real scenarios, use proper password hashing
      crypt('Imshade45', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"role": "superadmin"}'
    );
  END IF;
END $$;

-- Create profile for the superadmin
DO $$
DECLARE
  superadmin_id uuid;
  profile_exists boolean;
BEGIN
  -- Get the superadmin user ID
  SELECT id INTO superadmin_id FROM auth.users WHERE email = 'superadmin@jainuniversity.ac.in';
  
  IF superadmin_id IS NOT NULL THEN
    -- Check if profile already exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = superadmin_id) INTO profile_exists;
    
    IF profile_exists THEN
      -- Update existing profile
      UPDATE public.profiles
      SET role = 'superadmin',
          updated_at = now()
      WHERE id = superadmin_id;
    ELSE
      -- Create new profile
      INSERT INTO public.profiles (
        id,
        email,
        role,
        created_at,
        updated_at
      )
      VALUES (
        superadmin_id,
        'superadmin@jainuniversity.ac.in',
        'superadmin',
        now(),
        now()
      );
    END IF;
    
    RAISE NOTICE 'Superadmin profile created or updated successfully';
  ELSE
    RAISE NOTICE 'Could not find superadmin user';
  END IF;
END $$;
