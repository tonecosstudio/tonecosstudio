# Tasks: AI Vision Classification System

## Status Legend
- `[ ]` Not started
- `[-]` In progress
- `[x]` Completed

---

## Phase 1: Backend Infrastructure (Week 1)

### 1. Database Setup

#### 1.1 Create Migration File
- [x] Create `supabase/migrations/20260201000000_add_ai_vision.sql`
- [x] Add `ai_vision_cache` table definition
- [x] Add `ai_processing_jobs` table definition
- [x] Add indexes for performance
- [x] Add RLS policies for security
- [ ] Test migration locally

#### 1.2 Apply Migration
- [x] Run migration on local Supabase
- [x] Verify tables created correctly
- [x] Test RLS policies
- [ ] Apply migration to production
- [ ] Verify production database

---

### 2. Shared AI Helpers

#### 2.1 Create Vision Helper File
- [x] Create `supabase/functions/_shared/ai-vision.ts`
- [x] Define `VisionClassification` type
- [x] Implement `classifyImageWithVision()` function
- [x] Add error handling and retry logic
- [ ] Add unit tests

#### 2.2 Implement OpenAI Vision Integration
- [x] Create `callOpenAIVision()` function
- [x] Build vision prompt for GPT-4 Vision
- [x] Parse OpenAI response
- [x] Handle OpenAI-specific errors
- [ ] Test with sample images (gpt-4o-mini and gpt-4o)

#### 2.3 Add Cost Calculation
- [x] Create `calculateCost()` function
- [x] Add pricing constants for each model (gpt-4o-mini, gpt-4o)
- [x] Calculate based on tokens used
- [ ] Add tests for cost calculation

#### 2.4 Add Image Hashing
- [x] Create `hashImage()` function using SHA-256
- [ ] Test hash consistency
- [x] Add to cache lookup logic

---

### 3. Edge Function: classify-image-vision

#### 3.1 Create Function Structure
- [x] Create `supabase/functions/classify-image-vision/index.ts`
- [x] Add CORS handling
- [x] Add admin authentication check
- [x] Add request validation

#### 3.2 Implement Core Logic
- [x] Fetch image from `images_queue`
- [x] Generate public URL from storage
- [x] Check cache for existing result
- [x] Call `classifyImageWithVision()` if not cached
- [x] Apply franchise rules to result
- [x] Save result to cache
- [x] Update `images_queue` with classification

#### 3.3 Add Error Handling
- [x] Handle missing image errors
- [x] Handle AI API errors
- [x] Handle storage errors
- [x] Add retry logic with exponential backoff
- [ ] Log all errors

#### 3.4 Test Function
- [ ] Test with valid image
- [ ] Test with invalid image ID
- [ ] Test with cache hit
- [ ] Test with cache miss
- [ ] Test error scenarios
- [ ] Test with different models

#### 3.5 Deploy Function
- [x] Deploy to staging
- [x] Test in staging environment
- [ ] Deploy to production
- [ ] Verify production deployment

---

### 4. Edge Function: process-queue-batch

#### 4.1 Create Function Structure
- [x] Create `supabase/functions/process-queue-batch/index.ts`
- [x] Add CORS handling
- [x] Add admin authentication check
- [x] Add request validation

#### 4.2 Implement Job Creation
- [x] Create job in `ai_processing_jobs`
- [x] Fetch pending images from queue
- [ ] Calculate estimated cost and time
- [x] Return job ID to client

#### 4.3 Implement Batch Processing
- [x] Process images in parallel (max 5 concurrent)
- [x] Call `classify-image-vision` for each image
- [x] Update job progress after each image
- [x] Handle individual image failures
- [x] Continue processing on errors

#### 4.4 Implement Job Completion
- [x] Mark job as completed
- [x] Calculate final statistics
- [x] Update job with final metrics
- [ ] Send completion notification (optional)

#### 4.5 Test Function
- [ ] Test with 5 images
- [ ] Test with 50 images
- [ ] Test with errors
- [ ] Test concurrent processing
- [ ] Test job progress updates

#### 4.6 Deploy Function
- [x] Deploy to staging
- [x] Test in staging environment
- [ ] Deploy to production
- [ ] Verify production deployment

---

## Phase 2: Frontend Integration (Week 2)

### 5. Upload Page Enhancement

