DELETE FROM sessions;
DELETE FROM otp_verifications;
DELETE FROM users;
DELETE FROM companies;
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Companies: ' || COUNT(*) FROM companies;
