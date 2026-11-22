-- Private TONART character registration before model linking, reusing the existing identity table.
BEGIN;
CREATE OR REPLACE FUNCTION public.admin_register_catalog_character_identity(
 p_character_name text, p_franchise text, p_evidence_origin text, p_evidence_note text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $editorial$
DECLARE
 v_name text; v_franchise text; v_origin text; v_note text; v_key text;
 v_id uuid; v_row public.catalog_character_identities%ROWTYPE;
BEGIN
 PERFORM private_api.assert_tonart_curation_service_role();
 v_name := public.admin_validate_catalog_curation_text(p_character_name,'character name',160);
 v_franchise := public.admin_validate_catalog_curation_text(p_franchise,'franchise',160);
 v_origin := public.admin_validate_catalog_curation_text(p_evidence_origin,'identity evidence origin',240);
 v_note := public.admin_validate_catalog_curation_text(p_evidence_note,'identity evidence note',1000);
 IF lower(v_origin) LIKE 'automatic:%' OR length(v_note) < 20 THEN
   RAISE EXCEPTION 'Explicit source evidence required for reviewed character'
   USING ERRCODE='22023';
 END IF;
 -- Use the same canonical key as admin_verify_catalog_model_identity.
 v_key := length(v_franchise)::text || ':' || lower(v_franchise) || ':' || lower(v_name);
 INSERT INTO public.catalog_character_identities(
   identity_key,character_name,franchise,evidence_origin,evidence_note,updated_at
 ) VALUES(v_key,v_name,v_franchise,v_origin,v_note,now())
 ON CONFLICT (identity_key) DO NOTHING RETURNING id INTO v_id;
 SELECT * INTO v_row FROM public.catalog_character_identities
 WHERE identity_key=v_key FOR UPDATE;
 IF v_row.id IS NULL OR lower(v_row.character_name)<>lower(v_name)
    OR lower(v_row.franchise)<>lower(v_franchise) THEN
   RAISE EXCEPTION 'Editorial identity conflicts with existing record'
   USING ERRCODE='23505';
 END IF;
 -- Repeated calls never overwrite existing evidence and never link a model.
 RETURN jsonb_build_object(
   'identityId',v_row.id,'characterName',v_row.character_name,
   'franchise',v_row.franchise,'created',v_id IS NOT NULL,
   'modelLinked',false,'visibility','private');
END;
$editorial$;
REVOKE ALL ON FUNCTION public.admin_register_catalog_character_identity(text,text,text,text)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_register_catalog_character_identity(text,text,text,text)
TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
