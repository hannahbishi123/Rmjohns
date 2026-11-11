# RMJohn's Eatery — Flutter & Firebase Connection Guide

This Flutter app (`rmjohns`) is fully integrated with **Firebase Realtime Database** and **Firebase Auth**, sharing the exact same database structure, design language, and design tokens as the RMJohn's website.

---

## 1. Firebase Architecture & Realtime Database Nodes

Both the website and the Flutter app connect to the root node `eateries/` in Firebase Realtime Database:

| Firebase DB Node | Description | Synchronized Models |
| :--- | :--- | :--- |
| `eateries/menu_items` | Full food & drink menu catalog | `MenuItem` |
| `eateries/orders` | Live customer & POS orders | `OrderModel` |
| `eateries/customers` | Registered customer accounts | `UserProfile` |
| `eateries/staff` | Staff directory & active shift status | `StaffMember` |
| `eateries/payments` | Payment transactions & ledger | `PaymentRecord` |
| `eateries/rewards` | Loyalty claimable rewards | `LoyaltyReward` |
| `eateries/promotions` | Active & scheduled promotions | `Promotion` |
| `eateries/notifications` | Live system notifications | `NotificationItem` |
| `eateries/attendance` | ESP32 RFID card reader tap logs | `ScanEvent` |
| `eateries/points` | Customer loyalty points balance | `int` |

---

## 2. Shared Design Tokens & Theme Alignment

The Flutter app theme matches the website's visual design system (`App.css`):

- **Primary Forest Green**: `#1B3B2B` (`AppColors.forest`)
- **Deep Forest Dark**: `#132B1F` (`AppColors.forestDeep`)
- **Secondary Sage Green**: `#8BA888` (`AppColors.sage`)
- **Lime Accent**: `#D4E157` (`AppColors.lime`)
- **Background Cream**: `#F4F5F0` (`AppColors.bg`)
- **Card Paper**: `#FFFFFF` (`AppColors.paper`)
- **Typography**: `DM Sans` for UI & body text + `Playfair Display` for headings and display brand elements.

---

## 3. How to Connect Your Firebase Project

To connect this Flutter app to your live Firebase project:

1. **Android Setup**:
   - Go to your [Firebase Console](https://console.firebase.google.com/).
   - Add an Android app with package name `com.example.rmjohns` (or your configured package ID).
   - Download `google-services.json` and place it in:
     `rmjohns/android/app/google-services.json`

2. **iOS Setup**:
   - Add an iOS app in your Firebase Console.
   - Download `GoogleService-Info.plist` and place it in:
     `rmjohns/ios/Runner/GoogleService-Info.plist`

3. **Web / Desktop Setup**:
   - If building for Flutter Web, ensure `firebase_core` initializes with your `FirebaseOptions` from `.env`.

---

## 4. Automatic Offline & Live Sync Fallback

- **When Online & Initialized**: The app connects live to Firebase, showing the green **"Firebase Connected"** badge in the app header. All orders, menu edits, kitchen status updates, and RFID taps sync across web & mobile in real time.
- **When Offline**: The app operates smoothly using local memory state, displaying the **"Offline Sync"** amber indicator badge.
