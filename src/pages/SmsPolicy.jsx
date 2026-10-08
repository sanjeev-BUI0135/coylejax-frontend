import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import Logo from "../assets/images/coyle-logo.webp";

export default function SmsPolicy() {
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
            id="sms-back-to-login"
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
              SMS Policy
            </h1>
            <p className="text-sm text-slate-400">George P. Coyle &amp; Sons, Inc. — CoyleJax.com</p>
          </div>

          {/* Sections */}
          <Section title="1. Introduction">
            <p>George P. Coyle &amp; Sons, Inc. ("Company," "we," "us," or "our") uses SMS messaging to communicate with our clients regarding estimates, invoices, material orders, project management requests, and other important service updates.</p>
            <p>By providing your mobile number and opting in, you agree to receive SMS text messages from us according to this SMS Policy.</p>
          </Section>

          <Section title="2. Opting In">
            <p>By opting into our SMS service, you agree to receive periodic text messages from us. Message frequency may vary based on your project status and account activity.</p>
          </Section>

          <Section title="3. Message and Data Rates">
            <p>Standard message and data rates may apply for any messages sent to you from us and to us from you. If you have any questions about your text plan or data plan, it is best to contact your wireless provider.</p>
          </Section>

          <Section title="4. Opting Out">
            <p>You can cancel the SMS service at any time. Just reply <strong>"STOP"</strong> to the shortcode or number from which you received the message. After you send the SMS message "STOP" to us, we will send you an SMS message to confirm that you have been unsubscribed. After this, you will no longer receive SMS messages from us. If you want to join again, just sign up as you did the first time, or let us know, and we will start sending SMS messages to you again.</p>
          </Section>

          <Section title="5. Help and Support">
            <p>If you are experiencing issues with the messaging program you can reply with the keyword <strong>"HELP"</strong> for more assistance, or you can get help directly at jlincoln@coylejax.com or call us at (904) 356-4821.</p>
          </Section>

          <Section title="6. Carrier Liability">
            <p>Carriers are not liable for delayed or undelivered messages.</p>
          </Section>

          <Section title="7. Privacy">
            <p>We take your privacy seriously. Your phone number will not be shared with third parties or affiliates for marketing purposes. For more information, please review our <Link to="/privacy" className="text-[#1260AF] underline font-medium hover:text-blue-800 transition-colors">Privacy Policy</Link>.</p>
          </Section>

          {/* Contact section */}
          <div className="mb-14">
            <h2 className="text-[22px] font-bold text-slate-900 mb-3 tracking-tight">8. Contact Us</h2>
            <div className="h-px bg-slate-200 mb-5" />
            <p className="text-base leading-relaxed text-slate-500 mb-5">If you have questions or concerns about this SMS Policy, please contact us:</p>
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
            <Link to="/privacy" id="sms-footer-pp" className="text-xs text-white/65 hover:text-white font-medium transition-colors">Privacy Policy</Link>
            <span className="text-white/30 text-sm">·</span>
            <Link to="/terms" id="sms-footer-terms" className="text-xs text-white/65 hover:text-white font-medium transition-colors">Terms &amp; Conditions</Link>
            <span className="text-white/30 text-sm">·</span>
            <Link to="/sms-policy" id="sms-footer-sms" className="text-xs text-white/65 hover:text-white font-medium transition-colors">SMS Policy</Link>
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
