SET statement_timeout TO 0;
SET lock_timeout TO 0;

CREATE OR REPLACE VIEW public.policy_debug AS
SELECT
  pol.tablename,
  pol.policyname,
  pol.cmd,
  pol.permissive,
  CASE WHEN pol.qual IS NOT NULL THEN pg_get_expr(pol.qual::pg_node_tree, cls.oid)::text ELSE NULL END AS using_expression,
  CASE WHEN pol.with_check IS NOT NULL THEN pg_get_expr(pol.with_check::pg_node_tree, cls.oid)::text ELSE NULL END AS check_expression
FROM pg_policies pol
JOIN pg_class cls
  ON cls.relname = pol.tablename
JOIN pg_namespace nsp
  ON nsp.oid = cls.relnamespace
WHERE pol.schemaname = 'public'
  AND nsp.nspname = 'public'
ORDER BY pol.tablename, pol.policyname;

RESET lock_timeout;
RESET statement_timeout;

