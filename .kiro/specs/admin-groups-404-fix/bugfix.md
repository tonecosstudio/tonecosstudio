# Bugfix Requirements Document

## Introduction

Admin users are receiving 404 errors when attempting to access group detail pages via routes like `/admin/groups/{uuid}`. The error messages indicate the route does not exist, even though the AdminGroupDetailsPage component exists and is imported.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an admin user clicks on a group card in AdminGroupsPage THEN the navigation attempts to navigate to `/admin/groups/{groupId}` (English path)
1.2 WHEN an admin user directly visits `/admin/groups/{groupId}` in the browser THEN the system returns a 404 error because no route matches this path

### Expected Behavior (Correct)

2.1 WHEN an admin user clicks on a group card in AdminGroupsPage THEN the system SHALL navigate to the correct group detail page without errors
2.2 WHEN an admin user directly visits `/admin/groups/{groupId}` in the browser THEN the system SHALL display the AdminGroupDetailsPage component

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an admin user visits `/admin/grupos` (Portuguese path) THEN the system SHALL CONTINUE TO display the AdminGroupsPage correctly
3.2 WHEN an admin user visits `/admin/grupos/{groupId}` (Portuguese path) THEN the system SHALL CONTINUE TO display the AdminGroupDetailsPage correctly
3.3 WHEN a member user visits `/grupos/{groupId}` THEN the system SHALL CONTINUE TO display the MemberGroupDetailsPage correctly