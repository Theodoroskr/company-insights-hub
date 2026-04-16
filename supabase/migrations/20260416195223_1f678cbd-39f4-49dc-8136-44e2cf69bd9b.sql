UPDATE public.countries
SET coverage_tier = 'premium',
    api4all_supported = COALESCE(api4all_supported, false),
    risk_band = COALESCE(risk_band, 'low'),
    risk_score = COALESCE(risk_score, 20),
    is_featured = true,
    iso2 = COALESCE(iso2, 'gb'),
    flag_emoji = COALESCE(flag_emoji, '🇬🇧')
WHERE code = 'GB' OR code = 'UK' OR iso2 = 'gb';

INSERT INTO public.countries (code, name, iso2, flag_emoji, coverage_tier, risk_band, risk_score, is_featured, api4all_supported, region)
SELECT 'GB', 'United Kingdom', 'gb', '🇬🇧', 'premium', 'low', 20, true, false, 'Europe'
WHERE NOT EXISTS (SELECT 1 FROM public.countries WHERE code IN ('GB','UK') OR iso2 = 'gb');