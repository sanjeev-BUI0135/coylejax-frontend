import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import Logo from "../assets/images/coyle-logo.webp";

export default function TermsAndConditions() {
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
            id="terms-back-to-login"
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
              Terms &amp; Conditions
            </h1>
            {/* <p className="text-sm font-semibold text-[#1260AF] mb-1">Effective Date: May 29, 2026</p> */}
            <p className="text-sm text-slate-400">George P. Coyle &amp; Sons, Inc. — CoyleJax.com</p>
          </div>

          {/* Sections */}
          <Section title="1. Agreement to Terms">
            <p>These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("User," "Client," or "you") and George P. Coyle &amp; Sons, Inc. ("Company," "we," "us," or "our"), governing your access to and use of the CoyleJax client portal, website, and related services.</p>
            <p>By accessing our portal or website, creating an account, or using any of our services, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not use our services.</p>
          </Section>

          <Section title="2. Services Description">
            <p>George P. Coyle &amp; Sons, Inc. is a licensed commercial and residential contractor in Jacksonville, Florida, providing the following services:</p>
            <List items={[
              'Commercial and Residential Fencing (chain-link, vinyl, aluminum, wood)',
              'Automated Gate Installation and Service',
              'Division 10 Construction Specialties',
              'Commercial Doors, Frames & Hardware',
              'Temporary Fencing Solutions',
              'Bathroom Partitions and Building Specialties',
            ]} />
            <p>Our client portal provides project management, estimate review, invoice tracking, material order management, and communication tools for authorized users only.</p>
          </Section>

          <Section title="3. Account Registration &amp; Security">
            <SubTitle>Account Creation</SubTitle>
            <p>Access to our client portal requires a valid account created by an authorized administrator. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</p>
            <SubTitle>User Responsibilities</SubTitle>
            <List items={[
              'Provide accurate and current information when registering or updating your account',
              'Immediately notify us of any unauthorized use of your account or any security breach',
              'Not share your credentials with any third party',
              'Use the portal only for legitimate business purposes related to your projects with our Company',
              'Not attempt to access accounts or data belonging to other users',
            ]} />
            <SubTitle>Account Termination</SubTitle>
            <p>We reserve the right to suspend or terminate your account at our sole discretion, with or without notice, for violation of these Terms.</p>
          </Section>

          <Section title="4. Estimates and Contracts">
            <List items={[
              'Estimates are valid for 30 days from the date of issuance unless otherwise stated',
              'Estimates are subject to change based on material price fluctuations, site conditions, or scope changes',
              'An accepted estimate may require a signed contract and deposit before work commences',
              'Any changes to the agreed scope of work must be documented through a written change order',
              'The Company reserves the right to decline any project at its discretion',
            ]} />
          </Section>

          <Section title="5. Payment Terms">
            <List items={[
              'Invoices are due within 30 days of the invoice date',
              'Deposits may be required prior to commencement of work as specified in the project contract',
              'Late payments may incur a finance charge of 1.5% per month on the outstanding balance',
              'The Company reserves the right to suspend work on unpaid accounts',
              'Client is responsible for all collection costs, including reasonable attorney\'s fees, if payment is not received',
              'Payment processing is handled by secure third-party processors; we do not store full payment card information',
            ]} />
          </Section>

          <Section title="6. Project Completion and Warranties">
            <SubTitle>Work Completion</SubTitle>
            <p>We will use commercially reasonable efforts to complete projects within the estimated timeframe. Delays caused by weather, material availability, permitting, or other factors outside our control shall not constitute a breach of contract.</p>
            <SubTitle>Limited Warranty</SubTitle>
            <p>Our workmanship is warranted against defects for a period of one (1) year from project completion. This warranty does not cover:</p>
            <List items={[
              'Normal wear and tear or weather damage',
              'Damage caused by misuse, accidents, or acts of nature',
              'Vandalism or third-party damage',
              'Modifications made by anyone other than our Company',
            ]} />
          </Section>

          <Section title="7. Intellectual Property">
            <p>All content on the CoyleJax website and client portal is the property of George P. Coyle &amp; Sons, Inc. and is protected by applicable intellectual property laws. You may not reproduce, distribute, or modify any content without our express written permission.</p>
          </Section>

          <Section title="8. Acceptable Use Policy">
            <p>When using our services, you agree not to:</p>
            <List items={[
              'Use our portal for any unlawful purpose or in violation of these Terms',
              'Attempt to gain unauthorized access to our systems or other users\' accounts',
              'Upload, transmit, or distribute any malicious code, viruses, or harmful software',
              'Engage in any activity that disrupts or interferes with our services',
              'Scrape, harvest, or collect data from our portal without authorization',
              'Impersonate any person or entity, including our employees or other clients',
            ]} />
          </Section>

          <Section title="9. Limitation of Liability">
            <p>To the fullest extent permitted by applicable law, George P. Coyle &amp; Sons, Inc. shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.</p>
            <p>Our total liability shall not exceed the amount you paid to us in the three (3) months preceding the claim.</p>
          </Section>

          <Section title="10. Indemnification">
            <p>You agree to indemnify and hold harmless George P. Coyle &amp; Sons, Inc. and its officers, directors, employees, and agents from any claims, liabilities, damages, or expenses arising from your breach of these Terms or your use of our services.</p>
          </Section>

          <Section title="11. Governing Law &amp; Dispute Resolution">
            <p>These Terms shall be governed by the laws of the State of Florida. Any disputes shall be subject to the exclusive jurisdiction of the courts in Duval County, Florida.</p>
            <p>Before initiating any legal action, both parties agree to attempt resolution through good-faith negotiation for a period of thirty (30) days.</p>
          </Section>

          <Section title="12. Privacy">
            <p>
              Your use of our services is also governed by our{' '}
              <Link to="/privacy" id="terms-privacy-link" className="text-[#1260AF] underline font-medium hover:text-blue-800 transition-colors">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference.
            </p>
          </Section>

          <Section title="13. Changes to Terms">
            <p>We reserve the right to modify these Terms at any time. Changes will be effective upon posting with an updated "Effective Date." Your continued use of our services constitutes acceptance of the revised Terms.</p>
          </Section>

          {/* Contact section */}
          <div className="mb-14">
            <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">14. Contact Information</h2>
            <div className="h-px bg-slate-200 mb-5" />
            <p className="text-base leading-relaxed text-slate-500 mb-5">For questions about these Terms and Conditions, please contact us:</p>
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
            <Link to="/privacy" id="terms-footer-privacy" className="text-xs text-white/65 hover:text-white font-medium transition-colors">Privacy Policy</Link>
            <span className="text-white/30 text-sm">·</span>
            <Link to="/terms" id="terms-footer-terms" className="text-xs text-white/65 hover:text-white font-medium transition-colors">Terms &amp; Conditions</Link>
            <span className="text-white/30 text-sm">·</span>
            <Link to="/sms-policy" id="terms-footer-sms" className="text-xs text-white/65 hover:text-white font-medium transition-colors">SMS Policy</Link>
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
