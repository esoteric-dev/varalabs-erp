-- Add services.manage permission
INSERT INTO permissions (id, code, module, description) VALUES
    ('40000000-0000-0000-0000-000000000001', 'services.manage', 'services', 'Enable/disable services')
ON CONFLICT (code) DO NOTHING;