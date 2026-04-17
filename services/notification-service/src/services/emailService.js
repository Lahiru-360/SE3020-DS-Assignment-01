import { transporter } from '../config/mailer.js';

// ─── Built-in subject lines (appointment events) ─────────────────────────────
const BUILT_IN_SUBJECTS = {
  appointment_booked:    '✅ Appointment Booked — HC Platform',
  appointment_confirmed: '🗓️ Appointment Confirmed — HC Platform',
  appointment_cancelled: '❌ Appointment Cancelled — HC Platform',
  appointment_completed: '✔️ Appointment Completed — HC Platform',
};

// ─── Built-in message bodies (appointment events) ────────────────────────────
const BUILT_IN_MESSAGES = {
  appointment_booked:    'Your appointment has been successfully booked and is pending confirmation.',
  appointment_confirmed: 'Your appointment has been confirmed by the doctor.',
  appointment_cancelled: 'Your appointment has been cancelled.',
  appointment_completed: 'Your appointment has been marked as completed.',
};

// ─── Appointment-specific HTML template ──────────────────────────────────────
function buildAppointmentHtml(type, { recipientName, patientName, doctorName, specialty, date, timeSlot }) {
  const formattedDate = date ? new Date(date).toDateString() : 'N/A';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#2563eb;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">HC Platform</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi <strong>${recipientName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;">${BUILT_IN_MESSAGES[type]}</p>
              <!-- Appointment Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <tr style="background:#f9fafb;">
                  <td colspan="2" style="padding:10px 16px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Appointment Details</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#6b7280;width:130px;">Patient</td>
                  <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;font-weight:600;">${patientName}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Doctor</td>
                  <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;font-weight:600;">Dr. ${doctorName}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Specialty</td>
                  <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;">${specialty}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Date</td>
                  <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Time Slot</td>
                  <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;">${timeSlot}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message from HC Platform. Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ─── Generic fallback HTML template ──────────────────────────────────────────
// Used for event types with no built-in template; renders caller-supplied message + metadata.
function buildGenericHtml(subject, message, recipientName, metadata = {}) {
  const metaRows = Object.entries(metadata)
    .map(
      ([k, v], i) => `
        <tr ${i % 2 === 0 ? '' : 'style="background:#f9fafb;"'}>
          <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#6b7280;width:160px;">${k}</td>
          <td style="padding:10px 16px;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;font-weight:600;">${v}</td>
        </tr>`
    )
    .join('');

  const detailsSection =
    metaRows.length > 0
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-top:24px;">
           <tr style="background:#f9fafb;">
             <td colspan="2" style="padding:10px 16px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Details</td>
           </tr>
           ${metaRows}
         </table>`
      : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#2563eb;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">HC Platform</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi <strong>${recipientName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;">${message}</p>
              ${detailsSection}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message from HC Platform. Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ─── Send a single email ──────────────────────────────────────────────────────
// Uses built-in appointment template if available, otherwise falls back to generic template.
export const sendEmail = async ({ type, recipientEmail, recipientName, subject: subjectOverride, message: messageOverride, metadata }) => {
  const isBuiltIn = Boolean(BUILT_IN_SUBJECTS[type]);

  // Resolve subject
  const subject = subjectOverride || BUILT_IN_SUBJECTS[type] || `HC Platform — ${type}`;

  // Resolve HTML body
  let html;
  if (isBuiltIn && !messageOverride) {
    // Rich appointment template
    html = buildAppointmentHtml(type, { recipientName, ...metadata });
  } else {
    // Generic template — uses caller-supplied or auto-generated message
    const bodyText = messageOverride || `You have received a notification of type: ${type}.`;
    html = buildGenericHtml(subject, bodyText, recipientName, metadata);
  }

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      recipientEmail,
    subject,
    html,
  });

  return subject;
};