#### 5.1 Add AI Processing UI
- [x] Add "Processar com IA" card to `UploadQueue.tsx`
- [x] Add model selector dropdown (GPT-4o mini / GPT-4o)
- [x] Add cost estimate display
- [x] Add time estimate display
- [x] Add "Processar" button

#### 5.2 Implement Processing Logic
- [x] Create `handleProcessBatch()` function
- [x] Call `process-queue-batch` Edge Function
- [ ] Poll for job progress
- [x] Update progress bar in real-time
- [x] Handle completion
- [x] Handle errors

#### 5.3 Add Progress Tracking
- [x] Add progress bar component
- [x] Show "X of Y processed"
- [ ] Show estimated time remaining
- [ ] Show current image being processed
- [ ] Add cancel button (optional)

#### 5.4 Test Upload Page
- [ ] Test with 10 images
- [ ] Test with different models
- [ ] Test progress updates
- [ ] Test error handling
- [ ] Test UI responsiveness

---

### 6. Conveyor Mode Enhancement

#### 6.1 Add AI Suggestion Display
- [x] Add "Sugestão da IA" badge to `Conveyor.tsx`
- [x] Show confidence percentage
- [x] Highlight AI-suggested fields
- [x] Add visual indicator (sparkle icon)

#### 6.2 Pre-fill Fields with AI Data
- [x] Fetch AI suggestion from `images_queue`
- [x] Pre-fill name field
- [x] Pre-fill franchise field
- [x] Pre-fill category/subcategory
- [x] Pre-fill tags

#### 6.3 Add Reanalyze Button
- [x] Add "Reanalisar com IA" button
- [x] Implement `handleReanalyze()` function
- [x] Call `classify-image-vision` with `forceReprocess: true`
- [x] Update fields with new suggestion
- [x] Show loading state

#### 6.4 Track Acceptance
- [ ] Track if admin accepts without edits
- [ ] Track if admin edits before accepting
- [ ] Update `ai_vision_cache` with feedback
- [ ] Use for quality metrics

#### 6.5 Test Conveyor Mode
- [ ] Test with AI suggestions
- [ ] Test reanalyze functionality
- [ ] Test editing suggestions
- [ ] Test accepting suggestions
- [ ] Test keyboard shortcuts

---

### 7. Stats Page (New)

#### 7.1 Create Stats Page
- [ ] Create `src/pages/admin/AIStats.tsx`
- [ ] Add route to `App.tsx`
- [ ] Add link in admin navigation
- [ ] Add page layout with cards

#### 7.2 Implement Metrics Cards
- [ ] Add "Total Processed" card
- [ ] Add "Total Cost" card
- [ ] Add "Acceptance Rate" card
- [ ] Add "Avg Processing Time" card
- [ ] Fetch data from `ai_vision_cache`

#### 7.3 Add Charts
- [ ] Add model usage bar chart
- [ ] Add cost over time line chart
- [ ] Add acceptance rate trend
- [ ] Use Recharts library

#### 7.4 Add Filters
- [ ] Add date range filter
- [ ] Add model filter
- [ ] Add export to CSV button (optional)

#### 7.5 Test Stats Page
- [ ] Test with sample data
- [ ] Test filters
- [ ] Test charts rendering
- [ ] Test responsiveness

---

## Phase 3: Testing & Optimization (Week 3)

### 8. Integration Testing

#### 8.1 End-to-End Tests
- [ ] Test full flow: upload → process → review → confirm
- [ ] Test with 10 sample images
- [ ] Test with different models
- [ ] Test error scenarios
- [ ] Test concurrent users

#### 8.2 Performance Testing
- [ ] Test with 100 images
- [ ] Measure processing time
- [ ] Measure cost accuracy
- [ ] Test cache hit rate
- [ ] Test parallel processing

#### 8.3 Quality Testing
- [ ] Test classification accuracy
- [ ] Test franchise matching
- [ ] Test tag quality
- [ ] Compare Gemini vs GPT-4o
- [ ] Measure acceptance rate

---

### 9. Optimization

#### 9.1 Cache Optimization
- [ ] Verify cache is working
- [ ] Measure cache hit rate
- [ ] Add cache warming (optional)
- [ ] Add cache invalidation logic

