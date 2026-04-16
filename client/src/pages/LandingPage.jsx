import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Stethoscope, Video, ShieldCheck, ArrowRight, User, Clock, Phone, Mail, MapPin } from 'lucide-react';

const features = [
  {
    icon: <Calendar className="w-5 h-5" style={{ color: '#1D9E75' }} />,
    iconBg: 'bg-[#E1F5EE]',
    title: "Book Appointments",
    description: "Schedule visits with top healthcare professionals instantly."
  },
  {
    icon: <Stethoscope className="w-5 h-5" style={{ color: '#7F77DD' }} />,
    iconBg: 'bg-[#EEEDFE]',
    title: "AI Doctor Match",
    description: "Personalized recommendations based on your symptoms."
  },
  {
    icon: <Video className="w-5 h-5" style={{ color: '#378ADD' }} />,
    iconBg: 'bg-[#E6F1FB]',
    title: "Telemedicine",
    description: "Consult doctors securely through integrated video calls."
  },
  {
    icon: <ShieldCheck className="w-5 h-5" style={{ color: '#BA7517' }} />,
    iconBg: 'bg-[#FAEEDA]',
    title: "Secure Payments",
    description: "Safe, transparent transactions powered by Stripe."
  }
];

const stats = [
  { value: "10k+", label: "Patients" },
  { value: "500+", label: "Doctors" },
  { value: "98%", label: "Satisfaction" },
  { value: "4.9", label: "App rating" },
];

const trustItems = [
  "HIPAA Compliant",
  "256-bit Encrypted",
  "ISO 27001 Certified",
  "Stripe Secured",
];

export default function LandingPage() {
  return (
    <div className="w-full flex-1 flex flex-col bg-bg-main">

      {/* ── Hero ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div className="space-y-8">

            {/* Trust badge */}
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#9FE1CB] bg-[#E1F5EE] text-xs font-medium text-[#085041]">
              <span className="w-2 h-2 rounded-full bg-[#1D9E75] inline-block" />
              Trusted by 10,000+ patients
            </span>

            <h1 className="text-5xl md:text-6xl font-extrabold text-text-primary leading-[1.1] tracking-tight">
              Modern healthcare,{' '}
              <span className="text-primary">simplified</span>{' '}
              for you.
            </h1>

            <p className="text-lg text-text-secondary leading-relaxed max-w-md">
              Connect with top doctors, manage appointments, and access secure
              telemedicine care — all from one place.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-bg-card border border-border text-text-primary font-semibold hover:bg-border transition-colors"
              >
                Sign in
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-8 pt-6 border-t border-border">
              {stats.map((s, i) => (
                <div key={i}>
                  <p className="text-2xl font-extrabold text-text-primary">{s.value}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: image placeholder with floating UI cards */}
          <div className="relative">
            <img 
              src="/home1.jpg" 
              alt="Healthcare Platform" 
              className="w-full h-[400px] max-w-[540px] mx-auto md:ml-auto rounded-2xl object-cover shadow-lg" 
            />

            {/* Floating card — top right */}
            <div className="absolute -top-4 -right-4 hidden md:flex items-center gap-3 bg-bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-[#E1F5EE] flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary leading-none">Dr. Sarah K.</p>
                <p className="text-xs text-text-secondary mt-0.5">Available now</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 ml-1" />
            </div>

            {/* Floating card — bottom left */}
            <div className="absolute -bottom-4 -left-4 hidden md:block bg-bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
              <p className="text-xs text-text-secondary mb-1">Next appointment</p>
              <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Today, 3:00 PM
              </p>
              <p className="text-xs text-primary mt-0.5">Video consultation</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="border-y border-border bg-bg-card py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap justify-center gap-10">
          {trustItems.map((item, i) => (
            <span key={i} className="text-xs font-medium text-text-secondary tracking-wide uppercase">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" className="py-20 md:py-28 bg-white border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">

          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary mb-5 tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              Core Features
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight">
              Everything you need, nothing you don't.
            </h2>
            <p className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Experience a unified platform designed to manage your entire healthcare journey seamlessly and securely.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group p-8 rounded-3xl bg-bg-main border border-border flex flex-col gap-5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl ${f.iconBg} flex items-center justify-center shadow-inner`}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">{f.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-20 md:py-32 bg-bg-main border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight">Seamless healthcare access</h2>
            <p className="mt-6 text-lg text-text-secondary">Get started and book your first appointment in three simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create your account", desc: "Sign up securely in under a minute with just your email." },
              { step: "02", title: "Find the right doctor", desc: "Browse experienced specialists or let our AI match you instantly." },
              { step: "03", title: "Get premium care", desc: "Book an in-person visit or securely start a video consultation." },
            ].map((item, i) => (
              <div key={i} className="relative p-10 rounded-3xl bg-white border border-border text-center shadow-sm hover:shadow-lg transition-shadow duration-300">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-md border-4 border-bg-main">
                  {i + 1}
                </div>
                <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-border to-white leading-none block mb-6 opacity-50 select-none pb-2">{item.step}</span>
                <h3 className="text-xl font-bold text-text-primary mb-3">{item.title}</h3>
                <p className="text-text-secondary leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <ArrowRight className="hidden md:block absolute -right-6 top-1/2 -translate-y-1/2 w-10 h-10 text-primary bg-white shadow-sm border border-border rounded-full p-2 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Us ── */}
      <section id="contact" className="py-20 md:py-28 bg-white border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary mb-5 tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              We're here for you
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight">Contact Our Team</h2>
            <p className="mt-6 text-lg text-text-secondary leading-relaxed">
              Have questions about appointments, billing, or technical support? Our dedicated care team is available to assist you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            
            {/* Phone */}
            <div className="p-8 rounded-3xl bg-bg-card border border-border flex flex-col items-center text-center hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm mb-6">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Phone Support</h3>
              <p className="text-sm text-text-secondary mb-4">Available Mon-Fri, 8am to 6pm.</p>
              <a href="tel:0789654345" className="text-lg font-bold text-primary hover:underline">0789 654 345</a>
            </div>

            {/* Email */}
            <div className="p-8 rounded-3xl bg-bg-card border border-border flex flex-col items-center text-center hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm mb-6">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Email Us</h3>
              <p className="text-sm text-text-secondary mb-4">We usually respond within 24 hours.</p>
              <a href="mailto:support@carelink.com" className="text-lg font-bold text-primary hover:underline">support@carelink.com</a>
            </div>

            {/* Location */}
            <div className="p-8 rounded-3xl bg-bg-card border border-border flex flex-col items-center text-center hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm mb-6">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Office</h3>
              <p className="text-sm text-text-secondary mb-4">Visit our main headquarters.</p>
              <span className="text-sm font-semibold text-text-primary">123 Health Ave, Medical District</span>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-[#E1F5EE] border border-[#9FE1CB] px-10 py-16 md:py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[#085041] mb-4 tracking-tight">
              Ready to take control of your health?
            </h2>
            <p className="text-[#0F6E56] mb-8 max-w-md mx-auto">
              Join thousands of patients who manage their healthcare smarter.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}