import Swal from 'sweetalert2'

/**
 * Standardized SweetAlert2 (Swal) configuration for RMJohn's Kitchen & Bar.
 * All popups are standardized with position: 'top' (top-center of the screen).
 * Theme: Forest Green (#1B3B2B) + Lime Green (#D4E157) + Cream (#F9F9F6) + Sage (#A3B18A)
 */

// Track last toast to prevent duplicate rapid notifications
let lastToastKey = ''
let lastToastTime = 0
let activeSubmissionLock = false

const DEFAULT_TITLES = {
  success: 'Success',
  error:   'Something went wrong',
  warning: 'Please confirm',
  info:    'Information',
  question: 'Confirm action',
}

/**
 * Base modal instance styled with the Forest Green + Lime + Cream palette.
 * Position is strictly top-center.
 */
export const RmjSwal = Swal.mixin({
  position: 'top',
  background: '#F9F9F6',
  color: '#1B3B2B',
  confirmButtonColor: '#1B3B2B',
  cancelButtonColor: '#C0503D',
  reverseButtons: true,
  buttonsStyling: true,
  customClass: {
    container:     'rmj-swal-container',
    popup:         'rmj-swal-popup app-swal-confirm',
    title:         'rmj-swal-title',
    htmlContainer: 'rmj-swal-html',
    confirmButton: 'rmj-swal-confirm-btn',
    cancelButton:  'rmj-swal-cancel-btn',
    actions:       'rmj-swal-actions',
  },
})

/**
 * Base toast instance for non-blocking feedback.
 * Standardized to appear at the top-center of the screen.
 */
export const RmjToast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  background: '#F9F9F6',
  color: '#1B3B2B',
  customClass: {
    container: 'rmj-swal-toast-container',
    popup:     'rmj-swal-toast app-swal-toast',
    title:     'rmj-swal-toast-title',
  },
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  },
})

/**
 * Unified notification helper (compatible with existing `notify(message, options)` calls).
 * Automatically deduplicates identical alerts triggered within 600ms.
 */
export function swalNotify(message, options = {}) {
  const {
    icon = 'success',
    title = DEFAULT_TITLES[icon] || 'Notification',
    text = message,
    timer = 2500,
    modal = false,
    showConfirmButton = false,
  } = options

  const dedupeKey = `${icon}:${title}:${text}`
  const now = Date.now()
  if (dedupeKey === lastToastKey && now - lastToastTime < 650) {
    return Promise.resolve()
  }
  lastToastKey = dedupeKey
  lastToastTime = now

  if (modal || showConfirmButton) {
    return RmjSwal.fire({
      position: 'top',
      icon,
      title: title || DEFAULT_TITLES[icon],
      text,
      showConfirmButton: true,
      confirmButtonText: options.confirmButtonText || 'Okay',
    })
  }

  return RmjToast.fire({
    position: 'top',
    icon,
    title: title || message,
    text: title ? text : undefined,
    timer,
  })
}

export function swalSuccess(message, title = 'Success', options = {}) {
  return swalNotify(message, { ...options, icon: 'success', title })
}

export function swalError(message, title = 'Something went wrong', options = {}) {
  return RmjSwal.fire({
    position: 'top',
    icon: 'error',
    title,
    text: message,
    confirmButtonText: options.confirmButtonText || 'Okay',
    showCancelButton: false,
  })
}

export function swalWarning(message, title = 'Attention', options = {}) {
  return swalNotify(message, { ...options, icon: 'warning', title })
}

export function swalInfo(message, title = 'Information', options = {}) {
  return swalNotify(message, { ...options, icon: 'info', title })
}

/**
 * Standardized confirmation dialog before deleting or performing important actions.
 */
export function swalConfirm({
  title = 'Are you sure?',
  text = 'Please confirm that you want to proceed.',
  confirmButtonText = 'Yes, continue',
  cancelButtonText = 'Cancel',
  icon = 'warning',
  danger = false,
  position = 'top',
  isLogout = false,
  customClass = {},
} = {}) {
  const isCenteredLogout = isLogout || title === 'Log out?' || position === 'center'
  return RmjSwal.fire({
    position: isCenteredLogout ? 'center' : 'top',
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: danger ? '#C0503D' : '#1B3B2B',
    cancelButtonColor: '#6E7B72',
    focusCancel: danger,
    customClass: {
      container:     `rmj-swal-container${isCenteredLogout ? ' rmj-swal-logout-container' : ''} ${customClass.container || ''}`.trim(),
      popup:         `rmj-swal-popup app-swal-confirm${isCenteredLogout ? ' rmj-swal-logout-popup' : ''} ${customClass.popup || ''}`.trim(),
      title:         `rmj-swal-title ${customClass.title || ''}`.trim(),
      htmlContainer: `rmj-swal-html ${customClass.htmlContainer || ''}`.trim(),
      confirmButton: `rmj-swal-confirm-btn ${customClass.confirmButton || ''}`.trim(),
      cancelButton:  `rmj-swal-cancel-btn ${customClass.cancelButton || ''}`.trim(),
      actions:       `rmj-swal-actions ${customClass.actions || ''}`.trim(),
    },
  })
}

/**
 * Display a loading modal during database/API operations.
 */
export function swalShowLoading(title = 'Saving changes…', text = 'Synchronizing with the database. Please wait.') {
  RmjSwal.fire({
    position: 'top',
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading()
    },
  })
}

export function swalCloseLoading() {
  if (Swal.isVisible() && Swal.isLoading()) {
    Swal.close()
  }
}

/**
 * Execute an async database operation with duplicate-submission protection,
 * a loading indicator, and post-response success/error alerts.
 */
export async function withDatabaseAlert(
  operationFn,
  {
    loadingTitle = 'Saving to database…',
    loadingText = 'Please wait while your changes are synchronized.',
    successTitle = 'Saved',
    successMessage = 'Your changes have been saved successfully.',
    errorTitle = 'Database operation failed',
    showLoadingModal = true,
  } = {},
) {
  if (activeSubmissionLock) return { ok: false, duplicate: true }
  activeSubmissionLock = true

  if (showLoadingModal) {
    swalShowLoading(loadingTitle, loadingText)
  }

  try {
    const result = await operationFn()
    swalCloseLoading()
    if (successMessage) {
      await swalNotify(successMessage, { icon: 'success', title: successTitle })
    }
    return { ok: true, data: result }
  } catch (error) {
    swalCloseLoading()
    await swalError(error?.message || 'Could not complete the operation. Please try again.', errorTitle)
    return { ok: false, error }
  } finally {
    activeSubmissionLock = false
  }
}
