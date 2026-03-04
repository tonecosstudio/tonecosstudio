# UAT Coordinator Checklist
## Production Management System

**UAT Coordinator**: _______________  
**UAT Period**: _______________ to _______________

---

## Quick Reference

**Total Participants Needed**: 15 (5 admin + 10 customer)  
**Total Sessions**: 15  
**Estimated Total Time**: 40-45 hours  
**Success Criteria**: 90% completion rate, ≥4/5 usability rating, 0 critical issues

---

## Phase 1: Preparation (2 weeks before)

### Week -2: Initial Setup

#### Environment Setup
- [ ] Deploy staging environment
- [ ] Run database migrations
- [ ] Execute `UAT_TEST_DATA_SETUP.sql`
- [ ] Verify test data loaded correctly
- [ ] Configure email service (test mode)
- [ ] Enable Supabase Realtime
- [ ] Configure storage bucket for photos
- [ ] Test all integrations
- [ ] Verify performance (dashboard < 2s load time)
- [ ] Create backup of staging environment

**Status**: ☐ Complete  ☐ In Progress  ☐ Not Started  
**Issues**: _________________________________________________________________

#### User Accounts
- [ ] Create admin accounts (uat_admin_1 through uat_admin_5)
- [ ] Create customer accounts (uat_customer_1 through uat_customer_10)
- [ ] Generate secure passwords
- [ ] Store credentials in password manager
- [ ] Test login for all accounts
- [ ] Verify admin permissions
- [ ] Verify customer permissions
- [ ] Assign test orders to customer accounts
- [ ] Create test data for each account

**Status**: ☐ Complete  ☐ In Progress  ☐ Not Started  
**Issues**: _________________________________________________________________

#### Documentation
- [ ] Print/prepare UAT Documentation
- [ ] Print/prepare Admin Feedback Templates (5 copies)
- [ ] Print/prepare Customer Feedback Templates (10 copies)
- [ ] Print/prepare Observation Notes Templates (15 copies)
- [ ] Print/prepare Issue Tracking Templates
- [ ] Create digital copies of all templates
- [ ] Prepare consent forms (if required)
- [ ] Create participant information packets
- [ ] Prepare thank you gifts/compensation

**Status**: ☐ Complete  ☐ In Progress  ☐ Not Started  
**Issues**: _________________________________________________________________

### Week -1: Participant Recruitment

#### Admin User Recruitment
- [ ] Identify potential admin participants
  - [ ] 2 experienced production managers
  - [ ] 2 intermediate order managers
  - [ ] 1 new customer service rep
- [ ] Send recruitment emails
- [ ] Follow up with non-responders
- [ ] Confirm 5 participants
- [ ] Identify 2 backup participants
- [ ] Collect availability
- [ ] Send confirmation emails

**Confirmed Admin Participants**:
1. Name: _______________ Role: _______________ Experience: _______________
2. Name: _______________ Role: _______________ Experience: _______________
3. Name: _______________ Role: _______________ Experience: _______________
4. Name: _______________ Role: _______________ Experience: _______________
5. Name: _______________ Role: _______________ Experience: _______________

**Status**: ☐ Complete  ☐ In Progress  ☐ Not Started  
**Issues**: _________________________________________________________________

#### Customer User Recruitment
- [ ] Identify potential customer participants
  - [ ] 3 tech-savvy customers
  - [ ] 4 average tech level customers
  - [ ] 3 low-tech customers
  - [ ] Mix of subscribers and standalone purchasers
- [ ] Send recruitment emails
- [ ] Follow up with non-responders
- [ ] Confirm 10 participants
- [ ] Identify 3 backup participants
- [ ] Collect availability
- [ ] Send confirmation emails

**Confirmed Customer Participants**:
1. Name: _______________ Type: _______________ Tech Level: _______________
2. Name: _______________ Type: _______________ Tech Level: _______________
3. Name: _______________ Type: _______________ Tech Level: _______________
4. Name: _______________ Type: _______________ Tech Level: _______________
5. Name: _______________ Type: _______________ Tech Level: _______________
6. Name: _______________ Type: _______________ Tech Level: _______________
7. Name: _______________ Type: _______________ Tech Level: _______________
8. Name: _______________ Type: _______________ Tech Level: _______________
9. Name: _______________ Type: _______________ Tech Level: _______________
10. Name: _______________ Type: _______________ Tech Level: _______________

