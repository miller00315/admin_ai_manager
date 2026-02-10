# Script para Ajustar Imports

Execute este script para ajustar todos os imports nos componentes:

```bash
# Ajustar imports do LoginScreen
sed -i "s|from '../services/supabaseService'|from '@shared/src/services'|g" packages/*/components/LoginScreen.tsx

# Ajustar imports do AdminLayout
sed -i "s|from '../types'|from '@shared/src/types'|g" packages/admin/components/AdminLayout.tsx
sed -i "s|from '../presentation/hooks/useAppTranslation'|from '@shared/src/presentation/hooks/useAppTranslation'|g" packages/admin/components/AdminLayout.tsx

# Ajustar imports do Navigation
sed -i "s|from '../types'|from '@shared/src/types'|g" packages/*/components/Navigation.tsx
sed -i "s|from '../presentation/hooks/useAppTranslation'|from '@shared/src/presentation/hooks/useAppTranslation'|g" packages/*/components/Navigation.tsx

# Ajustar imports do LanguageSwitcher
sed -i "s|from '../i18n'|from '@shared/src/i18n'|g" packages/*/components/LanguageSwitcher.tsx

# Ajustar imports do ThemeSwitcher
sed -i "s|from '../presentation/hooks/useTheme'|from '@shared/src/presentation/hooks/useTheme'|g" packages/*/components/ThemeSwitcher.tsx

# Ajustar imports do Breadcrumb
sed -i "s|from '../types'|from '@shared/src/types'|g" packages/*/components/Breadcrumb.tsx
```

## Importações que precisam ser ajustadas:

- `'../types'` → `'@shared/src/types'`
- `'../services/...'` → `'@shared/src/services'`
- `'../presentation/hooks/...'` → `'@shared/src/presentation/hooks/...'`
- `'../i18n'` → `'@shared/src/i18n'`
- `'../domain/...'` → `'@shared/src/domain/...'`
- `'../data/...'` → `'@shared/src/data/...'`
- `'../utils/...'` → `'@shared/src/utils/...'`
