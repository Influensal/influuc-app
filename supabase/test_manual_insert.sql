-- ==========================================
-- TEST MANUAL INSERT
-- Run this to see if the table accepts data
-- ==========================================

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the first user ID you can find (or your own)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO content_generations (
            account_id,
            week_number,
            week_start_date,
            week_end_date,
            status
        ) VALUES (
            v_user_id,
            99, -- Test week number
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '7 days',
            'generating'
        );
        
        RAISE NOTICE 'Insert successful for user %', v_user_id;
    ELSE
        RAISE NOTICE 'No user found to test with';
    END IF;
END $$;
