# Changelog

## [v1.0.0] - 2026-10-16 — Official Version 1.0.0 Release

### Added
- **Mandatory Login & Account Creation Portal**: Supports Official Google Sign-In (`GoogleAuthProvider`), Email & Password Sign-In / Registration, and Passwordless Magic Links.
- **Role Hierarchy & Default Leadership**:
  - **App Developer (`oharajoshua333@gmail.com`)**: Full system control + exclusive **Custom HTML/CSS Welcome Message Designer**.
  - **Default Family Don (`zpenrice@gmail.com`)**: Automatically granted full **Don** command permissions on first sign-in whether via Google or Email/Password.
  - **Granular Rank Permissions Delegation**: App Developer and Don can toggle specific permissions (`Add/Edit/Remove Members & Log Pay`, `Week Rollover & Treasury`, `Level Tax Brackets`, `Set Individual Member Tax`) for `Underboss`, `Capo`, `Soldier`, and `Associate`.
- **Account Approval Queue & Roster Profile Linking**: New signups are placed in `pending` status until approved and can be linked directly to pre-created roster profiles.
- **Editable & Removable Level Tax Brackets**: Add new level brackets, tap any existing bracket to edit its level/tax amount, or delete brackets with 1 click.
- **Member View-Only Experience**: Approved family members view their assigned profile, family tax rates/paid statuses, and the **Data Vault** in strict read-only mode.
- **Mobile-First PWA & Native Install Support**: Custom crest icon (`cartel-logo.png`), vector favicon (`icon.svg`), `manifest.json`, service worker (`sw.js`), and subtle Android/iOS install prompt.
- **Legal, Privacy & Security Compliance**: In-app Legal/Privacy/Security modal with 1-click GDPR/CCPA account & data deletion, plus `LICENSE`, `SECURITY.md`, and `PRIVACY_AND_TERMS.md`.
