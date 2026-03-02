/**
 * Geradores de Teste para Navegação
 * 
 * Geradores fast-check para testes de propriedades
 * da configuração de navegação admin e perfil.
 */

import * as fc from 'fast-check';
import type { NavigationItem, NavigationSection } from '../../config/admin-navigation.config';
import type { ProfileSubSection, ProfileSection } from '../../config/profile-navigation.config';
import type { RedirectRule } from '../../config/redirects.config';

/**
 * Gera um item de navegação válido
 */
export const navigationItemGenerator = fc.record({
  id: fc.stringMatching(/^[a-z][a-z0-9-]*$/),
  label: fc.string({ minLength: 3, maxLength: 30 }),
  path: fc.stringMatching(/^\/admin\/[a-z][a-z0-9-]*$/),
  icon: fc.option(fc.constantFrom(
    'LayoutDashboard', 'FileText', 'ShoppingCart', 'RefreshCw',
    'Calendar', 'Truck', 'Package', 'FileSearch', 'Upload',
    'Layers', 'Box', 'Grid', 'DollarSign', 'CreditCard',
    'TrendingUp', 'Tag', 'Users', 'MessageSquare', 'Settings'
  ), { nil: undefined }),
  badge: fc.option(fc.string({ maxLength: 10 }), { nil: undefined }),
  permissions: fc.option(fc.array(fc.string(), { minLength: 1, maxLength: 3 }), { nil: undefined }),
}) as fc.Arbitrary<NavigationItem>;

/**
 * Gera uma seção de navegação válida
 */
export const navigationSectionGenerator = fc.record({
  id: fc.stringMatching(/^[a-z][a-z0-9-]*$/),
  title: fc.string({ minLength: 3, maxLength: 30 }),
  items: fc.array(navigationItemGenerator, { minLength: 1, maxLength: 7 }),
  permissions: fc.option(fc.array(fc.string(), { minLength: 1, maxLength: 3 }), { nil: undefined }),
}) as fc.Arbitrary<NavigationSection>;

/**
 * Gera uma configuração de sidebar admin válida
 * Constraints: 5-7 seções, 15-20 itens totais
 */
export const validAdminSidebarGenerator = fc
  .array(navigationSectionGenerator, { minLength: 5, maxLength: 7 })
  .filter(sections => {
    const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);
    return totalItems >= 15 && totalItems <= 20;
  });

/**
 * Gera uma sub-seção de perfil válida
 */
export const profileSubSectionGenerator = fc.record({
  id: fc.stringMatching(/^[a-z][a-z0-9-]*$/),
  label: fc.string({ minLength: 3, maxLength: 30 }),
  path: fc.stringMatching(/^\/profile\/[a-z][a-z0-9-]*$/),
  icon: fc.option(fc.constantFrom(
    'User', 'Star', 'Bell', 'Settings', 'Grid',
    'MapPin', 'CreditCard', 'ShoppingBag', 'RefreshCw', 'HelpCircle'
  ), { nil: undefined }),
}) as fc.Arbitrary<ProfileSubSection>;

/**
 * Gera uma seção de perfil válida
 */
export const profileSectionGenerator = fc.record({
  id: fc.stringMatching(/^[a-z][a-z0-9-]*$/),
  title: fc.string({ minLength: 3, maxLength: 30 }),
  subSections: fc.array(profileSubSectionGenerator, { minLength: 1, maxLength: 3 }),
}) as fc.Arbitrary<ProfileSection>;

/**
 * Gera uma configuração de perfil válida
 * Constraints: 5 seções, 7-11 sub-seções totais
 */
export const validProfileConfigGenerator = fc
  .array(profileSectionGenerator, { minLength: 5, maxLength: 5 })
  .filter(sections => {
    const totalSubSections = sections.reduce((sum, section) => sum + section.subSections.length, 0);
    return totalSubSections >= 7 && totalSubSections <= 11;
  });

/**
 * Gera uma rota válida (admin ou profile)
 */
export const validRouteGenerator = fc.oneof(
  fc.stringMatching(/^\/admin\/[a-z][a-z0-9-]*$/),
  fc.stringMatching(/^\/profile\/[a-z][a-z0-9-]*$/)
);

/**
 * Gera uma regra de redirecionamento válida
 */
export const redirectGenerator = fc.record({
  from: fc.stringMatching(/^\/admin\/[a-z][a-z0-9-]*$/),
  to: fc.stringMatching(/^\/admin\/[a-z][a-z0-9-]*$/),
  permanent: fc.boolean(),
  reason: fc.string({ minLength: 10, maxLength: 100 }),
}) as fc.Arbitrary<RedirectRule>;

/**
 * Gera um conjunto de redirecionamentos válidos
 * Constraints: 3-10 redirects, sem ciclos
 */
export const validRedirectSetGenerator = fc
  .array(redirectGenerator, { minLength: 3, maxLength: 10 })
  .filter(redirects => {
    // Verifica que não há ciclos diretos (A→B e B→A)
    const fromPaths = new Set(redirects.map(r => r.from));
    const toPaths = new Set(redirects.map(r => r.to));
    
    for (const redirect of redirects) {
      if (fromPaths.has(redirect.to) && toPaths.has(redirect.from)) {
        return false; // Ciclo detectado
      }
    }
    
    // Verifica que não há duplicatas de 'from'
    const fromPathsArray = redirects.map(r => r.from);
    return fromPathsArray.length === new Set(fromPathsArray).size;
  });

/**
 * Gera um path que NÃO existe na configuração
 * Útil para testar comportamento de erro
 */
export const invalidPathGenerator = fc.oneof(
  fc.constant('/admin/nao-existe'),
  fc.constant('/profile/invalido'),
  fc.stringMatching(/^\/admin\/[0-9]+$/), // Paths numéricos
  fc.stringMatching(/^\/profile\/[A-Z]+$/), // Paths em maiúsculas
);
