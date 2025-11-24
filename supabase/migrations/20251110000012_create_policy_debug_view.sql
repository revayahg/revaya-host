-- Helper view to inspect current RLS policies via REST (temporary diagnostic).

SET statement_timeout TO 0;
SET lock_timeout TO 0;

DROP VIEW IF EXISTS public.policy_debug;

CREATE VIEW public.policy_debug AS
SELECT
  pol.schemaname,
  pol.tablename,
  pol.policyname,
  pol.cmd,
  pol.permissive,
  pol.qual        AS using_expression_raw,
  pol.with_check  AS check_expression_raw,
  CASE WHEN pol.qual IS NOT NULL THEN pg_get_expr(pol.qual::pg_node_tree, cls.oid) ELSE NULL END AS using_expression,
  CASE WHEN pol.with_check IS NOT NULL THEN pg_get_expr(pol.with_check::pg_node_tree, cls.oid) ELSE NULL END AS check_expression
FROM pg_policies pol
JOIN pg_class     cls ON cls.relname = pol.tablename
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = pol.schemaname
ORDER BY pol.schemaname, pol.tablename, pol.policyname;

RESET lock_timeout;
RESET statement_timeout;

