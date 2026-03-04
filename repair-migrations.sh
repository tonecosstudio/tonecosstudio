#!/bin/bash

# Script para reparar o histórico de migrações do Supabase
# Este script marca as migrações como aplicadas no histórico local

echo "Reparando histórico de migrações..."

supabase migration repair --status applied 20260302000000
supabase migration repair --status applied 20260302000001
supabase migration repair --status applied 20260422000001
supabase migration repair --status applied 20260423000000
supabase migration repair --status applied 20260424000000
supabase migration repair --status applied 20260425000000
supabase migration repair --status applied 20260426000000
supabase migration repair --status applied 20260427000000
supabase migration repair --status applied 20260429000000
supabase migration repair --status applied 20260429000001
supabase migration repair --status applied 20260429000002
supabase migration repair --status applied 20260429000003
supabase migration repair --status applied 20260429000004
supabase migration repair --status applied 20260429000005
supabase migration repair --status applied 20260429000006
supabase migration repair --status applied 20260429000007
supabase migration repair --status applied 20260429000008
supabase migration repair --status applied 20260502000000
supabase migration repair --status applied 20260503000000
supabase migration repair --status applied 20260504000000
supabase migration repair --status applied 20260504000001
supabase migration repair --status applied 20260504000002
supabase migration repair --status applied 20260504000003
supabase migration repair --status applied 20260504000004
supabase migration repair --status applied 20260505000000

echo "✅ Histórico de migrações reparado!"
echo ""
echo "Próximo passo: supabase db push"
