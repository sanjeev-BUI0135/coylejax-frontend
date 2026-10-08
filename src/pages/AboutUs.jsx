import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, Phone, Building2, Users, Award, ShieldCheck } from 'lucide-react';
import Logo from "../assets/images/coyle-logo.webp";
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function AboutUs() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-blue-700/80 py-12 px-4 sm:px-6 lg:px-8 login-page flex flex-col items-center justify-start">
      
      {/* Top Logo and Back button */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-8 z-10">
        <div className="flex items-center gap-3 bg-white p-3 rounded shadow-sm">
          <img src={Logo} className='w-48 rounded-lg' alt="Coyle Logo" />
        </div>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-white hover:text-blue-200 text-sm font-medium transition-colors bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm"
        >
          Go to Login
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="w-full max-w-5xl space-y-6 z-10">
        
        {/* Main Header */}
        <div className="text-center mb-10">
          <h1 className="mt-4 text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
            About George P. Coyle &amp; Sons
          </h1>
          <p className="mt-3 text-lg text-blue-100 max-w-2xl mx-auto">
            Providing reliable, professional, and high-quality contracting services to Northeast Florida since 1927.
          </p>
        </div>

        {/* Content Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <Card className="shadow-lg border-none bg-white/95 backdrop-blur-sm">
            <CardHeader className="bg-slate-50/50 border-b pb-4 rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-[#1355aa]">
                <Users className="w-5 h-5" />
                Our Commitment to You
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-slate-700 leading-relaxed space-y-4">
              <p>
                Since 1927, George P. Coyle &amp; Sons, Inc. has proudly served Jacksonville, Florida and surrounding areas with reliable, professional, and high-quality contracting services. We specialize in residential fencing, commercial fencing, gates, roll-up doors, toilet partitions, Division 10 accessories, and more.
              </p>
              <p>
                Our team is trusted throughout Jacksonville, Nocatee, St. Johns, Orange Park, Mandarin, Fleming Island, Middleburg, and Ponte Vedra Beach for delivering dependable craftsmanship and long-lasting results. Whether you're a homeowner securing your property or a contractor managing a large-scale commercial project, we have the experience and dedication to meet your needs — on time and on budget.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none bg-white/95 backdrop-blur-sm">
            <CardHeader className="bg-slate-50/50 border-b pb-4 rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-[#1355aa]">
                <ShieldCheck className="w-5 h-5" />
                The Coyle Philosophy
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-slate-700 leading-relaxed space-y-4">
              <p>
                George P. Coyle and Sons, Inc. was established to serve customers and, as an organization, we are dedicated to this service. Our goal, at all times, is to the best job possible by having trained and skilled employees, an efficient staff, and a forward looking management team. We want to project this goal to our present customers and our future customers to establish a lasting business relationship.
              </p>
              <p>
                At our company, we understand the need to be able to innovate with the changing market conditions. To accomplish this end we must continue to search for more efficient and better ways to do our job. By more efficient use of personnel and time we can, by working together, help this company grow and prosper for the well-being of all to a degree never thought possible.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-none overflow-hidden bg-white/95 backdrop-blur-sm">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-[#1355aa]">
              <Award className="w-5 h-5" />
              Industry Leaders
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-slate-700 leading-relaxed">
            <p>
              As a long-standing leader in the industry, George P. Coyle &amp; Sons maintains strong partnerships with trusted manufacturers and suppliers, including Bradley, Bobrick, and other Division 10 product leaders. Our team is fully licensed and insured, and we follow all local codes and regulations across Northeast Florida to ensure your project is completed to the highest standards. We are proud to be a certified installer for a variety of specialty products and access control systems, and we work closely with general contractors, architects, and project managers to deliver results that stand the test of time.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none bg-gradient-to-br from-[#1355aa] to-blue-800 text-white">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
             <h2 className="text-2xl font-bold tracking-tight">Contact Information</h2>
             <div className="flex flex-col md:flex-row justify-center items-center gap-6">
                <a href="mailto:jlincoln@coylejax.com" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-6 py-3 rounded-xl backdrop-blur-sm border border-white/20">
                  <Mail className="w-5 h-5" />
                  jlincoln@coylejax.com
                </a>
                <a href="tel:+19043564821" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-6 py-3 rounded-xl backdrop-blur-sm border border-white/20">
                  <Phone className="w-5 h-5" />
                  (904) 356-4821
                </a>
             </div>
             <p className="text-sm text-blue-200 mt-4 flex items-center justify-center gap-2">
                <Building2 className="w-4 h-4" />
                2361 Dennis Street, Jacksonville, FL 32204
             </p>
          </CardContent>
        </Card>

        {/* Footer links */}
        <div className="text-center mt-12 pb-8">
           <div className="flex flex-col md:flex-row justify-between items-center text-sm text-white/80 mb-4 w-full">
              <span>© {new Date().getFullYear()} George P. Coyle &amp; Sons, Inc. All rights reserved.</span>
              <span>CoyleJax Portal is operated by <a href="https://4glaciers.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>4Glaciers Inc.</a></span>
           </div>
           <div className="flex flex-wrap justify-center items-center gap-4 text-xs font-medium">
              <Link to="/privacy" className="text-white/60 hover:text-white transition-colors">Privacy Policy</Link>
              <span className="text-white/30">•</span>
              <Link to="/terms" className="text-white/60 hover:text-white transition-colors">Terms &amp; Conditions</Link>
              <span className="text-white/30">•</span>
              <Link to="/sms-policy" className="text-white/60 hover:text-white transition-colors">SMS Policy</Link>
           </div>
        </div>

      </div>
    </div>
  );
}
