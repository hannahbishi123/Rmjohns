import 'package:flutter/material.dart';

class AppColors {
  // ── Primary Palette (Forest & Sage Design System) ─────────────────────────
  static const Color forest = Color(0xFF1B3B2B);      // Primary forest green
  static const Color forestDeep = Color(0xFF132B1F);  // Deepest forest dark
  static const Color forestMid = Color(0xFF245038);   // Mid forest
  static const Color forestLight = Color(0xFF2D6245); // Lighter forest accent
  
  static const Color sage = Color(0xFF8BA888);        // Secondary sage green
  static const Color sageLight = Color(0xFFC2D4B7);   // Soft sage tint
  
  static const Color lime = Color(0xFFD4E157);        // Highlight lime accent
  static const Color limeMuted = Color(0xFFB8C94A);   // Muted lime
  
  static const Color cream = Color(0xFFF9F9F6);       // Pure warm cream
  static const Color creamWarm = Color(0xFFF5F3EB);   // Deep warm cream

  // ── Neutral Palette ────────────────────────────────────────────────────────
  static const Color ink = Color(0xFF1E2D24);         // Main text dark
  static const Color inkLight = Color(0xFF3A4A3F);    // Subtitle ink
  static const Color text = Color(0xFF2C3E33);        // Default body text
  static const Color textSecondary = Color(0xFF637068);// Secondary text
  static const Color muted = Color(0xFF8E9A90);       // Muted gray-green
  static const Color subtle = Color(0xFFA8B2A9);      // Subtle caption
  
  static const Color line = Color(0xE0E6DEFF);        // Line border (#E2E6DE)
  static const Color lineLight = Color(0xEDF0E9FF);   // Subtle line (#EDF0E9)
  static const Color cardBorder = Color(0xFFE2E6DE);
  
  static const Color paper = Colors.white;
  static const Color bg = Color(0xFFF4F5F0);          // Page background
  static const Color bgWarm = Color(0xFFF7F8F4);      // Alternate warm background

  // ── Semantic & Status Colors ───────────────────────────────────────────────
  static const Color statusPending = Color(0xFFC4943D);   // Warning amber
  static const Color statusPendingBg = Color(0xFFFDF4E6);
  
  static const Color statusPreparing = Color(0xFF4A7F93); // Info blue
  static const Color statusPreparingBg = Color(0xFFE8F2F5);
  
  static const Color statusReady = Color(0xFF3D8B5A);     // Success green
  static const Color statusReadyBg = Color(0xFFE8F5EE);
  
  static const Color statusCompleted = Color(0xFF1B3B2B); // Forest green
  
  static const Color statusCancelled = Color(0xFFC0503D); // Danger red
  static const Color statusCancelledBg = Color(0xFFFBF0EE);

  // Legacy mappings for backwards compatibility across screens
  static const Color primary = forest;
  static const Color primaryDark = forestDeep;
  static const Color primaryLight = Color(0xFFE2EBE5);
  static const Color secondary = sage;
  static const Color accent = lime;
  static const Color background = bg;
  static const Color surface = paper;
  static const Color textDark = ink;
  static const Color textMuted = textSecondary;
}
