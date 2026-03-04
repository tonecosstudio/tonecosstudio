# UAT Execution Guide
## Production Management System - User Acceptance Testing

**Version**: 1.0  
**Date**: January 2025  
**Purpose**: Step-by-step guide for conducting UAT sessions with admin and customer users

---

## Table of Contents

1. [Pre-Execution Checklist](#pre-execution-checklist)
2. [Participant Recruitment](#participant-recruitment)
3. [Session Preparation](#session-preparation)
4. [Conducting Admin Sessions](#conducting-admin-sessions)
5. [Conducting Customer Sessions](#conducting-customer-sessions)
6. [Real-Time Issue Tracking](#real-time-issue-tracking)
7. [Feedback Collection Process](#feedback-collection-process)
8. [Post-Session Activities](#post-session-activities)
9. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Pre-Execution Checklist

### 2 Weeks Before UAT

- [ ] **Test Environment Setup**
  - [ ] Staging environment deployed and stable
  - [ ] Test database populated with UAT test data (run `UAT_TEST_DATA_SETUP.sql`)
  - [ ] Email service configured (test email delivery)
  - [ ] Supabase Realtime enabled and tested
  - [ ] Storage bucket configured for photo uploads
  - [ ] All migrations applied successfully

- [ ] **Access Credentials**
  - [ ] Create 5 admin test accounts (`uat_admin_1@test.com` through `uat_admin_5@test.com`)
  - [ ] Create 10 customer test accounts (`uat_customer_1@test.com` through `uat_customer_10@test.com`)
  - [ ] Generate secure passwords and store in password manager
  - [ ] Test login for all accounts
  - [ ] Verify role permissions are correct

- [ ] **Documentation Preparation**
  - [ ] Print UAT Documentation (or prepare digital copies)
  - [ ] Print feedback templates for each participant
  - [ ] Prepare observation notes templates
  - [ ] Create issue tracking spreadsheet
  - [ ] Prepare consent forms (if required)

- [ ] **Participant Recruitment**
  - [ ] Identify 5 admin users (2 experienced, 2 intermediate, 1 new)
  - [ ] Identify 10 customer users (mix of tech levels and order types)
  - [ ] Send recruitment emails with UAT overview
  - [ ] Confirm availability and schedule sessions
  - [ ] Send calendar invitations with session details

### 1 Week Before UAT

- [ ] **Session Scheduling**
  - [ ] Create detailed schedule with participant names and times
  - [ ] Book testing rooms or video conference links
  - [ ] Send reminder emails to participants
  - [ ] Confirm technical requirements (browser, device)
  - [ ] Arrange for backup participants if needed

- [ ] **Technical Preparation**
  - [ ] Test screen recording software
  - [ ] Prepare screen sharing setup
  - [ ] Test audio/video equipment
  - [ ] Verify internet connectivity
  - [ ] Prepare backup devices

- [ ] **Team Preparation**
  - [ ] Brief UAT coordinator on process
  - [ ] Brief observers on what to watch for
  - [ ] Brief technical support on common issues
  - [ ] Conduct dry run with internal team member
  - [ ] Review all test scenarios

### 1 Day Before UAT

- [ ] **Final Checks**
  - [ ] Verify test environment is stable
  - [ ] Test all user accounts
  - [ ] Verify test data is correct
  - [ ] Check email notifications are working
  - [ ] Prepare welcome materials for participants
  - [ ] Print or prepare digital copies of all materials
  - [ ] Charge all devices
  - [ ] Test recording equipment

---

## Participant Recruitment

### Admin User Recruitment

**Target Profile**:
- Current admin users familiar with existing OrdersPage
- Mix of experience levels
- Roles: Production managers, order managers, customer service
- Available for 2-3 hour session

**Recruitment Email Template**:

```
Subject: Invitation to Test New Production Management System

Dear [Name],

We're excited to invite you to participate in User Acceptance Testing (UAT) for our new Production Management System. Your feedback will be invaluable in ensuring the system meets your needs.

**What is UAT?**
UAT is a testing phase where real users try out the new system and provide feedback before it goes live.

**Time Commitment**:
- One 2-3 hour session
- 15-minute post-test survey
- Optional 15-minute follow-up interview

**When**:
Week of [dates] - we'll work with your schedule

**What You'll Do**:
- Test the new production dashboard
- Try character choice management features
- Provide honest feedback on usability
- Report any issues you encounter

**Compensation**:
[If applicable: Gift card, extra PTO, lunch provided, etc.]

**Why Your Participation Matters**:
Your real-world experience will help us create a system that truly works for you and improves your daily workflow.

**Next Steps**:
Please reply by [date] if you're interested. We'll then schedule a specific time that works for you.

Questions? Contact [UAT Coordinator] at [email/phone]

Thank you for considering this opportunity!

Best regards,
[Project Manager Name]
```

### Customer User Recruitment

**Target Profile**:
- Mix of subscribers and standalone purchasers
- Various technical skill levels
- Age range 18-55
- Previous order experience preferred

**Recruitment Email Template**:

```
Subject: Help Us Improve Your Order Tracking Experience

Dear [Customer Name],

We're developing a new order tracking system that will give you better visibility into your order's progress, and we'd love your feedback!

**What We're Asking**:
- 30-45 minute testing session
- Try out the new order tracking features
- Share your honest thoughts
- Help us make it better for all customers

**When**:
Week of [dates] - flexible scheduling available

**What You'll Get**:
- Early access to the new tracking system
- [Compensation: $25 gift card, discount code, etc.]
- The satisfaction of helping improve our service

**What You'll Do**:
- View your order progress
- Try selecting a character (if applicable)
- Test the mobile experience
- Complete a short survey

**No Technical Skills Required**:
We want feedback from all types of users - tech-savvy or not!

**Interested?**
Reply by [date] and we'll schedule a time that works for you. Sessions available mornings, afternoons, and evenings.

Questions? Contact [UAT Coordinator] at [email/phone]

Thank you for being a valued customer!

Best regards,
[Company Name] Team
```

### Confirmation Email Template

```
Subject: UAT Session Confirmed - [Date/Time]

Dear [Name],

Thank you for agreeing to participate in our User Acceptance Testing!

**Your Session Details**:
- Date: [Date]
- Time: [Time] ([Duration])
- Location: [In-person address OR Video conference link]

**What to Bring**:
- [For in-person: Photo ID, laptop if preferred]
- [For remote: Stable internet connection, webcam, microphone]

**Before Your Session**:
- No preparation needed!
- We want to see your natural reactions
- There are no wrong answers

**What to Expect**:
1. Brief introduction (5-10 minutes)
2. Hands-on testing (main session)
3. Feedback survey (10-15 minutes)
4. Questions and wrap-up

**Access Information**:
[For remote sessions: Video conference link and meeting ID]
[For in-person: Building access instructions]

**Contact Information**:
If you need to reschedule or have questions:
- UAT Coordinator: [Name]
- Email: [email]
- Phone: [phone]

**Reminder**:
We'll send a reminder 24 hours before your session.

Looking forward to your feedback!

Best regards,
[UAT Coordinator Name]
```

---

## Session Preparation

### Room Setup (In-Person Sessions)

**Equipment Needed**:
- Computer with access to staging environment
- Large monitor or screen for better visibility
- Screen recording software running
- Audio recording device (with consent)
- Backup laptop in case of technical issues
- Notepad and pens for observer
- Printed materials (scenarios, feedback forms)
- Water and snacks for participant

**Room Arrangement**:
- Participant sits at computer
- Observer sits to the side (not directly behind)
- Minimize distractions
- Ensure good lighting
- Quiet environment

### Remote Session Setup

**Technical Requirements**:
- Video conferencing software (Zoom, Teams, etc.)
- Screen sharing enabled
- Recording enabled (with consent)
- Stable internet connection
- Backup communication method (phone number)

**Participant Requirements**:
- Send technical requirements email 2 days before
- Browser: Chrome, Firefox, Safari, or Edge (latest version)
- Stable internet connection
- Webcam and microphone
- Quiet environment

### Materials Checklist

**For Each Session**:
- [ ] Participant consent form (if required)
- [ ] Test account credentials
- [ ] Scenario instructions
- [ ] Observation notes template
- [ ] Feedback survey (digital or printed)
- [ ] Issue tracking form
- [ ] Backup scenarios (if time permits)
- [ ] Thank you gift/compensation

---

## Conducting Admin Sessions

### Session Structure (2-3 hours)

#### Part 1: Introduction (15 minutes)

**Welcome and Introductions**:
```
"Hi [Name], thank you so much for participating today. I'm [Your Name], 
and I'll be guiding you through this session. 

Before we start, I want to emphasize a few things:
- We're testing the system, not you
- There are no wrong answers
- Your honest feedback is what we need
- Feel free to think out loud as you work
- Ask questions anytime

Do you have any questions before we begin?"
```

**Consent and Recording**:
```
"For our records and to help the development team, we'd like to record 
your screen and our conversation. This will only be used internally and 
won't be shared publicly. Are you comfortable with that?"

[Get verbal or written consent]
```

**System Overview** (5 minutes):
```
"Let me give you a quick overview of what we're testing today. This is 
the new Production Management System designed to help you manage the 
production queue, character choices, and track orders through production 
stages.

The goal is to make your job easier and more efficient. Today, you'll 
try out the main features and let us know what works and what doesn't."
```

**Login and First Impressions**:
```
"Here are your test credentials. Go ahead and log in, and tell me your 
first impressions as you see the interface."

[Hand over credentials]
[Observe and note first reactions]
```

#### Part 2: Guided Scenarios (90-120 minutes)

**Scenario A1: Production Dashboard Navigation** (20 minutes)

**Instructions to Participant**:
```
"For this first scenario, I'd like you to explore the Production Dashboard. 
Imagine you've just started your workday and want to see what needs to be 
produced today.

Try switching between the different views - Kanban, List, and Calendar - 
and tell me which one you prefer and why.

Then, try filtering the dashboard to show only items in the 'Design' stage 
from the 'Marvel Heroes' collection.

Remember to think out loud as you work."
```

**Observer Notes**:
- How quickly do they find the view switcher?
- Do they understand the difference between views?
- Can they apply filters without help?
- Do they understand the metrics bar?
- Any confusion or frustration?

**Probing Questions** (if needed):
- "What are you looking for?"
- "What do you expect to happen when you click that?"
- "Is this what you expected to see?"

---

**Scenario A2: Character Choice Management** (25 minutes)

**Instructions to Participant**:
```
"Now let's try managing character choices. Navigate to the Character 
Choice Manager.

You'll see several pending choices. Find one that's approaching its 
deadline (less than 48 hours) and approve it.

Then, find another choice and reject it with the reason 'Character 
out of stock'.

Finally, find a choice that's not urgent and extend its deadline by 
3 days."
```

**Observer Notes**:
- Can they find the Character Choice Manager?
- Do they understand the deadline urgency indicators?
- Is the approval process intuitive?
- Do they understand what happens after approval/rejection?
- Any confusion about deadline management?

---

**Scenario A3: Production Stage Progression** (30 minutes)

**Instructions to Participant**:
```
"Let's track an order through production stages. Go back to the 
Production Dashboard and select an item in the 'Design' stage.

Move it to the 'Production' stage and add a note: 'Started production 
batch #123'.

Then upload 2 photos (you can use any images from your computer for 
this test).

After that, try to skip directly to the 'Shipped' stage and see what 
happens."
```

**Observer Notes**:
- Is stage progression intuitive?
- Can they add notes easily?
- Is photo upload clear?
- Do they understand why skipping stages is prevented?
- Is the error message helpful?

---

**Scenario A4: Team Assignment** (20 minutes)

**Instructions to Participant**:
```
"Now let's try assigning work to team members. Select 3 items from 
the production queue.

Assign them to the team member 'João Silva'.

Then check João's workload to see how many items he has assigned.

Finally, reassign one of those items to 'Maria Santos' with the 
reason 'Load balancing'."
```

**Observer Notes**:
- Is bulk selection intuitive?
- Can they find the assignment feature?
- Is workload visibility clear?
- Do they understand the reassignment process?

---

**Scenario A5: Blocking and Issue Management** (20 minutes)

**Instructions to Participant**:
```
"Sometimes production gets blocked. Let's simulate that. Select an 
item in the 'Production' stage and mark it as blocked.

Use the reason: 'Waiting for materials delivery' and set the estimated 
resolution time to 3 days.

Then go to the Blocked Items View and see if your item appears there.

Finally, unblock the item with resolution notes: 'Materials received, 
resuming production'."
```

**Observer Notes**:
- Is the blocking workflow clear?
- Do they understand the impact on timelines?
- Can they find blocked items easily?
- Is the unblocking process intuitive?

---

**Scenario A6: Bulk Operations** (15 minutes)

**Instructions to Participant**:
```
"Let's try some bulk operations. Filter the dashboard to show items 
in 'Awaiting Choice' stage.

Select 5 items and assign them all to a team member at once.

Then select 3 items in 'Design' stage and move them all to 'Production' 
stage together."
```

**Observer Notes**:
- Is bulk selection obvious?
- Do bulk operations work smoothly?
- Is progress feedback clear?
- Any performance issues?

---

**Scenario A7: Integration with OrdersPage** (15 minutes)

**Instructions to Participant**:
```
"Finally, let's check how this integrates with the existing OrdersPage. 
Navigate to the OrdersPage (the one you use daily).

Find an order that has production status and view its details.

Then navigate to the Production Dashboard from that order.

Make a stage change in the Production Dashboard, then go back to the 
OrdersPage and verify the status updated."
```

**Observer Notes**:
- Can they navigate between systems easily?
- Is the integration seamless?
- Do status updates sync correctly?
- Any confusion about navigation?

---

#### Part 3: Free Exploration (15 minutes)

**Instructions to Participant**:
```
"Now I'd like you to explore the system on your own. Try any features 
that interest you or that we haven't covered yet. 

Imagine you're using this in your daily work - what would you want to 
do? What would you check first thing in the morning?"
```

**Observer Notes**:
- What features do they gravitate toward?
- What do they try to do that isn't possible?
- What questions do they ask?
- What seems confusing?

#### Part 4: Feedback Survey (15 minutes)

**Instructions to Participant**:
```
"Thank you for testing the system! Now I'd like you to complete this 
feedback survey. Please be completely honest - we want to know what 
works and what doesn't.

Take your time, and feel free to add detailed comments."
```

[Provide UAT_ADMIN_FEEDBACK_TEMPLATE.md]

#### Part 5: Wrap-Up (10 minutes)

**Debrief Questions**:
```
1. "Overall, what did you think of the system?"

2. "What was the most frustrating part?"

3. "What did you like the most?"

4. "Would this system make your job easier? Why or why not?"

5. "If you could change one thing, what would it be?"

6. "Is there anything else you'd like to tell us?"
```

**Thank You and Next Steps**:
```
"Thank you so much for your time and feedback today. Your input is 
incredibly valuable and will help us make this system better.

[Provide compensation if applicable]

We may reach out in a few days for a brief follow-up if we have any 
clarifying questions. 

Do you have any final questions for me?"
```

---

## Conducting Customer Sessions

### Session Structure (30-45 minutes)

#### Part 1: Introduction (10 minutes)

**Welcome**:
```
"Hi [Name], thank you for joining us today! I'm [Your Name], and I'm 
here to get your feedback on our new order tracking system.

A few important things:
- We're testing the system, not you
- Your honest opinion is what we need
- There are no wrong answers
- Feel free to say whatever comes to mind

Sound good?"
```

**Consent and Recording**:
[Same as admin sessions]

**Context Setting**:
```
"We've created a new way for you to track your orders and see exactly 
where they are in production. Today, you'll try it out and tell us if 
it's clear, useful, and easy to use.

You have a test order set up in the system that you'll be tracking."
```

#### Part 2: Guided Scenarios (20-25 minutes)

**Scenario C1: Character Selection** (10 minutes)

**Instructions to Participant**:
```
"Let's start by logging in with these credentials.

[Provide credentials]

Once you're logged in, navigate to your orders and find the one that 
says 'Choose Character'.

Go ahead and choose a character - pick whichever one you like. Tell 
me what you're thinking as you go through the process."
```

**Observer Notes**:
- Can they find the "Choose Character" button?
- Is the character selection interface clear?
- Do they understand the deadline?
- Is the confirmation process reassuring?
- Any confusion or hesitation?

---

**Scenario C2: Order Progress Tracking** (8 minutes)

**Instructions to Participant**:
```
"Now let's look at your order's progress. Find your order and view 
its current status.

Tell me:
- What stage is your order in?
- When do you expect to receive it?
- Is your order on track or delayed?

How confident do you feel about when your order will arrive?"
```

**Observer Notes**:
- Can they identify the current stage?
- Do they understand the progress timeline?
- Are estimated dates clear?
- Do they feel informed?

---

**Scenario C3: Mobile Experience** (7 minutes)

**Instructions to Participant**:
```
"Now let's try this on a mobile device. Here's a phone/tablet with 
the system loaded.

[Provide mobile device]

Try viewing your order progress on mobile. Does everything work? 
Is it easy to read and use?"
```

**Observer Notes**:
- Does the layout work on mobile?
- Is text readable?
- Are buttons easy to tap?
- Any scrolling issues?

---

#### Part 3: Feedback Survey (10 minutes)

[Provide UAT_CUSTOMER_FEEDBACK_TEMPLATE.md]

#### Part 4: Wrap-Up (5 minutes)

**Debrief Questions**:
```
1. "Would this tracking system make you feel more confident about 
   your order?"

2. "Would you check this regularly, or only when you get a notification?"

3. "Is there anything missing that you'd want to know about your order?"

4. "Would you recommend this to other customers?"
```

**Thank You**:
```
"Thank you so much for your feedback! Your input will help us create 
a better experience for all customers.

[Provide compensation]

Enjoy the rest of your day!"
```

---

## Real-Time Issue Tracking

### During the Session

**When an Issue Occurs**:

1. **Note the Issue Immediately**:
   - Write down what happened
   - Note the time
   - Note what the user was trying to do

2. **Don't Interrupt the Flow**:
   - Let the user try to resolve it themselves first
   - Observe their reaction and attempts
   - Only help if they're completely stuck

3. **Ask Clarifying Questions**:
   - "What did you expect to happen?"
   - "What actually happened?"
   - "How does this make you feel?"

4. **Document the Context**:
   - What scenario were they on?
   - What steps led to the issue?
   - Can it be reproduced?

### Issue Severity Assessment

**Critical** - Stop and document immediately:
- System crash
- Data loss
- Cannot complete task at all
- Security issue

**High** - Note and continue:
- Significant confusion
- Wrong result
- Major usability problem
- Requires workaround

**Medium/Low** - Note briefly:
- Minor confusion
- Cosmetic issue
- Unclear label
- Nice-to-have improvement

### Quick Issue Form

For each issue, capture:
```
Issue #: _____
Time: _____
Scenario: _____
What happened: _____
Expected: _____
Actual: _____
User reaction: _____
Severity: _____
```

---

## Feedback Collection Process

### During the Session

**Verbal Feedback**:
- Encourage thinking out loud
- Note direct quotes
- Ask "why" questions
- Probe for details

**Behavioral Feedback**:
- Watch for hesitation
- Note where they get stuck
- Observe facial expressions
- Track time per task

### Post-Session Survey

**Survey Administration**:
- Provide immediately after testing
- Allow 10-15 minutes
- Offer digital or paper format
- Ensure privacy for honest feedback
- Be available for questions

**Survey Completion Tips**:
```
"Please be completely honest in your responses. We want to know what 
really works and what doesn't. Your feedback is anonymous and will 
only be used to improve the system.

Take your time and add detailed comments wherever you can - those are 
the most valuable to us."
```

### Follow-Up Interviews (Optional)

**When to Conduct**:
- Participant had unique insights
- Need clarification on feedback
- Encountered unusual issues
- Represents important user segment

**Scheduling**:
- Within 48 hours of session
- 15 minutes maximum
- Phone or video call
- Confirm availability first

**Interview Questions**:
```
1. "I wanted to follow up on [specific feedback]. Can you tell me 
   more about that?"

2. "You mentioned [issue]. How often do you think that would affect 
   your use of the system?"

3. "You suggested [improvement]. Can you describe what that would 
   look like?"

4. "Is there anything else you've thought of since the session?"
```

---

## Post-Session Activities

### Immediately After Each Session (15 minutes)

- [ ] **Save all recordings and notes**
  - Screen recording
  - Audio recording (if applicable)
  - Observer notes
  - Feedback survey

- [ ] **Create issue tickets**
  - For any critical or high-priority issues
  - Use UAT_ISSUE_TRACKING_TEMPLATE.md
  - Assign severity and priority
  - Attach screenshots/recordings

- [ ] **Update tracking spreadsheet**
  - Mark session as complete
  - Note completion rate
  - Record any issues
  - Add key observations

- [ ] **Debrief with team** (if available)
  - Share immediate observations
  - Discuss critical issues
  - Plan any urgent fixes

### Daily (End of Each Testing Day)

- [ ] **Consolidate feedback**
  - Review all feedback surveys
  - Identify common themes
  - Note recurring issues
  - Track sentiment

- [ ] **Triage issues**
  - Review all reported issues
  - Assign severity and priority
  - Assign to developers
  - Estimate effort

- [ ] **Update UAT status**
  - Sessions completed
  - Issues found
  - Fixes implemented
  - Retests needed

- [ ] **Prepare for next day**
  - Review schedule
  - Prepare materials
  - Test environment
  - Confirm participants

### Weekly (End of Each Testing Week)

- [ ] **Analyze results**
  - Calculate success rates
  - Average usability ratings
  - Issue distribution
  - Completion rates

- [ ] **Team meeting**
  - Review progress
  - Discuss major issues
  - Plan fixes
  - Adjust approach if needed

- [ ] **Stakeholder update**
  - Progress report
  - Key findings
  - Critical issues
  - Timeline impact

### After All Sessions Complete

- [ ] **Compile final data**
  - All feedback surveys
  - All observation notes
  - All issue tickets
  - All recordings

- [ ] **Analyze results**
  - Success criteria assessment
  - Usability metrics
  - Issue summary
  - Feedback themes

- [ ] **Prepare UAT Summary Report**
  - Use UAT_SUMMARY_REPORT_TEMPLATE.md
  - Include all findings
  - Make recommendations
  - Provide go/no-go decision

- [ ] **Present findings**
  - To project team
  - To stakeholders
  - To management
  - Get sign-off

---

## Troubleshooting Common Issues

### Technical Issues

**Issue**: Participant can't log in
**Solution**:
- Verify credentials are correct
- Check caps lock
- Try password reset
- Use backup account

**Issue**: System is slow or unresponsive
**Solution**:
- Check internet connection
- Clear browser cache
- Try different browser
- Use backup device
- Note performance issue for tracking

**Issue**: Features not working as expected
**Solution**:
- Note the issue
- Try to reproduce
- Use workaround if available
- Skip scenario if necessary
- Document thoroughly

**Issue**: Screen sharing not working (remote)
**Solution**:
- Check permissions
- Try different browser
- Use alternative screen sharing tool
- Have participant describe what they see

### Participant Issues

**Issue**: Participant is nervous or uncomfortable
**Solution**:
```
"Remember, we're testing the system, not you. There's no way to fail 
this. Your honest reactions are exactly what we need. Take your time 
and relax."
```

**Issue**: Participant is too quiet
**Solution**:
```
"I'd love to hear what you're thinking. Can you tell me what you're 
looking at right now? What are you trying to do?"
```

**Issue**: Participant is rushing
**Solution**:
```
"No need to hurry - we have plenty of time. Take your time to explore 
and really think about each feature."
```

**Issue**: Participant is stuck
**Solution**:
- Wait 30 seconds to see if they figure it out
- Ask: "What are you trying to do?"
- Provide minimal hint
- If still stuck, show them and note the issue

**Issue**: Participant is being too polite
**Solution**:
```
"Please be completely honest - we need to know what doesn't work. 
Negative feedback is just as valuable as positive feedback. You won't 
hurt anyone's feelings!"
```

### Session Management Issues

**Issue**: Running out of time
**Solution**:
- Prioritize critical scenarios
- Skip optional scenarios
- Extend session if participant agrees
- Schedule follow-up if needed

**Issue**: Participant needs to leave early
**Solution**:
- Complete as much as possible
- Prioritize feedback survey
- Offer to complete survey later
- Schedule follow-up if needed

**Issue**: Observer/coordinator emergency
**Solution**:
- Have backup coordinator available
- Reschedule if necessary
- Ensure recordings are running
- Apologize and explain to participant

---

## Best Practices

### Do's

✅ **Make participants comfortable**
- Friendly, welcoming tone
- Emphasize no wrong answers
- Thank them frequently
- Provide breaks if needed

✅ **Stay neutral**
- Don't defend the system
- Don't lead participants
- Don't show disappointment
- Accept all feedback equally

✅ **Observe carefully**
- Watch facial expressions
- Note hesitations
- Track time per task
- Record direct quotes

✅ **Ask open-ended questions**
- "What are you thinking?"
- "What do you expect to happen?"
- "How does this make you feel?"
- "What would you change?"

✅ **Document thoroughly**
- Take detailed notes
- Record sessions
- Capture screenshots
- Save all feedback

### Don'ts

❌ **Don't interrupt**
- Let them struggle a bit
- See how they problem-solve
- Only help when truly stuck

❌ **Don't explain too much**
- Minimal instructions
- Let them discover
- See what's intuitive

❌ **Don't defend the system**
- Accept criticism gracefully
- Don't make excuses
- Don't explain why it is that way

❌ **Don't lead the participant**
- Don't point to buttons
- Don't tell them what to click
- Let them find their own way

❌ **Don't rush**
- Allow time for exploration
- Let them think
- Silence is okay

---

## Success Indicators

### During Sessions

**Good Signs**:
- Participant completes tasks without help
- Positive verbal feedback
- Smiling, nodding
- Quick task completion
- Confident navigation
- "This is easy!"
- "I like this!"

**Warning Signs**:
- Frequent confusion
- Asking for help repeatedly
- Frustrated expressions
- Long task completion times
- Getting lost
- "I don't understand"
- "This is confusing"

### After Sessions

**Success Indicators**:
- High usability ratings (≥4/5)
- High completion rates (≥90%)
- Positive feedback themes
- Few critical issues
- Participants would recommend
- Participants express confidence

**Concern Indicators**:
- Low usability ratings (<4/5)
- Low completion rates (<90%)
- Negative feedback themes
- Many critical issues
- Participants wouldn't recommend
- Participants express doubt

---

## Contact Information

**UAT Coordinator**: [Name]  
**Email**: [email]  
**Phone**: [phone]  
**Emergency Contact**: [name/phone]

**Technical Support**: [Name]  
**Email**: [email]  
**Phone**: [phone]

**Project Manager**: [Name]  
**Email**: [email]  
**Phone**: [phone]

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: After UAT completion