**Status**: ☐ Complete  ☐ In Progress  ☐ Not Started  
**Issues**: _________________________________________________________________

#### Session Scheduling
- [ ] Create master schedule
- [ ] Book testing rooms (in-person) or video conference links (remote)
- [ ] Schedule admin sessions (2-3 hours each)
  - [ ] Session 1: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 2: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 3: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 4: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 5: Date: _______________ Time: _______________ Participant: _______________
- [ ] Schedule customer sessions (30-45 minutes each)
  - [ ] Session 1: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 2: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 3: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 4: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 5: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 6: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 7: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 8: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 9: Date: _______________ Time: _______________ Participant: _______________
  - [ ] Session 10: Date: _______________ Time: _______________ Participant: _______________
- [ ] Send calendar invitations
- [ ] Add buffer time between sessions
- [ ] Schedule team debrief sessions

**Status**: ☐ Complete  ☐ In Progress  ☐ Not Started  
**Issues**: _________________________________________________________________

#### Technical Preparation
- [ ] Test screen recording software
- [ ] Test video conferencing setup
- [ ] Test audio equipment
- [ ] Verify internet connectivity
- [ ] Prepare backup devices
- [ ] Test mobile devices for customer sessions
- [ ] Install required browsers
- [ ] Test screen sharing
- [ ] Create backup communication plan
- [ ] Prepare technical support contact list

**Status**: ☐ Complete  ☐ In Progress  ☐ Not Started  
**Issues**: _________________________________________________________________

#### Team Preparation
- [ ] Brief UAT coordinator on process
- [ ] Brief observers on what to watch for
- [ ] Brief technical support on common issues
- [ ] Conduct dry run with internal team member
- [ ] Review all test scenarios
- [ ] Practice session facilitation
- [ ] Review issue tracking process
- [ ] Assign roles and responsibilities

**Team Members**:
- UAT Coordinator: _______________
- Observer(s): _______________
- Technical Support: _______________
- Project Manager: _______________

**Status**: ☐ Complete  ☐ In Progress  ☐ Not Started  
**Issues**: _________________________________________________________________

### Day -1: Final Checks

- [ ] Verify staging environment is stable
- [ ] Test all user accounts
- [ ] Verify test data is correct
- [ ] Test email notifications
- [ ] Test all features end-to-end
- [ ] Prepare welcome materials
- [ ] Print all necessary documents
- [ ] Charge all devices
- [ ] Test recording equipment
- [ ] Send reminder emails to participants
- [ ] Confirm room bookings
- [ ] Prepare compensation/gifts
- [ ] Review schedule for next day
- [ ] Get good night's sleep!

**Status**: ☐ Complete  ☐ In Progress  ☐ Not Started  
**Issues**: _________________________________________________________________

---

## Phase 2: Execution (Week 1 - Admin Testing)

### Daily Checklist (Each Testing Day)

#### Morning Preparation
- [ ] Arrive 30 minutes early
- [ ] Set up testing room/equipment
- [ ] Test internet connection
- [ ] Test recording equipment
- [ ] Verify staging environment is up
- [ ] Test user accounts for today's sessions
- [ ] Prepare materials for each participant
- [ ] Review scenarios for today
- [ ] Check schedule and participant names

#### For Each Admin Session

**Pre-Session (15 minutes before)**
- [ ] Set up recording
- [ ] Prepare participant materials
- [ ] Test login credentials
- [ ] Review participant background
- [ ] Prepare observation notes template
- [ ] Have issue tracking form ready

**During Session (2-3 hours)**
- [ ] Welcome participant
- [ ] Get consent for recording
- [ ] Start recording
- [ ] Conduct introduction (15 min)
- [ ] Guide through scenarios (90-120 min)
  - [ ] A1: Dashboard Navigation
  - [ ] A2: Character Choice Management
  - [ ] A3: Production Stage Progression
  - [ ] A4: Team Assignment
  - [ ] A5: Blocking and Issue Management
  - [ ] A6: Bulk Operations
  - [ ] A7: Integration with OrdersPage
- [ ] Allow free exploration (15 min)
- [ ] Administer feedback survey (15 min)
- [ ] Conduct wrap-up (10 min)
- [ ] Thank participant and provide compensation

**Post-Session (15 minutes after)**
- [ ] Save all recordings
- [ ] Save observation notes
- [ ] Collect feedback survey
- [ ] Create issue tickets for critical/high issues
- [ ] Update tracking spreadsheet
- [ ] Quick team debrief
- [ ] Prepare for next session

