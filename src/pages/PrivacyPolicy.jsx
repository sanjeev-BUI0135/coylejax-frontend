import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import Logo from "../assets/images/coyle-logo.webp";

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="CoyleJax" className="h-12 w-auto object-contain" />
          </div>
          <Link
            to="/login"
            id="privacy-back-to-login"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-8 py-14">

          {/* Title block */}
          <div className="mb-14">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
              Privacy Policy
            </h1>
            {/* <p className="text-sm font-semibold text-[#1260AF] mb-1">Effective Date: May 29, 2026</p> */}
            <p className="text-sm text-slate-400">George P. Coyle &amp; Sons, Inc. — CoyleJax.com</p>
          </div>

          {/* Sections */}
          <Section title="1. Introduction">
            <p>George P. Coyle &amp; Sons, Inc. ("Company," "we," "us," or "our") operates the website <strong className="text-slate-700">coylejax.com</strong> and the associated client portal. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.</p>
            <p>By accessing or using our services, you agree to this Privacy Policy. If you do not agree, please discontinue use of our services.</p>
          </Section>

          <Section title="2. Information We Collect">
            <SubTitle>Personal Information</SubTitle>
            <p>We may collect personally identifiable information that you voluntarily provide, including:</p>
            <List items={[
              'Full name',
              'Email address',
              'Phone number',
              'Business name and address',
              'Project details and specifications',
              'Payment information (processed securely via third-party processors)',
            ]} />
            <SubTitle>Automatically Collected Information</SubTitle>
            <p>When you visit our website or portal, we may automatically collect:</p>
            <List items={[
              'IP address and browser type',
              'Operating system information',
              'Pages visited and time spent',
              'Referring website or source',
              'Cookie data and session identifiers',
            ]} />
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <List items={[
              'Provide, operate, and maintain our services and client portal',
              'Process estimates, invoices, material orders, and project management requests',
              'Communicate with you about your projects, estimates, and service updates',
              'Send important administrative emails (account notifications, password resets)',
              'Improve our website, services, and user experience',
              'Comply with legal obligations and enforce our agreements',
              'Detect and prevent fraudulent or unauthorized activity',
            ]} />
          </Section>

          <Section title="4. Sharing of Information">
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information in the following limited circumstances:</p>
            <List items={[
              'Service Providers: Trusted third-party vendors who assist in operating our website, subject to confidentiality agreements.',
              'Legal Requirements: When disclosure is required by law, court order, or governmental authority.',
              'Business Transfers: In the event of a merger or acquisition, your information may be transferred to the successor entity.',
              'Protection of Rights: When necessary to protect the rights, property, or safety of our Company, clients, or others.',
            ]} />
          </Section>

          <Section title="5. Cookies and Tracking Technologies">
            <p>We use cookies and similar tracking technologies to enhance your experience on our website. Cookies are small files stored on your device. You can instruct your browser to refuse all cookies; however, some portions of our service may not function properly.</p>
            <p>
              We use Google Analytics to analyze website traffic. Google's use of your data is governed by{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#1260AF] underline font-medium hover:text-blue-800 transition-colors">
                Google's Privacy Policy
              </a>.
            </p>
          </Section>

          <Section title="6. Data Security">
            <p>We implement industry-standard security measures to protect your personal information, including:</p>
            <List items={[
              'SSL/TLS encryption for data transmission',
              'Secure authentication for the client portal',
              'Access controls limiting data access to authorized personnel only',
              'Regular security assessments and updates',
            ]} />
            <p>However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.</p>
          </Section>

          <Section title="7. Data Retention">
            <p>We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Project records, estimates, and invoices may be retained for a minimum of 7 years in accordance with standard business and legal requirements.</p>
          </Section>

          <Section title="8. Your Rights">
            <p>Depending on your location, you may have the following rights regarding your personal information:</p>
            <List items={[
              'Access: Request a copy of the personal data we hold about you.',
              'Correction: Request correction of inaccurate or incomplete information.',
              'Deletion: Request deletion of your personal data, subject to legal retention requirements.',
              'Opt-Out: Opt out of marketing communications at any time by contacting us.',
              'Portability: Request transfer of your data in a machine-readable format where technically feasible.',
            ]} />
          </Section>

          <Section title="9. Third-Party Links">
            <p>Our website may contain links to third-party websites. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party sites. We encourage you to review the privacy policy of any site you visit.</p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If we discover that a child has provided us with personal information, we will delete it promptly.</p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you by posting the new policy on this page and updating the "Effective Date." Your continued use of our services after changes are posted constitutes acceptance of the updated policy.</p>
          </Section>

          {/* Contact section */}
          <div className="mb-14">
            <h2 className="text-[22px] font-bold text-slate-900 mb-3 tracking-tight">12. Contact Us</h2>
            <div className="h-px bg-slate-200 mb-5" />
            <p className="text-base leading-relaxed text-slate-500 mb-5">If you have questions or concerns about this Privacy Policy, please contact us:</p>
            <div className="flex flex-wrap gap-3 mb-5">
              <a href="mailto:jlincoln@coylejax.com" className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                <Mail size={15} />
                jlincoln@coylejax.com
              </a>
              <a href="tel:+19043564821" className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                <Phone size={15} />
                (904) 356-4821
              </a>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              <strong className="text-slate-600">George P. Coyle &amp; Sons, Inc.</strong> · Jacksonville, Florida, USA · Founded 1927 · Serving Duval, Clay, St. Johns &amp; Nassau Counties
            </p>
          </div>

        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1260AF] py-7 px-8">
        <div className="max-w-4xl mx-auto text-center flex flex-col gap-2.5">
          <div className="flex flex-col md:flex-row justify-between items-center w-full text-sm text-white/80">
            <span>© {new Date().getFullYear()} George P. Coyle &amp; Sons, Inc. All rights reserved.</span>
            <span>CoyleJax Portal is operated by <a href="https://4glaciers.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>4Glaciers Inc.</a></span>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/privacy" id="privacy-footer-pp" className="text-xs text-white/65 hover:text-white font-medium transition-colors">Privacy Policy</Link>
            <span className="text-white/30 text-sm">·</span>
            <Link to="/terms" id="privacy-footer-terms" className="text-xs text-white/65 hover:text-white font-medium transition-colors">Terms &amp; Conditions</Link>
            <span className="text-white/30 text-sm">·</span>
            <Link to="/sms-policy" id="privacy-footer-sms" className="text-xs text-white/65 hover:text-white font-medium transition-colors">SMS Policy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-11">
      <h2 className="text-[22px] font-bold text-slate-900 mb-3 tracking-tight">{title}</h2>
      <div className="h-px bg-slate-200 mb-5" />
      <div className="flex flex-col gap-3 text-base leading-relaxed text-slate-500">
        {children}
      </div>
    </div>
  );
}

function SubTitle({ children }) {
  return <h3 className="text-[15.5px] font-bold text-slate-700 mt-2 mb-0">{children}</h3>;
}

function List({ items }) {
  return (
    <ul className="flex flex-col gap-2 my-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-base text-slate-500 leading-relaxed">
          <span className="text-slate-300 text-xl leading-tight mt-0.5 flex-shrink-0">·</span>
          {item}
        </li>
      ))}
    </ul>
  );
}
