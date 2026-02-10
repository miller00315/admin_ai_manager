# Correção de Imports

## Problema

O Rollup não consegue resolver imports de `@edutest/shared` porque o pacote ainda não foi publicado. Durante o desenvolvimento local, estamos usando o alias `@shared` configurado no `vite.config.ts`.

## Solução Aplicada

Todos os imports foram alterados de:
```typescript
import { UserRole } from '@edutest/shared';
import { getSupabaseClient } from '@edutest/shared/services';
import '@edutest/shared/i18n';
```

Para:
```typescript
import { UserRole } from '@shared/src/types';
import { getSupabaseClient } from '@shared/src/services';
import '@shared/src/i18n';
```

## Quando Publicar o Pacote

Após publicar `@edutest/shared` no GitHub Packages ou npm, você pode:

1. **Opção 1:** Voltar para `@edutest/shared` e instalar o pacote:
   ```bash
   npm install @edutest/shared
   ```

2. **Opção 2:** Manter usando `@shared` durante desenvolvimento e usar `@edutest/shared` apenas em produção

## Próximos Passos

1. Copiar componentes faltantes (LoginScreen, AdminLayout, etc.)
2. Ajustar imports nos componentes copiados
3. Testar build local
4. Publicar pacote compartilhado
5. Atualizar imports para usar `@edutest/shared` publicado
