#!/bin/bash

# Script para aplicar migrações pendentes do Production Management System
# Este script aplica apenas as migrações que ainda não foram aplicadas ao banco remoto

echo "Aplicando migrações pendentes do Production Management System..."

# Lista de migrações pendentes (baseado no output do supabase migration list)
MIGRATIONS=(
  "20260302000000_create_payment_info_requests.sql"
  "20260302000001_add_payment_notification_types.sql"
  "20260422000001_fix_bonus_catalog_rls.sql"
  "20260423000000_apply_profile_relationship_fix.sql"
  "20260424000000_create_order_status_history.sql"
  "20260425000000_create_orders_consolidation_indexes.sql"
  "20260426000000_create_fulltext_search_indexes.sql"
  "20260427000000_add_missing_fields_to_standalone_purchases.sql"
  "20260429000000_schedule_character_choice_reminders_cron.sql"
  "20260429000001_schedule_character_choice_expiration_cron.sql"
  "20260429000002_add_expired_status_to_character_choices.sql"
  "20260429000003_sync_production_status_to_orders.sql"
  "20260429000004_test_auto_populate_trigger.sql"
  "20260429000004_verify_auto_populate_trigger.sql"
  "20260429000005_create_stage_transition_logs.sql"
  "20260429000006_create_production_assignment_logs.sql"
  "20260429000007_add_production_photo_metadata.sql"
  "20260429000008_add_notification_preferences.sql"
  "20260502000000_fix_collections_rls_for_subscriptions.sql"
  "20260503000000_fix_collections_rls_final.sql"
  "20260504000000_migrate_legacy_subscription_data.sql"
  "20260504000001_fix_collection_trigger.sql"
  "20260504000002_create_subscription_business_functions.sql"
  "20260504000003_add_subscription_constraints.sql"
  "20260504000004_cleanup_duplicate_subscriptions.sql"
  "20260505000000_create_deadline_calculation_function.sql"
)

# Aplicar cada migração
for migration in "${MIGRATIONS[@]}"; do
  echo "Aplicando $migration..."
  
  # Verificar se o arquivo existe
  if [ ! -f "supabase/migrations/$migration" ]; then
    echo "  ⚠️  Arquivo não encontrado: $migration"
    continue
  fi
  
  # Aplicar a migração usando psql através do Supabase CLI
  supabase db execute --file "supabase/migrations/$migration"
  
  if [ $? -eq 0 ]; then
    echo "  ✅ $migration aplicada com sucesso"
  else
    echo "  ❌ Erro ao aplicar $migration"
    echo "  Deseja continuar? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
      echo "Abortando..."
      exit 1
    fi
  fi
done

echo ""
echo "✅ Processo de migração concluído!"
echo ""
echo "Próximos passos:"
echo "1. Verificar se as migrações foram aplicadas: supabase migration list"
echo "2. Testar as funcionalidades do Production Management System"
echo "3. Verificar os logs do Supabase para erros"