**Session Tracking**:

**Admin Session 1**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 7
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Admin Session 2**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 7
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Admin Session 3**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 7
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Admin Session 4**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 7
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Admin Session 5**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 7
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

#### End of Day
- [ ] Consolidate all feedback
- [ ] Review all issues found today
- [ ] Triage and prioritize issues
- [ ] Assign issues to developers
- [ ] Update UAT status report
- [ ] Prepare for next day
- [ ] Send daily update to project team

**Daily Summary**:
- Sessions Completed: _____ of _____
- Total Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Average Usability Rating: _____/5
- Key Findings: _________________________________________________________________

### End of Week 1: Admin Testing Complete

- [ ] All 5 admin sessions completed
- [ ] All feedback surveys collected
- [ ] All issues documented and triaged
- [ ] Critical issues assigned for immediate fix
- [ ] High priority issues assigned
- [ ] Preliminary analysis complete
- [ ] Week 1 summary report prepared
- [ ] Stakeholder update sent
- [ ] Prepare for customer testing week

**Week 1 Summary**:
- Admin Sessions Completed: _____ of 5
- Average Completion Rate: _____%
- Average Usability Rating: _____/5
- Total Issues: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Critical Issues Fixed: _____ of _____
- Go/No-Go for Customer Testing: ☐ GO ☐ NO-GO

---

## Phase 3: Execution (Week 2 - Customer Testing)

### Weekend Preparation

- [ ] Review and fix critical issues from admin testing
- [ ] Update staging environment with fixes
- [ ] Retest fixed issues
- [ ] Update test data if needed
- [ ] Prepare customer testing materials
- [ ] Review customer scenarios
- [ ] Prepare mobile devices
- [ ] Send reminder emails to customer participants

### Daily Checklist (Each Testing Day)

#### For Each Customer Session

**Pre-Session (10 minutes before)**
- [ ] Set up recording
- [ ] Prepare participant materials
- [ ] Test login credentials
- [ ] Prepare mobile device (if needed)
- [ ] Have observation notes ready

**During Session (30-45 minutes)**
- [ ] Welcome participant
- [ ] Get consent for recording
- [ ] Start recording
- [ ] Conduct introduction (10 min)
- [ ] Guide through scenarios (20-25 min)
  - [ ] C1: Character Selection
  - [ ] C2: Order Progress Tracking
  - [ ] C3: Mobile Experience
- [ ] Administer feedback survey (10 min)
- [ ] Conduct wrap-up (5 min)
- [ ] Thank participant and provide compensation

**Post-Session (10 minutes after)**
- [ ] Save all recordings
- [ ] Save observation notes
- [ ] Collect feedback survey
- [ ] Create issue tickets
- [ ] Update tracking spreadsheet
- [ ] Prepare for next session

**Session Tracking**:

**Customer Session 1**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 3
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Customer Session 2**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 3
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Customer Session 3**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 3
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Customer Session 4**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 3
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Customer Session 5**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 3
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Customer Session 6**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 3
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Customer Session 7**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 3
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Customer Session 8**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 3
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Customer Session 9**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 3
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

**Customer Session 10**
- Date: _______________ Time: _______________
- Participant: _______________
- Completion Status: ☐ Complete ☐ Partial ☐ Cancelled
- Scenarios Completed: _____ of 3
- Issues Found: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Usability Rating: _____/5
- Notes: _________________________________________________________________

### End of Week 2: Customer Testing Complete

- [ ] All 10 customer sessions completed
- [ ] All feedback surveys collected
- [ ] All issues documented and triaged
- [ ] Follow-up interviews scheduled (if needed)
- [ ] Week 2 summary report prepared
- [ ] Stakeholder update sent

**Week 2 Summary**:
- Customer Sessions Completed: _____ of 10
- Average Completion Rate: _____%
- Average Usability Rating: _____/5
- Total Issues: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Net Promoter Score: _____/10

---

## Phase 4: Analysis and Reporting

### Data Consolidation

- [ ] Compile all feedback surveys
- [ ] Compile all observation notes
- [ ] Compile all issue tickets
- [ ] Compile all recordings
- [ ] Create master issues list
- [ ] Calculate success metrics
- [ ] Analyze feedback themes
- [ ] Identify common pain points
- [ ] Identify most liked features

