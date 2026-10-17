# Security Policy & Architecture

## Supported Versions (Release v1.0.0)

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Architecture
1. **Authentication (`Firebase Authentication`)**:
   - All sign-ins (Google OAuth 2.0, Email & Password, and Passwordless Magic Links) are processed directly through Google Firebase Authentication over TLS/HTTPS.
   - Plaintext passwords are never stored or accessible by application code.
2. **Authorization & Role Gating (`Cloud Firestore Security Rules`)**:
   - **App Developer (`oharajoshua333@gmail.com`)**: Full system control and exclusive access to the Custom HTML/CSS Welcome Banner Designer.
   - **Default Family Don (`zpenrice@gmail.com`)**: Automatically granted full `Don` privileges upon first sign-in (via Google or Email/Password).
   - **Pending Account Isolation**: Newly registered accounts default to `approval_status: "pending"` and cannot view or modify family roster data until approved by the App Developer or Family Don.
   - **Member View-Only Mode**: Standard approved members can view their assigned profile, family tax rates, and the Data Vault in read-only mode.
3. **Data Privacy & Right to Erasure (GDPR / CCPA)**:
   - Any authenticated user can permanently delete their account and associated Firestore profile document at any time via the in-app **Legal, Privacy & Security** modal (`Delete My Account & Data`).

## Reporting a Vulnerability
To report a security issue, please contact the App Developer at `oharajoshua333@gmail.com`.