#### 9.2 Cost Optimization
- [ ] Verify Gemini is used by default
- [ ] Verify fallback logic works
- [ ] Optimize image sizes before sending
- [ ] Reduce prompt length if possible

#### 9.3 Performance Optimization
- [ ] Optimize parallel processing
- [ ] Add request batching
- [ ] Optimize database queries
- [ ] Add indexes if needed

---

### 10. Documentation

#### 10.1 User Documentation
- [ ] Write admin guide for AI processing
- [ ] Document model selection
- [ ] Document cost estimates
- [ ] Add troubleshooting section

#### 10.2 Technical Documentation
- [ ] Document Edge Functions
- [ ] Document database schema
- [ ] Document API endpoints
- [ ] Add code comments

#### 10.3 Update Existing Docs
- [ ] Update `PROXIMOS_PASSOS.md`
- [ ] Update `ADMIN_COMPLETO_FINAL.md`
- [ ] Update `README.md`

---

### 11. Deployment

#### 11.1 Staging Deployment
- [ ] Deploy database migration to staging
- [ ] Deploy Edge Functions to staging
- [ ] Deploy frontend to staging
- [ ] Test in staging environment

#### 11.2 Production Deployment
- [ ] Deploy database migration to production
- [ ] Deploy Edge Functions to production
- [ ] Deploy frontend to production
- [ ] Verify production deployment

#### 11.3 Monitoring Setup
- [ ] Set up error alerts
- [ ] Set up cost alerts
- [ ] Set up performance monitoring
- [ ] Create dashboard for metrics

---

### 12. Training & Rollout

#### 12.1 Team Training
- [ ] Train admins on new features
- [ ] Demonstrate AI processing
- [ ] Explain model selection
- [ ] Show stats page

#### 12.2 Gradual Rollout
- [ ] Enable for 1 admin user (week 1)
- [ ] Enable for 3 admin users (week 2)
- [ ] Enable for all admins (week 3)
- [ ] Monitor and adjust

#### 12.3 Feedback Collection
- [ ] Collect admin feedback
- [ ] Measure time savings
- [ ] Measure acceptance rate
- [ ] Identify improvements

---

## Optional Enhancements (Future)

### 13. Advanced Features

#### 13.1 Duplicate Detection
- [ ] Generate image embeddings
- [ ] Compare embeddings for similarity
- [ ] Flag potential duplicates
- [ ] Add UI to review duplicates

#### 13.2 Learning from Feedback
- [ ] Track admin corrections
- [ ] Build correction dataset
- [ ] Fine-tune prompts based on corrections
- [ ] Improve accuracy over time

#### 13.3 Batch Operations
- [ ] Add "Accept All" button
- [ ] Add "Reject All" button
- [ ] Add bulk editing
- [ ] Add bulk reprocessing

#### 13.4 Advanced Analytics
- [ ] Add accuracy by franchise
- [ ] Add accuracy by category
- [ ] Add cost breakdown by model
- [ ] Add ROI calculator

---

## Estimated Timeline

### Week 1: Backend (40 hours)
- Database: 4 hours
- Shared helpers: 12 hours
- Edge Functions: 16 hours
- Testing: 8 hours

### Week 2: Frontend (40 hours)
- Upload page: 8 hours
- Conveyor mode: 12 hours
- Stats page: 12 hours
- Testing: 8 hours

### Week 3: Polish (40 hours)
- Integration testing: 12 hours
- Optimization: 12 hours
- Documentation: 8 hours
- Deployment: 8 hours

**Total: 120 hours (~3 weeks)**

---

## Dependencies

### External
- Lovable AI Gateway (Gemini)
- OpenAI API (GPT-4)
- Supabase Storage

### Internal
- Upload system (exists)
- Conveyor mode (exists)
- Franchise rules (exists)
- Admin authentication (exists)

---

## Risk Mitigation

### High Priority
- [ ] Test with real images before full rollout
- [ ] Monitor costs closely in first week
- [ ] Have rollback plan ready
- [ ] Keep manual mode as fallback

### Medium Priority
- [ ] Document all API limits
- [ ] Set up cost alerts
- [ ] Create error playbook
- [ ] Train backup admin

---

**Status:** Ready for Implementation  
**Version:** 1.0  
**Date:** 31 de Janeiro de 2026  
**Author:** Kiro AI
