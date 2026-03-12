-- Grant ALL permissions to every Admin role (slug = 'admin') across all organisations.
-- This fixes orgs created before the admin-gets-all-permissions change.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'admin'
ON CONFLICT DO NOTHING;
