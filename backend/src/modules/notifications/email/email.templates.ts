/**
 * Shared HTML email layout (header + footer) used by all OCMS templates.
 * Accepts the inner content block HTML.
 */
export function buildEmailLayout(contentHtml: string, appName = 'OCMS'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f6fb; font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; }
    .wrapper { width: 100%; padding: 40px 16px; background: #f4f6fb; }
    .card { max-width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(99,102,241,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.75); }
    .body { padding: 36px 40px 28px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
    .content { font-size: 15px; line-height: 1.7; color: #374151; }
    .btn { display: inline-block; margin-top: 24px; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff !important; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; letter-spacing: 0.2px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 28px 0; }
    .meta { font-size: 13px; color: #9ca3af; line-height: 1.6; }
    .footer { background: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>🎓 ${appName}</h1>
        <p>Online Course Management System</p>
      </div>
      <div class="body">
        ${contentHtml}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        <p>You are receiving this email because you have an account on ${appName}.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Email Templates
// ─────────────────────────────────────────────────────────────────────────────

export interface EnrollmentConfirmedParams {
  fullName: string;
  courseTitle: string;
  courseUrl: string;
}

export function enrollmentConfirmedTemplate(p: EnrollmentConfirmedParams) {
  const html = buildEmailLayout(`
    <div class="greeting">Welcome to your course, ${p.fullName}! 🎉</div>
    <div class="content">
      <p>You are now enrolled in <strong>${p.courseTitle}</strong>. Start learning at your own pace and track your progress along the way.</p>
      <a href="${p.courseUrl}" class="btn">Start Learning →</a>
      <hr class="divider" />
      <p class="meta">If the button does not work, copy and paste this URL into your browser:<br/>${p.courseUrl}</p>
    </div>
  `);
  const text = `Hi ${p.fullName},\n\nYou are now enrolled in "${p.courseTitle}".\n\nStart learning: ${p.courseUrl}\n\nHappy learning!\nThe OCMS Team`;
  return { subject: `You're enrolled: ${p.courseTitle}`, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentSucceededParams {
  fullName: string;
  courseTitle: string;
  amount: number;
  currency: string;
  courseUrl: string;
}

export function paymentSucceededTemplate(p: PaymentSucceededParams) {
  const amountFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: p.currency.toUpperCase(),
  }).format(p.amount);

  const html = buildEmailLayout(`
    <div class="greeting">Payment confirmed, ${p.fullName}! ✅</div>
    <div class="content">
      <p>Your payment of <strong>${amountFormatted}</strong> for <strong>${p.courseTitle}</strong> has been successfully processed. Your enrollment is now active.</p>
      <a href="${p.courseUrl}" class="btn">Go to Course →</a>
      <hr class="divider" />
      <p class="meta">Amount: ${amountFormatted}<br/>Course: ${p.courseTitle}<br/>If the button does not work, copy: ${p.courseUrl}</p>
    </div>
  `);
  const text = `Hi ${p.fullName},\n\nPayment of ${amountFormatted} for "${p.courseTitle}" confirmed. You are now enrolled.\n\nGo to course: ${p.courseUrl}\n\nThe OCMS Team`;
  return { subject: `Payment confirmed for: ${p.courseTitle}`, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface CourseApprovedParams {
  fullName: string;
  courseTitle: string;
  courseUrl: string;
}

export function courseApprovedTemplate(p: CourseApprovedParams) {
  const html = buildEmailLayout(`
    <div class="greeting">Your course was approved, ${p.fullName}! 🚀</div>
    <div class="content">
      <p>Great news! <strong>${p.courseTitle}</strong> has been reviewed by our admin team and is now <strong>published</strong> and visible to all students.</p>
      <a href="${p.courseUrl}" class="btn">View Course →</a>
      <hr class="divider" />
      <p class="meta">If the button does not work, copy: ${p.courseUrl}</p>
    </div>
  `);
  const text = `Hi ${p.fullName},\n\nYour course "${p.courseTitle}" has been approved and published.\n\nView it: ${p.courseUrl}\n\nThe OCMS Team`;
  return { subject: `Course approved: ${p.courseTitle}`, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface CourseRejectedParams {
  fullName: string;
  courseTitle: string;
  rejectionReason: string;
  editUrl: string;
}

export function courseRejectedTemplate(p: CourseRejectedParams) {
  const html = buildEmailLayout(`
    <div class="greeting">Course review update, ${p.fullName}</div>
    <div class="content">
      <p>Unfortunately, <strong>${p.courseTitle}</strong> was not approved in this review cycle.</p>
      <p><strong>Reason provided by admin:</strong></p>
      <blockquote style="border-left:4px solid #e5e7eb;margin:12px 0;padding:10px 16px;color:#6b7280;background:#f9fafb;border-radius:4px;">${p.rejectionReason}</blockquote>
      <p>Please update your course and resubmit when ready.</p>
      <a href="${p.editUrl}" class="btn">Edit Course →</a>
    </div>
  `);
  const text = `Hi ${p.fullName},\n\nYour course "${p.courseTitle}" was not approved.\n\nReason: ${p.rejectionReason}\n\nPlease make the required changes and resubmit.\n\nEdit: ${p.editUrl}\n\nThe OCMS Team`;
  return { subject: `Course not approved: ${p.courseTitle}`, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface QuizResultParams {
  fullName: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  courseUrl: string;
}

export function quizResultTemplate(p: QuizResultParams) {
  const badge = p.isPassed
    ? '<span style="color:#16a34a;font-weight:700;">PASSED ✅</span>'
    : '<span style="color:#dc2626;font-weight:700;">NOT PASSED ❌</span>';
  const html = buildEmailLayout(`
    <div class="greeting">Quiz result: ${p.quizTitle}</div>
    <div class="content">
      <p>Hi ${p.fullName}, here are your results for <strong>${p.quizTitle}</strong>:</p>
      <p style="font-size:18px;">Score: <strong>${p.score} / ${p.maxScore}</strong> (${p.percentage}%) — ${badge}</p>
      ${p.isPassed
        ? '<p>Congratulations on passing! Keep up the great work.</p>'
        : '<p>Don\'t give up — review the material and try again when you\'re ready.</p>'
      }
      <a href="${p.courseUrl}" class="btn">Continue Learning →</a>
    </div>
  `);
  const text = `Hi ${p.fullName},\n\nQuiz: ${p.quizTitle}\nScore: ${p.score}/${p.maxScore} (${p.percentage}%) — ${p.isPassed ? 'PASSED' : 'NOT PASSED'}\n\nContinue learning: ${p.courseUrl}\n\nThe OCMS Team`;
  return {
    subject: `Quiz result: ${p.isPassed ? '✅ Passed' : '❌ Not passed'} — ${p.quizTitle}`,
    html,
    text,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface CertificateIssuedParams {
  fullName: string;
  courseTitle: string;
  certificateNumber: string;
  verifyUrl: string;
}

export function certificateIssuedTemplate(p: CertificateIssuedParams) {
  const html = buildEmailLayout(`
    <div class="greeting">Certificate earned, ${p.fullName}! 🏆</div>
    <div class="content">
      <p>Congratulations on completing <strong>${p.courseTitle}</strong>! Your certificate has been issued.</p>
      <p class="meta"><strong>Certificate No.:</strong> ${p.certificateNumber}</p>
      <a href="${p.verifyUrl}" class="btn">View Certificate →</a>
      <hr class="divider" />
      <p class="meta">Share your achievement! Verification URL: ${p.verifyUrl}</p>
    </div>
  `);
  const text = `Hi ${p.fullName},\n\nCongratulations! You've earned your certificate for "${p.courseTitle}".\n\nCertificate No.: ${p.certificateNumber}\nVerify: ${p.verifyUrl}\n\nThe OCMS Team`;
  return { subject: `🏆 Certificate issued: ${p.courseTitle}`, html, text };
}
