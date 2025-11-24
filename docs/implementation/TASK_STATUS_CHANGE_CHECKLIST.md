# 📋 Task Status Change: "pending" → "not started" - Complete Checklist

## 🎯 Overview
Change the task status label from "pending" to "not started" throughout the entire application while maintaining all functionality.

---

## ✅ Frontend Components (UI Changes)

### 1. Task Form Components
- [ ] **`components/Events/EditTaskForm.js`**
  - Line 7: `status: task?.status || 'pending'` → `status: task?.status || 'not_started'`
  - Line 311: `<option value="pending">Pending</option>` → `<option value="not_started">Not Started</option>`

### 2. Kanban Board Components  
- [ ] **`components/Events/KanbanColumn.js`**
  - Line 169: `value={task.status || 'pending'}` → `value={task.status || 'not_started'}`
  - Line 173: `<option value="pending">Pending</option>` → `<option value="not_started">Not Started</option>`

### 3. Task Manager Components
- [ ] **`components/Events/TaskManager.js`**
  - Line 95: `pending: filteredTasks.filter(task => task.status === 'pending' || !task.status)` → `not_started: filteredTasks.filter(task => task.status === 'not_started' || !task.status)`
  - Line 230: `status="pending"` → `status="not_started"`
  - Line 231: `tasks={tasksByStatus.pending}` → `tasks={tasksByStatus.not_started}`

---

## 🔧 Backend API Changes

### 1. Task API
- [ ] **`utils/taskAPI.js`**
  - Line 58: `newTask[column] = taskData[column] || 'pending';` → `newTask[column] = taskData[column] || 'not_started';`

### 2. Event Utils
- [ ] **`utils/eventUtils.js`**
  - Line 200: `status: 'pending',` → `status: 'not_started',`

---

## 🗄️ Database Schema Changes

### 1. Task Table Constraints
- [ ] **Create new migration script** to update task status constraints
- [ ] **Update existing tasks** with status 'pending' to 'not_started'
- [ ] **Update CHECK constraints** in database schema

**Required SQL Migration:**
```sql
-- Update existing tasks
UPDATE tasks SET status = 'not_started' WHERE status = 'pending';

-- Update CHECK constraints (if they exist)
-- Note: This may require dropping and recreating constraints
```

### 2. Database Backup Files
- [ ] **`database/migrations/20250118000017_fix_pins_and_tasks_tables.sql`**
  - Line 55: `status TEXT DEFAULT 'pending',` → `status TEXT DEFAULT 'not_started',`
- [ ] **`database/backup/69_create_scalable_tasks_table.sql`**
  - Line 15: `status text DEFAULT 'pending',` → `status text DEFAULT 'not_started',`
  - Line 31: `CONSTRAINT tasks_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold'))` → `CONSTRAINT tasks_status_check CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled', 'on_hold'))`

---

## 📧 Email Template Changes

### 1. Edge Functions
- [ ] **`supabase/functions/send-notification-email/index.ts`**
  - Update any hardcoded references to 'pending' status in email templates
  - Ensure task status displays correctly in notification emails

---

## 🎭 Mock Data Updates

### 1. Mock Data Files
- [ ] **`utils/mockData.js`**
  - Line 58: `status: 'pending',` → `status: 'not_started',`

---

## ⚠️ Important Considerations

### 1. **Collaboration System** 
- **DO NOT CHANGE** collaborator invitation status from 'pending' to 'not_started'
- The collaborator system uses 'pending' for invitation status, which is different from task status
- Only change task-related 'pending' references

### 2. **Database Migration Strategy**
- **Backup production database** before making changes
- **Test migration on development database** first
- **Update existing data** to maintain consistency
- **Update constraints** to reflect new status values

### 3. **Backward Compatibility**
- Consider if any external integrations expect 'pending' status
- Update API documentation if needed
- Ensure mobile apps (if any) are updated accordingly

---

## 🧪 Testing Checklist

### 1. **Task Creation**
- [ ] Create new task → defaults to "Not Started"
- [ ] Edit existing task → status options show "Not Started"

### 2. **Kanban Board**
- [ ] Tasks display in "Not Started" column
- [ ] Drag and drop between columns works
- [ ] Status updates work correctly

### 3. **Task Management**
- [ ] Filter by status works correctly
- [ ] Task assignment emails show correct status
- [ ] Task notifications work with new status

### 4. **Database Operations**
- [ ] Task creation saves with 'not_started' status
- [ ] Task updates work correctly
- [ ] Task queries return correct results

---

## 🚀 Deployment Order

1. **Database Migration** (Run first)
   - Update existing tasks
   - Update constraints

2. **Backend API** (Deploy second)
   - Update taskAPI.js
   - Update eventUtils.js

3. **Frontend Components** (Deploy third)
   - Update all UI components
   - Update mock data

4. **Email Templates** (Deploy last)
   - Update edge functions
   - Test email notifications

---

## 📝 Files to Modify Summary

**Frontend (4 files):**
- `components/Events/EditTaskForm.js`
- `components/Events/KanbanColumn.js` 
- `components/Events/TaskManager.js`
- `utils/mockData.js`

**Backend (2 files):**
- `utils/taskAPI.js`
- `utils/eventUtils.js`

**Database (2+ files):**
- New migration script (create)
- `database/migrations/20250118000017_fix_pins_and_tasks_tables.sql`
- `database/backup/69_create_scalable_tasks_table.sql`

**Email Templates (1 file):**
- `supabase/functions/send-notification-email/index.ts`

**Total: 9+ files to modify**