**Overall Statistics**:
- Total Participants: _____ (_____ admin, _____ customer)
- Total Sessions: _____
- Overall Completion Rate: _____%
- Overall Usability Rating: _____/5
- Total Issues: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Issues Fixed: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)
- Issues Remaining: _____ (_____ Critical, _____ High, _____ Medium, _____ Low)

### Success Criteria Assessment

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| Scenario Completion Rate | ≥ 90% | _____% | ☐ Pass ☐ Fail |
| Admin Usability Rating | ≥ 4/5 | _____/5 | ☐ Pass ☐ Fail |
| Customer Usability Rating | ≥ 4/5 | _____/5 | ☐ Pass ☐ Fail |
| Critical Issues | 0 | _____ | ☐ Pass ☐ Fail |
| High Priority Issues | < 5 | _____ | ☐ Pass ☐ Fail |
| Tasks Without Assistance | ≥ 80% | _____% | ☐ Pass ☐ Fail |
| Admin Participation | 100% | _____% | ☐ Pass ☐ Fail |
| Customer Participation | ≥ 80% | _____% | ☐ Pass ☐ Fail |

**Criteria Met**: _____ of 8 (____%)

### UAT Summary Report

- [ ] Complete UAT_SUMMARY_REPORT_TEMPLATE.md
- [ ] Include executive summary
- [ ] Include detailed findings
- [ ] Include issue summary
- [ ] Include feedback analysis
- [ ] Include recommendations
- [ ] Include go/no-go decision
- [ ] Include next steps
- [ ] Attach all supporting documents

**Report Status**: ☐ Complete ☐ In Progress ☐ Not Started

### Presentation and Sign-Off

- [ ] Prepare presentation slides
- [ ] Schedule presentation meeting
- [ ] Present findings to project team
- [ ] Present findings to stakeholders
- [ ] Present findings to management
- [ ] Address questions and concerns
- [ ] Get sign-off from stakeholders
- [ ] Document decisions made

**Presentation Date**: _______________  
**Attendees**: _________________________________________________________________

**Go/No-Go Decision**: ☐ GO ☐ GO with Conditions ☐ NO-GO

**Conditions (if applicable)**: _________________________________________________________________

**Sign-Off**:
- Project Manager: _______________ Date: _______________
- Product Owner: _______________ Date: _______________
- Development Lead: _______________ Date: _______________

---

## Phase 5: Follow-Up Actions

### Immediate Actions (Before Production)

- [ ] Fix all critical issues
- [ ] Fix all high priority issues
- [ ] Retest all fixes
- [ ] Update documentation
- [ ] Prepare training materials
- [ ] Plan production deployment
- [ ] Schedule deployment date

**Critical Issues**:
1. Issue ID: _____ Status: ☐ Fixed ☐ In Progress ☐ Not Started
2. Issue ID: _____ Status: ☐ Fixed ☐ In Progress ☐ Not Started
3. Issue ID: _____ Status: ☐ Fixed ☐ In Progress ☐ Not Started

**High Priority Issues**:
1. Issue ID: _____ Status: ☐ Fixed ☐ In Progress ☐ Not Started
2. Issue ID: _____ Status: ☐ Fixed ☐ In Progress ☐ Not Started
3. Issue ID: _____ Status: ☐ Fixed ☐ In Progress ☐ Not Started
4. Issue ID: _____ Status: ☐ Fixed ☐ In Progress ☐ Not Started
5. Issue ID: _____ Status: ☐ Fixed ☐ In Progress ☐ Not Started

### Post-Production Actions

- [ ] Monitor system performance
- [ ] Collect user feedback
- [ ] Address medium/low priority issues
- [ ] Plan future enhancements
- [ ] Conduct post-launch review
- [ ] Document lessons learned
- [ ] Thank participants (follow-up email)

### Lessons Learned

**What Went Well**:
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

**What Could Be Improved**:
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

**Recommendations for Future UAT**:
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

---

## Emergency Contacts

**UAT Coordinator**: _______________  
**Phone**: _______________  
**Email**: _______________

**Technical Support**: _______________  
**Phone**: _______________  
**Email**: _______________

**Project Manager**: _______________  
**Phone**: _______________  
**Email**: _______________

**Backup Coordinator**: _______________  
**Phone**: _______________  
**Email**: _______________

---

## Notes and Observations

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

---

**Checklist Version**: 1.0  
**Last Updated**: _______________  
**Completed By**: _______________  
**Completion Date**: _______________

