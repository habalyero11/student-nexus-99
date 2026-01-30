# Student Management System - Diagram Prompts

This document provides detailed prompts for generating diagrams and flowcharts based on the codebase analysis of the **CSU-ULS Student Management System**.

---

### Figure 1. Conceptual Design
**Goal:** To illustrate the entities and their logical relationships within the system.

**Prompt for AI:**
> "Generate a Conceptual Design Diagram for a 'Student Management System' using the following specifications:
> 1. **Core Entities:** `Profile` (User Account), `Student`, `Advisor`, `Subject`, `Grade`, `Attendance`, and `AdvisorAssignment`.
> 2. **Relationships:**
>    - A `Profile` has one `Role` (Admin or Advisor).
>    - An `Advisor` is linked to a `Profile`.
>    - `Students` are the central entity containing academic and personal data.
>    - `AdvisorAssignment` links an `Advisor` to specific `Students`, `Subjects`, `Year Levels`, and `Sections`.
>    - `Grades` are linked to a `Student` and a `Subject`.
>    - `Attendance` records are linked to a `Student`.
>    - `Subjects` are linked to `Grades` and `Assignments`.
> 3. **Attributes:** 
>    - Student: `id`, `lrn`, `year_level`, `section`.
>    - Grade: `written_work`, `performance_task`, `quarterly_assessment`, `final_grade`.
>    - Advisor: `specialization`, `department`.
> 4. **Visual Style:** Entity-Relationship (ER) logic with clear connecting lines and cardinality (e.g., 1:N for Student to Grades)."

---

### Figure 2. System Architecture
**Goal:** To describe the technical stack and how data flows between components.

**Prompt for AI:**
> "Generate a System Architecture Diagram for a modern web application built with the following stack:
> 1. **Client Tier:** React (SPA), Vite (Build tool), TypeScript (Language), Tailwind CSS (Styling), TanStack Query (State Management/API calls), and Lucide React (Icons).
> 2. **Service Tier:** Supabase as Backend-as-a-Service (BaaS).
>    - `Auth`: Handles JWT-based sessions.
>    - `PostgreSQL`: Relational database with Row Level Security (RLS).
>    - `Storage`: Bucket for student documents and profile pictures.
>    - `Edge Functions`: Serverless logic for bulk operations.
> 3. **Architecture Logic:** The Client Tier communicates with Supabase via HTTPS/PostgreSQL protocols. The UI is protected by Auth guards. Data is fetched asynchronously via React Query hooks.
> 4. **Visual Style:** Layered architecture diagram showing Client (Frontend) and Cloud Services (Backend/Supabase) with arrows indicating two-way communication."

---

### Figure 3. System Flow Chart (Administrator)
**Goal:** To map the decision-making process and workflow of the Administrator.

**Prompt for AI:**
> "Create a System Flow Chart for the 'Administrator' role with the following logic:
> 1. **Start:** Login via Auth Page.
> 2. **Authentication:** Check role. If 'Admin', redirect to Admin Dashboard.
> 3. **Main Navigation (Sidebar):**
>    - **Dashboard:** View high-level stats (Total Students, At-Risk Students).
>    - **Advisors Management:** Add/Edit/Delete Advisor profiles; Assign advisors to sections.
>    - **Students Management:** Bulk upload students; Edit records; Delete students.
>    - **Academic Monitoring:** View all Grade Sheets; Check Attendance logs.
>    - **Analytics:** Access 'At-Risk' student reports and 'Performance Trends'.
> 4. **Operations:** Perform CRUD operations on database tables via Supabase UI components.
> 5. **End:** Log out and clear session."

---

### Figure 4. Data Flow Diagram (DFD Level 0)
**Goal:** To show the system boundaries and external entities (Context Diagram).

**Prompt for AI:**
> "Generate a Context Diagram (DFD Level 0) for the 'Student management system':
> 1. **Central Process:** 'Student Management & Academic Tracking System (Student Nexus)'.
> 2. **External Entities:** `Administrator`, `Advisor`, and `Student`.
> 3. **Data Flows:**
>    - `Administrator` -> Input (User Accounts, Assigned Sections, System Config) -> System.
>    - `Advisor` -> Input (Grades, Attendance, Student Comments) -> System.
>    - `Student` -> Request (Grade Viewing, Attendance History) -> System.
>    - System -> Output (Analytics Reports, Performance Alerts) -> `Administrator`.
>    - System -> Output (Filtered Student Lists, Class Records) -> `Advisor`.
>    - System -> Output (Digital Report Card) -> `Student`."

---

### Figure 5. Data Flow Diagram (DFD Level 1)
**Goal:** To break down the internal processes and data stores.

**Prompt for AI:**
> "Generate a Detailed DFD (Level 1) for the 'Student management system' with four primary processes:
> 1. **Process 1.0: Account & Profile Management:** Handles Login, Role Validation, and Profile Updates. Interacts with `Profiles` data store.
> 2. **Process 2.0: Student Information System:** Handles Student Registration, Classification (Year Level/Section), and Assignment. Interacts with `Students` and `Advisors` data stores.
> 3. **Process 3.0: Academic Record Tracking:** Processes Grades entry (Written/Performance/Assessment) and Attendance marking. Interacts with `Grades` and `Attendance` data stores.
> 4. **Process 4.0: Reporting & Analytics Engine:** Aggregates data for 'At-Risk' detection and 'Performance Visualization'. Pulls from all data stores to generate viewable reports for Admin/Advisors."
