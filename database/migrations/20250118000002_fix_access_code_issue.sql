-- Fix Access Code Issue - MHP2026 not working
-- This fixes the validate_access_code RPC function and ensures MHP2026 is properly set up

-- 1. Create access_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.access_codes (
    code TEXT NOT NULL PRIMARY KEY,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create access_visits table if it doesn't exist  
CREATE TABLE IF NOT EXISTS public.access_visits (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    code TEXT NOT NULL,
    login_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT access_visits_code_fkey FOREIGN KEY (code) REFERENCES public.access_codes(code)
);

-- 3. Enable RLS
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_visits ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DROP POLICY IF EXISTS "Anyone can read active codes" ON public.access_codes;
CREATE POLICY "Anyone can read active codes" ON public.access_codes
    FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Anyone can insert visits" ON public.access_visits;
CREATE POLICY "Anyone can insert visits" ON public.access_visits
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own visits" ON public.access_visits;
CREATE POLICY "Users can update their own visits" ON public.access_visits
    FOR UPDATE USING (true);

-- 5. Fix the validate_access_code RPC function
DROP FUNCTION IF EXISTS public.validate_access_code(TEXT);

CREATE OR REPLACE FUNCTION public.validate_access_code(
    p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Validate input
    IF p_code IS NULL OR TRIM(p_code) = '' THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Access code is required');
    END IF;
    
    -- Check if access code exists and is valid
    IF EXISTS (
        SELECT 1 
        FROM public.access_codes 
        WHERE code = TRIM(p_code) 
        AND active = TRUE
    ) THEN
        RETURN jsonb_build_object('valid', true, 'message', 'Access granted');
    ELSE
        RETURN jsonb_build_object('valid', false, 'message', 'Invalid or inactive access code');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Unable to validate access code');
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_access_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_access_code(TEXT) TO anon;

-- 7. Insert MHP2026 access code if it doesn't exist
INSERT INTO public.access_codes (code, active) 
VALUES ('MHP2026', true)
ON CONFLICT (code) DO UPDATE SET 
    active = true,
    created_at = CASE 
        WHEN access_codes.created_at IS NULL THEN NOW() 
        ELSE access_codes.created_at 
    END;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_active ON public.access_codes(active);
CREATE INDEX IF NOT EXISTS idx_access_visits_session_id ON public.access_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_access_visits_code ON public.access_visits(code);

-- 9. Test the function
SELECT public.validate_access_code('MHP2026') as test_result;
