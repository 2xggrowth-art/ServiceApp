# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Bharath Cycle Hub - Service Management System** is a pre-development project currently in the planning/documentation phase. No source code exists yet. The repository contains business requirements, design specifications, and developer handoff documents.

The system will manage a bicycle/motorcycle service workshop with 5-6 mechanics, replacing a manual book-and-pen process. Target MVP date: May 15, 2026.

## Repository Structure

- `files/` — Enhanced system design doc (calendar feature, UI/UX research, color psychology) and developer handoff template (partially complete, ~60%)
- `files (1)/` — Completion summary, step-by-step guide, critical questions worksheet, system creation framework. Contains the fully completed developer handoff template (Sections 1-10)
- `files nnn/` — Final/complete versions of the developer handoff template and completion summary

The most complete developer handoff document is in `files nnn/COMPLETE_developer_handoff_template.md` and `files (1)/developer_handoff_template.md`.

## Key Business Context

- **Business:** Bharath Cycle Hub — sells 500-600 bikes/month, services motorcycles and bicycles
- **Core problem:** No mechanic performance tracking, blame games, cherry-picking of jobs, ₹92K/month revenue loss
- **Users:** Owner (tech skill 8/10), senior mechanics (5-6/10), junior mechanics (3-4/10), support staff (4-5/10)
- **Budget:** ₹3,00,000 for MVP development

## Critical Design Constraints

- **Mobile-first, offline-capable** — mechanics use basic Android phones (2GB RAM, Android 8.0+, 3G/4G)
- **Low-literacy UI** — only 12% English comprehension among mechanics; interface must be icon/photo/color-based with minimal text
- **Performance:** App startup <5s, job status update <2s, photo upload <10s
- **Role-based access:** Owner (full), Senior Mechanic (view all jobs), Junior Mechanic (own jobs only), Support Staff (customer data only)

## Core System Modules (When Building)

1. **Visual Work Calendar** — Kanban-style daily board with photo-based job cards, morning/afternoon time blocks
2. **Auto Job Assignment** — Workload-balanced, skill-matched, anti-cherry-picking during weekends
3. **Performance Tracking** — Time tracking, completion metrics, visual dashboards, weekly rankings
4. **WhatsApp Integration** — Automated customer notifications at service milestones
5. **Photo Documentation** — Before/after photos for job cards and quality verification

## Integration Points

- Zoho Books (billing/customer data import) — must-have
- WhatsApp Business API (customer notifications) — must-have
- Offline-first with sync — critical requirement

## UI/UX Color System

- Primary: Blue `#2563eb` (focus/concentration)
- Success/Complete: Green `#16a34a`
- Action/Priority: Orange `#ea580c`
- Urgent/Warning: Red `#dc2626`
- Text: `#1f2937` on `#f9fafb` (avoid pure black on white)

## Service Data Model

- **Service types:** Regular Service, Complete Makeover (₹2459), Repair, Insurance Service
- **Job status flow:** Received → Parts Check → In Progress → Quality Check → Ready for Pickup
- **Priority levels:** Urgent (red), Standard (yellow), Completed (green)
- **Mechanic team:** Mujju, Appi (senior); Baba, Mohan, Iqbal (junior)
