import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HeartPulse, Users, Droplets, Image as ImageIcon, Bell, Shield,
  ArrowRight, Star, CheckCircle, Heart, Zap, Globe
} from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/feed');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden animate-fade-in-down">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-green-100 p-2 rounded-xl">
              <HeartPulse className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xl font-bold text-gray-900">CareCommunity</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a 
              href="#features" 
              onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >Features</a>
            <a 
              href="#about" 
              onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >About Us</a>
            <a 
              href="#community" 
              onClick={(e) => { e.preventDefault(); document.getElementById('community')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >Community</a>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/login" viewTransition className="text-gray-600 hover:text-gray-900 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors">
              Sign In
            </Link>
            <Link to="/signup" viewTransition className="bg-green-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-green-700 transition-all shadow-sm hover:shadow-md">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background Gradient Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-full blur-3xl opacity-60 -z-10" />
        <div className="absolute top-32 right-0 w-64 h-64 bg-green-100 rounded-full blur-3xl opacity-40 -z-10" />
        <div className="absolute top-48 left-0 w-48 h-48 bg-teal-100 rounded-full blur-3xl opacity-40 -z-10" />

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-green-50 border border-green-100 rounded-full px-4 py-2 mb-8">
            <Star className="w-4 h-4 text-green-500" fill="currentColor" />
            <span className="text-sm font-semibold text-green-700">Your Health, Our Community</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-tight mb-6">
            Healthcare{' '}
            <span className="relative">
              <span className="text-green-600">Together</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 8 Q150 2 298 8" stroke="#86efac" strokeWidth="3" strokeLinecap="round" fill="none"/>
              </svg>
            </span>
            , <br />
            <span className="text-gray-400">Stronger</span> Every Day.
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
            A compassionate community platform for health questions, emergency alerts, 
            blood donation coordination, and shared health experiences.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/signup"
              viewTransition
              className="group flex items-center space-x-2 bg-green-600 text-white font-bold px-8 py-4 rounded-2xl hover:bg-green-700 transition-all shadow-lg hover:shadow-green-200 hover:shadow-xl"
            >
              <Heart className="w-5 h-5" fill="currentColor" />
              <span>Join the Community</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              viewTransition
              className="flex items-center space-x-2 bg-white text-gray-700 font-bold px-8 py-4 rounded-2xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm"
            >
              <span>Sign In</span>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Free to use</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>No spam, ever</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Community-driven</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-green-600 uppercase tracking-widest mb-3">Everything You Need</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Built for your <span className="text-green-600">health journey</span></h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">Tools and community features designed to make healthcare more accessible and human.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Users className="w-6 h-6 text-blue-600" />,
                bg: 'bg-blue-50',
                title: 'Health Communities',
                desc: 'Join focused groups for conditions, wellness goals, and medical topics. Ask questions and get real answers from peers and professionals.'
              },
              {
                icon: <Droplets className="w-6 h-6 text-red-600" />,
                bg: 'bg-red-50',
                title: 'Blood Donation Network',
                desc: 'Connect donors with those in urgent need. Post blood requests with location, urgency, and contact info — and respond to save lives.'
              },
              {
                icon: <ImageIcon className="w-6 h-6 text-purple-600" />,
                bg: 'bg-purple-50',
                title: 'Health Moments',
                desc: 'Share your health milestones, recovery stories, and daily wellness wins with photos and videos. Inspire and be inspired.'
              },
              {
                icon: <Bell className="w-6 h-6 text-orange-600" />,
                bg: 'bg-orange-50',
                title: 'Emergency Alerts',
                desc: 'Post and receive urgent health alerts for your community. Be the first to know about local health emergencies and resources.'
              },
              {
                icon: <Shield className="w-6 h-6 text-green-600" />,
                bg: 'bg-green-50',
                title: 'Safe & Private',
                desc: 'Your data is protected with modern authentication and privacy controls. Share only what you choose with the people you trust.'
              },
              {
                icon: <Zap className="w-6 h-6 text-yellow-600" />,
                bg: 'bg-yellow-50',
                title: 'Real-time Notifications',
                desc: 'Never miss a response, donation offer, or community update. Stay informed with smart, timely notifications built right in.'
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all group cursor-default"
              >
                <div className={`${feature.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text */}
            <div>
              <p className="text-sm font-bold text-green-600 uppercase tracking-widest mb-3">About Us</p>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-6">
                We believe in the <br />
                <span className="text-green-600">power of community</span> in healthcare.
              </h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                CareCommunity was born from a simple idea: healthcare shouldn't be navigated alone. 
                Whether you're a patient, caregiver, or simply someone who wants to help — 
                this is your platform to connect, share, and support.
              </p>
              <p className="text-gray-500 leading-relaxed mb-8">
                We bridge the gap between those in need and those who can help, creating a 
                human-first approach to health information and emergency response. From blood 
                donation coordination to peer health advice, every feature is built with care.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: 'Community Members', value: 'Growing' },
                  { label: 'Blood Requests Fulfilled', value: 'Lifesaving' },
                  { label: 'Health Questions Answered', value: 'Thousands' },
                  { label: 'Communities Created', value: 'Hundreds' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Visual Cards */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-teal-50 rounded-3xl -z-10" />
              <div className="space-y-4 p-8">
                {[
                  { icon: '💚', text: '"Got my answer in minutes. This community is incredible!"', user: 'Priya S.' },
                  { icon: '🩸', text: '"Found a blood donor in under an hour. You saved my father\'s life."', user: 'Arjun M.' },
                  { icon: '🌟', text: '"The communities here are so supportive. I don\'t feel alone anymore."', user: 'Meera K.' },
                ].map((testimonial, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <p className="text-2xl mb-2">{testimonial.icon}</p>
                    <p className="text-gray-700 text-sm leading-relaxed italic mb-3">{testimonial.text}</p>
                    <p className="text-xs font-bold text-gray-500">— {testimonial.user}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section / CTA */}
      <section id="community" className="py-24 px-6 bg-gradient-to-br from-green-600 to-emerald-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-4 right-4 w-48 h-48 bg-white rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Globe className="w-12 h-12 text-green-200 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Ready to make a difference?
          </h2>
          <p className="text-green-100 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Join thousands of caring individuals building a healthier, more connected community — one conversation, one donation, one moment at a time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              viewTransition
              className="group flex items-center justify-center space-x-2 bg-white text-green-700 font-bold px-8 py-4 rounded-2xl hover:bg-green-50 transition-all shadow-lg"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              viewTransition
              className="flex items-center justify-center space-x-2 bg-green-500/40 text-white font-bold px-8 py-4 rounded-2xl hover:bg-green-500/60 transition-all border border-green-400"
            >
              <span>I already have an account</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-2">
              <div className="bg-green-900/50 p-2 rounded-xl">
                <HeartPulse className="w-5 h-5 text-green-400" />
              </div>
              <span className="font-bold text-white">CareCommunity</span>
            </div>
            <p className="text-sm text-center">
              Built with 💚 for a healthier, more connected world.
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <Link to="/login" viewTransition className="hover:text-white transition-colors">Sign In</Link>
              <Link to="/signup" viewTransition className="hover:text-white transition-colors">Sign Up</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
