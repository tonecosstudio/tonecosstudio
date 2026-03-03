-- Test if production objects exist and work

-- 1. Test if production_queue table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_queue') THEN
    RAISE NOTICE 'production_queue table EXISTS';
  ELSE
    RAISE NOTICE 'production_queue table NOT FOUND';
  END IF;
END $$;

-- 2. Test if production_queue_with_details view exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'production_queue_with_details') THEN
    RAISE NOTICE 'production_queue_with_details view EXISTS';
  ELSE
    RAISE NOTICE 'production_queue_with_details view NOT FOUND';
  END IF;
END $$;

-- 3. Test if get_production_metrics function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_production_metrics') THEN
    RAISE NOTICE 'get_production_metrics function EXISTS';
  ELSE
    RAISE NOTICE 'get_production_metrics function NOT FOUND';
  END IF;
END $$;

-- 4. Try to call get_production_metrics (if it exists)
DO $$
DECLARE
  result JSON;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_production_metrics') THEN
    SELECT get_production_metrics() INTO result;
    RAISE NOTICE 'get_production_metrics() returned: %', result;
  ELSE
    RAISE NOTICE 'Cannot test get_production_metrics - function does not exist';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error calling get_production_metrics: %', SQLERRM;
END $$;

-- 5. Try to query production_queue_with_details (if it exists)
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'production_queue_with_details') THEN
    SELECT COUNT(*) INTO row_count FROM production_queue_with_details;
    RAISE NOTICE 'production_queue_with_details has % rows', row_count;
  ELSE
    RAISE NOTICE 'Cannot query production_queue_with_details - view does not exist';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error querying production_queue_with_details: %', SQLERRM;
END $$;
