/**
 * Test generators for navigation configuration.
 *
 * fast-check generators used by admin and profile navigation property tests.
 */

import * as fc from "fast-check";
import type { NavigationItem, NavigationSection } from "../../config/admin-navigation.config";
import type { ProfileSubSection, ProfileSection } from "../../config/profile-navigation.config";
import type { RedirectRule } from "../../config/redirects.config";

/**
 * Generates a valid admin navigation item.
 */
export const navigationItemGenerator = fc.record({
  id: fc.stringMatching(/^[a-z][a-z0-9-]*$/),
  label: fc.string({ minLength: 3, maxLength: 30 }),
  path: fc.stringMatching(/^\/admin\/[a-z][a-z0-9-]*$/),
  icon: fc.option(
    fc.constantFrom(
      "LayoutDashboard",
      "FileText",
      "ShoppingCart",
      "RefreshCw",
      "Calendar",
      "Truck",
      "Package",
      "FileSearch",
      "Upload",
      "Layers",
      "Box",
      "Grid",
      "DollarSign",
      "CreditCard",
      "TrendingUp",
      "Tag",
      "Users",
      "MessageSquare",
      "Settings",
    ),
    { nil: undefined },
  ),
  badge: fc.option(fc.string({ maxLength: 10 }), { nil: undefined }),
  permissions: fc.option(fc.array(fc.string(), { minLength: 1, maxLength: 3 }), {
    nil: undefined,
  }),
}) as fc.Arbitrary<NavigationItem>;

/**
 * Generates a valid admin navigation section.
 */
export const navigationSectionGenerator = fc.record({
  id: fc.stringMatching(/^[a-z][a-z0-9-]*$/),
  title: fc.string({ minLength: 3, maxLength: 30 }),
  items: fc.array(navigationItemGenerator, { minLength: 1, maxLength: 7 }),
  permissions: fc.option(fc.array(fc.string(), { minLength: 1, maxLength: 3 }), {
    nil: undefined,
  }),
}) as fc.Arbitrary<NavigationSection>;

/**
 * Generates a valid admin sidebar configuration.
 * Constraints: 5-7 sections, 15-20 total items.
 */
export const validAdminSidebarGenerator = fc
  .array(navigationSectionGenerator, { minLength: 5, maxLength: 7 })
  .filter((sections) => {
    const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);
    return totalItems >= 15 && totalItems <= 20;
  });

/**
 * Generates a valid profile subsection.
 */
export const profileSubSectionGenerator = fc.record({
  id: fc.stringMatching(/^[a-z][a-z0-9-]*$/),
  label: fc.string({ minLength: 3, maxLength: 30 }),
  path: fc.stringMatching(/^\/perfil\/[a-z][a-z0-9-]*$/),
  icon: fc.option(
    fc.constantFrom(
      "User",
      "Star",
      "Bell",
      "Settings",
      "Grid",
      "MapPin",
      "CreditCard",
      "ShoppingBag",
      "RefreshCw",
      "HelpCircle",
    ),
    { nil: undefined },
  ),
}) as fc.Arbitrary<ProfileSubSection>;

/**
 * Generates a valid profile section.
 */
export const profileSectionGenerator = fc.record({
  id: fc.stringMatching(/^[a-z][a-z0-9-]*$/),
  title: fc.string({ minLength: 3, maxLength: 30 }),
  subSections: fc.array(profileSubSectionGenerator, { minLength: 1, maxLength: 3 }),
}) as fc.Arbitrary<ProfileSection>;

/**
 * Generates a valid profile configuration.
 * Constraints: 3-4 sections, 4-6 total subsections.
 */
export const validProfileConfigGenerator = fc
  .array(profileSectionGenerator, { minLength: 3, maxLength: 4 })
  .filter((sections) => {
    const totalSubSections = sections.reduce(
      (sum, section) => sum + section.subSections.length,
      0,
    );
    return totalSubSections >= 4 && totalSubSections <= 6;
  });

/**
 * Generates a valid route for admin or profile areas.
 */
export const validRouteGenerator = fc.oneof(
  fc.stringMatching(/^\/admin\/[a-z][a-z0-9-]*$/),
  fc.stringMatching(/^\/perfil\/[a-z][a-z0-9-]*$/),
);

/**
 * Generates a valid redirect rule.
 */
export const redirectGenerator = fc.record({
  from: fc.stringMatching(/^\/admin\/[a-z][a-z0-9-]*$/),
  to: fc.stringMatching(/^\/admin\/[a-z][a-z0-9-]*$/),
  permanent: fc.boolean(),
  reason: fc.string({ minLength: 10, maxLength: 100 }),
}) as fc.Arbitrary<RedirectRule>;

/**
 * Generates a valid redirect set.
 * Constraints: 3-10 redirects, without direct cycles.
 */
export const validRedirectSetGenerator = fc
  .array(redirectGenerator, { minLength: 3, maxLength: 10 })
  .filter((redirects) => {
    const fromPaths = new Set(redirects.map((redirect) => redirect.from));
    const toPaths = new Set(redirects.map((redirect) => redirect.to));

    for (const redirect of redirects) {
      if (fromPaths.has(redirect.to) && toPaths.has(redirect.from)) {
        return false;
      }
    }

    const fromPathsArray = redirects.map((redirect) => redirect.from);
    return fromPathsArray.length === new Set(fromPathsArray).size;
  });

/**
 * Generates a path that does not exist in the configuration.
 */
export const invalidPathGenerator = fc.oneof(
  fc.constant("/admin/nao-existe"),
  fc.constant("/perfil/invalido"),
  fc.stringMatching(/^\/admin\/[0-9]+$/),
  fc.stringMatching(/^\/perfil\/[A-Z]+$/),
);
