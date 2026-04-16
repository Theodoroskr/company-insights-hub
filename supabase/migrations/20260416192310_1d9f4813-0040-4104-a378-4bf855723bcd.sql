-- Phase 1: Extend countries with risk + coverage intelligence
ALTER TABLE public.countries
  ADD COLUMN IF NOT EXISTS iso2 TEXT,
  ADD COLUMN IF NOT EXISTS risk_band TEXT CHECK (risk_band IN ('low','medium','high','very_high')),
  ADD COLUMN IF NOT EXISTS risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS political_risk TEXT CHECK (political_risk IN ('low','medium','high','very_high')),
  ADD COLUMN IF NOT EXISTS economic_risk TEXT CHECK (economic_risk IN ('low','medium','high','very_high')),
  ADD COLUMN IF NOT EXISTS sanctions_risk TEXT CHECK (sanctions_risk IN ('low','medium','high','very_high')),
  ADD COLUMN IF NOT EXISTS aml_risk TEXT CHECK (aml_risk IN ('low','medium','high','very_high')),
  ADD COLUMN IF NOT EXISTS coverage_tier TEXT CHECK (coverage_tier IN ('premium','standard','on_request')) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS subregion TEXT,
  ADD COLUMN IF NOT EXISTS business_climate_score INTEGER CHECK (business_climate_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS currency_code TEXT;

-- Helper: backfill iso2 from code where code is already 2 chars
UPDATE public.countries SET iso2 = UPPER(code) WHERE iso2 IS NULL AND length(code) = 2;

-- Seed / upsert risk + coverage data for priority countries
-- Risk band: low(0-25) medium(26-50) high(51-75) very_high(76-100)
WITH seed(code, iso2, name, region, subregion, flag_emoji, risk_band, risk_score, political_risk, economic_risk, sanctions_risk, aml_risk, coverage_tier, business_climate_score, currency_code) AS (VALUES
  -- EU / Western Europe (mostly low risk, premium coverage)
  ('CY','CY','Cyprus','Europe','Southern Europe','🇨🇾','low',22,'low','low','low','medium','premium',78,'EUR'),
  ('GR','GR','Greece','Europe','Southern Europe','🇬🇷','medium',32,'low','medium','low','medium','premium',72,'EUR'),
  ('MT','MT','Malta','Europe','Southern Europe','🇲🇹','medium',28,'low','low','low','medium','premium',76,'EUR'),
  ('IT','IT','Italy','Europe','Southern Europe','🇮🇹','low',24,'low','medium','low','low','premium',74,'EUR'),
  ('ES','ES','Spain','Europe','Southern Europe','🇪🇸','low',20,'low','low','low','low','premium',77,'EUR'),
  ('PT','PT','Portugal','Europe','Southern Europe','🇵🇹','low',18,'low','low','low','low','premium',78,'EUR'),
  ('FR','FR','France','Europe','Western Europe','🇫🇷','low',19,'low','low','low','low','premium',81,'EUR'),
  ('DE','DE','Germany','Europe','Western Europe','🇩🇪','low',12,'low','low','low','low','premium',86,'EUR'),
  ('NL','NL','Netherlands','Europe','Western Europe','🇳🇱','low',11,'low','low','low','low','premium',88,'EUR'),
  ('BE','BE','Belgium','Europe','Western Europe','🇧🇪','low',16,'low','low','low','low','premium',82,'EUR'),
  ('LU','LU','Luxembourg','Europe','Western Europe','🇱🇺','low',10,'low','low','low','medium','premium',88,'EUR'),
  ('IE','IE','Ireland','Europe','Western Europe','🇮🇪','low',14,'low','low','low','low','premium',85,'EUR'),
  ('GB','GB','United Kingdom','Europe','Northern Europe','🇬🇧','low',17,'low','low','low','low','premium',86,'GBP'),
  ('CH','CH','Switzerland','Europe','Western Europe','🇨🇭','low',9,'low','low','low','low','premium',90,'CHF'),
  ('AT','AT','Austria','Europe','Western Europe','🇦🇹','low',13,'low','low','low','low','premium',85,'EUR'),
  ('SE','SE','Sweden','Europe','Northern Europe','🇸🇪','low',10,'low','low','low','low','premium',87,'SEK'),
  ('NO','NO','Norway','Europe','Northern Europe','🇳🇴','low',9,'low','low','low','low','premium',88,'NOK'),
  ('DK','DK','Denmark','Europe','Northern Europe','🇩🇰','low',8,'low','low','low','low','premium',89,'DKK'),
  ('FI','FI','Finland','Europe','Northern Europe','🇫🇮','low',9,'low','low','low','low','premium',88,'EUR'),
  ('IS','IS','Iceland','Europe','Northern Europe','🇮🇸','low',13,'low','low','low','low','standard',82,'ISK'),
  ('PL','PL','Poland','Europe','Eastern Europe','🇵🇱','low',24,'low','low','low','low','premium',79,'PLN'),
  ('CZ','CZ','Czechia','Europe','Eastern Europe','🇨🇿','low',19,'low','low','low','low','premium',82,'CZK'),
  ('HU','HU','Hungary','Europe','Eastern Europe','🇭🇺','medium',32,'medium','medium','low','medium','premium',73,'HUF'),
  ('SK','SK','Slovakia','Europe','Eastern Europe','🇸🇰','low',22,'low','low','low','low','premium',77,'EUR'),
  ('RO','RO','Romania','Europe','Eastern Europe','🇷🇴','medium',30,'medium','medium','low','medium','premium',74,'RON'),
  ('BG','BG','Bulgaria','Europe','Eastern Europe','🇧🇬','medium',34,'medium','medium','low','high','premium',70,'BGN'),
  ('HR','HR','Croatia','Europe','Southern Europe','🇭🇷','low',24,'low','medium','low','medium','premium',75,'EUR'),
  ('SI','SI','Slovenia','Europe','Southern Europe','🇸🇮','low',18,'low','low','low','low','premium',80,'EUR'),
  ('EE','EE','Estonia','Europe','Northern Europe','🇪🇪','low',15,'low','low','low','low','premium',83,'EUR'),
  ('LV','LV','Latvia','Europe','Northern Europe','🇱🇻','low',22,'low','low','low','medium','premium',78,'EUR'),
  ('LT','LT','Lithuania','Europe','Northern Europe','🇱🇹','low',20,'low','low','low','low','premium',79,'EUR'),
  -- Balkans / Eastern Europe
  ('RS','RS','Serbia','Europe','Southern Europe','🇷🇸','medium',42,'medium','medium','low','high','standard',64,'RSD'),
  ('AL','AL','Albania','Europe','Southern Europe','🇦🇱','high',54,'medium','high','low','high','standard',58,'ALL'),
  ('MK','MK','North Macedonia','Europe','Southern Europe','🇲🇰','medium',46,'medium','medium','low','high','standard',62,'MKD'),
  ('BA','BA','Bosnia and Herzegovina','Europe','Southern Europe','🇧🇦','high',52,'high','medium','low','high','standard',60,'BAM'),
  ('ME','ME','Montenegro','Europe','Southern Europe','🇲🇪','medium',44,'medium','medium','low','high','standard',61,'EUR'),
  ('XK','XK','Kosovo','Europe','Southern Europe','🇽🇰','high',58,'high','high','low','high','on_request',55,'EUR'),
  ('UA','UA','Ukraine','Europe','Eastern Europe','🇺🇦','very_high',82,'very_high','very_high','medium','high','on_request',45,'UAH'),
  ('MD','MD','Moldova','Europe','Eastern Europe','🇲🇩','high',58,'high','high','medium','high','standard',55,'MDL'),
  ('BY','BY','Belarus','Europe','Eastern Europe','🇧🇾','very_high',88,'very_high','high','very_high','very_high','on_request',38,'BYN'),
  ('RU','RU','Russia','Europe','Eastern Europe','🇷🇺','very_high',92,'very_high','very_high','very_high','very_high','on_request',35,'RUB'),
  -- North America
  ('US','US','United States','Americas','North America','🇺🇸','low',16,'low','low','low','low','premium',88,'USD'),
  ('CA','CA','Canada','Americas','North America','🇨🇦','low',12,'low','low','low','low','premium',87,'CAD'),
  ('MX','MX','Mexico','Americas','North America','🇲🇽','medium',48,'medium','medium','low','high','premium',64,'MXN'),
  -- Latin America
  ('BR','BR','Brazil','Americas','South America','🇧🇷','medium',42,'medium','medium','low','medium','premium',66,'BRL'),
  ('AR','AR','Argentina','Americas','South America','🇦🇷','high',58,'medium','very_high','low','medium','standard',58,'ARS'),
  ('CL','CL','Chile','Americas','South America','🇨🇱','low',24,'low','low','low','low','premium',76,'CLP'),
  ('CO','CO','Colombia','Americas','South America','🇨🇴','medium',46,'medium','medium','low','medium','standard',64,'COP'),
  ('PE','PE','Peru','Americas','South America','🇵🇪','medium',44,'medium','medium','low','medium','standard',63,'PEN'),
  ('VE','VE','Venezuela','Americas','South America','🇻🇪','very_high',92,'very_high','very_high','very_high','very_high','on_request',28,'VES'),
  -- Middle East / GCC
  ('AE','AE','United Arab Emirates','Asia','Western Asia','🇦🇪','low',24,'low','low','low','medium','premium',82,'AED'),
  ('SA','SA','Saudi Arabia','Asia','Western Asia','🇸🇦','medium',32,'medium','low','low','medium','premium',76,'SAR'),
  ('QA','QA','Qatar','Asia','Western Asia','🇶🇦','low',22,'low','low','low','low','premium',82,'QAR'),
  ('KW','KW','Kuwait','Asia','Western Asia','🇰🇼','medium',28,'medium','low','low','medium','premium',74,'KWD'),
  ('BH','BH','Bahrain','Asia','Western Asia','🇧🇭','medium',30,'medium','low','low','medium','premium',75,'BHD'),
  ('OM','OM','Oman','Asia','Western Asia','🇴🇲','medium',32,'medium','low','low','low','standard',73,'OMR'),
  ('JO','JO','Jordan','Asia','Western Asia','🇯🇴','medium',42,'medium','medium','low','medium','standard',64,'JOD'),
  ('LB','LB','Lebanon','Asia','Western Asia','🇱🇧','very_high',82,'very_high','very_high','medium','very_high','on_request',32,'LBP'),
  ('IL','IL','Israel','Asia','Western Asia','🇮🇱','medium',38,'high','low','low','low','premium',74,'ILS'),
  ('TR','TR','Türkiye','Asia','Western Asia','🇹🇷','medium',48,'high','high','low','medium','premium',62,'TRY'),
  ('IR','IR','Iran','Asia','Western Asia','🇮🇷','very_high',95,'very_high','very_high','very_high','very_high','on_request',22,'IRR'),
  ('IQ','IQ','Iraq','Asia','Western Asia','🇮🇶','very_high',82,'very_high','high','medium','very_high','on_request',38,'IQD'),
  ('SY','SY','Syria','Asia','Western Asia','🇸🇾','very_high',96,'very_high','very_high','very_high','very_high','on_request',18,'SYP'),
  ('YE','YE','Yemen','Asia','Western Asia','🇾🇪','very_high',92,'very_high','very_high','high','very_high','on_request',22,'YER'),
  ('EG','EG','Egypt','Africa','Northern Africa','🇪🇬','high',54,'medium','high','low','medium','standard',55,'EGP'),
  -- Africa
  ('ZA','ZA','South Africa','Africa','Southern Africa','🇿🇦','medium',46,'medium','medium','low','medium','premium',64,'ZAR'),
  ('NG','NG','Nigeria','Africa','Western Africa','🇳🇬','high',62,'high','high','low','high','standard',52,'NGN'),
  ('KE','KE','Kenya','Africa','Eastern Africa','🇰🇪','medium',48,'medium','medium','low','high','standard',60,'KES'),
  ('GH','GH','Ghana','Africa','Western Africa','🇬🇭','medium',46,'medium','medium','low','medium','standard',61,'GHS'),
  ('MA','MA','Morocco','Africa','Northern Africa','🇲🇦','medium',38,'low','medium','low','medium','standard',68,'MAD'),
  ('TN','TN','Tunisia','Africa','Northern Africa','🇹🇳','high',52,'medium','high','low','medium','standard',58,'TND'),
  ('DZ','DZ','Algeria','Africa','Northern Africa','🇩🇿','high',58,'medium','high','low','medium','on_request',52,'DZD'),
  ('LY','LY','Libya','Africa','Northern Africa','🇱🇾','very_high',88,'very_high','very_high','medium','very_high','on_request',28,'LYD'),
  ('SD','SD','Sudan','Africa','Northern Africa','🇸🇩','very_high',92,'very_high','very_high','very_high','very_high','on_request',25,'SDG'),
  ('ET','ET','Ethiopia','Africa','Eastern Africa','🇪🇹','high',62,'high','medium','low','high','on_request',48,'ETB'),
  -- Asia / Pacific
  ('CN','CN','China','Asia','Eastern Asia','🇨🇳','medium',42,'high','low','medium','medium','standard',72,'CNY'),
  ('JP','JP','Japan','Asia','Eastern Asia','🇯🇵','low',12,'low','low','low','low','premium',86,'JPY'),
  ('KR','KR','South Korea','Asia','Eastern Asia','🇰🇷','low',18,'low','low','low','low','premium',83,'KRW'),
  ('IN','IN','India','Asia','Southern Asia','🇮🇳','medium',38,'medium','medium','low','medium','premium',71,'INR'),
  ('PK','PK','Pakistan','Asia','Southern Asia','🇵🇰','high',62,'high','high','medium','high','standard',48,'PKR'),
  ('BD','BD','Bangladesh','Asia','Southern Asia','🇧🇩','high',54,'medium','medium','low','high','standard',55,'BDT'),
  ('TH','TH','Thailand','Asia','Southeastern Asia','🇹🇭','medium',32,'medium','low','low','medium','premium',73,'THB'),
  ('VN','VN','Vietnam','Asia','Southeastern Asia','🇻🇳','medium',38,'medium','low','low','medium','standard',69,'VND'),
  ('SG','SG','Singapore','Asia','Southeastern Asia','🇸🇬','low',8,'low','low','low','low','premium',92,'SGD'),
  ('MY','MY','Malaysia','Asia','Southeastern Asia','🇲🇾','medium',28,'medium','low','low','medium','premium',74,'MYR'),
  ('ID','ID','Indonesia','Asia','Southeastern Asia','🇮🇩','medium',38,'medium','medium','low','medium','standard',68,'IDR'),
  ('PH','PH','Philippines','Asia','Southeastern Asia','🇵🇭','medium',44,'medium','medium','low','high','standard',62,'PHP'),
  ('AU','AU','Australia','Oceania','Australia and New Zealand','🇦🇺','low',10,'low','low','low','low','premium',88,'AUD'),
  ('NZ','NZ','New Zealand','Oceania','Australia and New Zealand','🇳🇿','low',9,'low','low','low','low','premium',89,'NZD'),
  -- Caucasus / Central Asia (frontier strength)
  ('GE','GE','Georgia','Asia','Western Asia','🇬🇪','medium',38,'medium','medium','low','medium','standard',72,'GEL'),
  ('AM','AM','Armenia','Asia','Western Asia','🇦🇲','medium',44,'medium','medium','low','medium','standard',66,'AMD'),
  ('AZ','AZ','Azerbaijan','Asia','Western Asia','🇦🇿','high',52,'high','medium','low','medium','standard',62,'AZN'),
  ('KZ','KZ','Kazakhstan','Asia','Central Asia','🇰🇿','medium',46,'high','medium','low','medium','standard',64,'KZT'),
  ('UZ','UZ','Uzbekistan','Asia','Central Asia','🇺🇿','high',56,'high','medium','low','high','standard',58,'UZS'),
  ('KG','KG','Kyrgyzstan','Asia','Central Asia','🇰🇬','high',62,'high','high','low','high','on_request',52,'KGS'),
  ('TJ','TJ','Tajikistan','Asia','Central Asia','🇹🇯','high',68,'high','high','low','high','on_request',46,'TJS'),
  ('TM','TM','Turkmenistan','Asia','Central Asia','🇹🇲','very_high',82,'very_high','high','medium','high','on_request',32,'TMT')
)
INSERT INTO public.countries (code, iso2, name, region, subregion, flag_emoji, risk_band, risk_score, political_risk, economic_risk, sanctions_risk, aml_risk, coverage_tier, business_climate_score, currency_code, api4all_supported, is_featured, display_order)
SELECT code, iso2, name, region, subregion, flag_emoji, risk_band, risk_score, political_risk, economic_risk, sanctions_risk, aml_risk, coverage_tier, business_climate_score, currency_code,
       (coverage_tier IN ('premium','standard')) AS api4all_supported,
       (coverage_tier = 'premium') AS is_featured,
       CASE coverage_tier WHEN 'premium' THEN 1 WHEN 'standard' THEN 2 ELSE 3 END AS display_order
FROM seed
ON CONFLICT (code) DO UPDATE SET
  iso2 = EXCLUDED.iso2,
  name = EXCLUDED.name,
  region = EXCLUDED.region,
  subregion = EXCLUDED.subregion,
  flag_emoji = EXCLUDED.flag_emoji,
  risk_band = EXCLUDED.risk_band,
  risk_score = EXCLUDED.risk_score,
  political_risk = EXCLUDED.political_risk,
  economic_risk = EXCLUDED.economic_risk,
  sanctions_risk = EXCLUDED.sanctions_risk,
  aml_risk = EXCLUDED.aml_risk,
  coverage_tier = EXCLUDED.coverage_tier,
  business_climate_score = EXCLUDED.business_climate_score,
  currency_code = EXCLUDED.currency_code;

-- Index for fast country lookups by iso2
CREATE INDEX IF NOT EXISTS idx_countries_iso2 ON public.countries(iso2);
CREATE INDEX IF NOT EXISTS idx_countries_risk_band ON public.countries(risk_band);
CREATE INDEX IF NOT EXISTS idx_countries_coverage_tier ON public.countries(coverage_tier);