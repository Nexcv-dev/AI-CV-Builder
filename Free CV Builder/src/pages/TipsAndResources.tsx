import React, { useLayoutEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, CheckCircle, Target, Search, FileText, AlertTriangle, Layers, Briefcase, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

const TipsAndResources = () => {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = 'Comprehensive Resume Guide & Tips | NexCV - Build Better Resumes';
  }, []);

  return (
    <main className="flex-1 overflow-x-hidden bg-slate-950 text-slate-200">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="absolute top-0 left-1/2 -ml-[39rem] w-[78rem] max-w-none opacity-40">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-transparent" />
          <div className="h-[40rem] w-full bg-gradient-to-r from-violet-600 to-emerald-500 blur-3xl opacity-20 rounded-full mix-blend-screen" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-300 mb-6 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
            >
              <BookOpen size={16} />
              The Ultimate Career Success Guide
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-black tracking-tight text-white sm:text-7xl mb-6 font-montserrat"
            >
              Master Your Resume: <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">Tips & Resources</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-400 leading-relaxed max-w-4xl mx-auto"
            >
              Welcome to the most comprehensive guide on modern resume writing. Whether you're a recent graduate or a seasoned executive, learning how to beat Applicant Tracking Systems (ATS), hook recruiters in 6 seconds, and quantify your achievements will transform your job hunt. Let's turn your boring list of duties into a powerful, high-converting marketing document.
            </motion.p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-24 space-y-24">
        {/* Article 1: ATS Optimization */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-12 shadow-2xl backdrop-blur-sm relative overflow-hidden"
        >
          <div className="grid gap-12 lg:grid-cols-2 items-start mb-8">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4 text-emerald-400 font-bold">
                <Search size={24} />
                <h3>Phase 1: ATS Optimization</h3>
              </div>
              <h2 className="text-3xl font-black text-white mb-6 leading-tight">Decoding the Applicant Tracking System (ATS)</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Let's address the elephant in the room: Before a human recruiter ever lays eyes on your carefully crafted CV, it must pass through an automated gatekeeper known as the Applicant Tracking System (ATS). Today, over 98% of Fortune 500 companies and 75% of medium-sized businesses rely on ATS software to filter candidates.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                What does this mean for you? If your CV is structured in a way the machine cannot read, you are automatically disqualified—even if you are the perfect candidate. The ATS parses your document, stripping away the design, and converts it into a plain-text digital profile. It then scores your profile based on keyword density, relevance, and formatting readability.
              </p>
            </div>
            <div className="relative z-10 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(52,211,153,0.15)] aspect-video lg:aspect-square">
              <img src="/images/ats_friendly.png" alt="ATS AI Scanning visualization" className="object-cover w-full h-full hover:scale-105 transition-transform duration-700" />
            </div>
          </div>

          <div className="relative z-10 mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 sm:p-8">
            <p className="text-slate-200 leading-relaxed">
              The secret to beating the ATS isn't just "keyword stuffing"—which can backfire when a human finally reads it—but rather <strong className="text-emerald-300">contextual relevance</strong>. You need to naturally weave the exact terminology from the job description into your experience bullet points, ensuring both the machine and the hiring manager are impressed.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 relative z-10">
            <div className="bg-slate-950/60 rounded-2xl p-6 border border-white/5 hover:border-emerald-500/30 transition-colors duration-300">
              <h4 className="font-bold text-white mb-3 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-400" /> Standard Formatting is King</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Avoid complex multi-column layouts, tables, headers, footers, or embedded graphics. The ATS reads top-to-bottom, left-to-right. If you put vital information in a sidebar, the ATS might read it out of order, combining your contact info with your work history. NexCV's templates are specifically engineered to maintain a beautiful visual design for human eyes while remaining 100% linear and parseable for the machine.
              </p>
            </div>
            <div className="bg-slate-950/60 rounded-2xl p-6 border border-white/5 hover:border-emerald-500/30 transition-colors duration-300">
              <h4 className="font-bold text-white mb-3 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-400" /> Exact Keyword Context</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                If a job description asks for "Search Engine Optimization (SEO)", write exactly that on your resume, including both the full term and the acronym. Don't just write "Web Marketing." If they ask for "Adobe Creative Suite," listing "Photoshop" might not trigger the ATS filter. The machine is literal; mirror their vocabulary exactly.
              </p>
            </div>
          </div>
        </motion.article>

        {/* Article 2: The Perfect Summary */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="flex items-center gap-3 mb-4 text-violet-400 font-bold">
            <Target size={24} />
            <h3>Phase 2: Human Psychology</h3>
          </div>
          <h2 className="text-3xl font-black text-white mb-6">Crafting a 6-Second Hook (The Summary)</h2>
          <p className="text-slate-300 leading-relaxed mb-4 text-lg">
            Congratulations, you've beaten the ATS. Now, a stressed, overworked recruiter is looking at your resume. Eye-tracking studies show that recruiters spend an average of <strong>6 to 7.4 seconds</strong> glancing at a resume before making a definitive "fit/no fit" decision.
          </p>
          <p className="text-slate-300 leading-relaxed mb-8">
            Your professional summary—the 3-4 sentences at the very top of your CV—acts as your elevator pitch. It is prime real estate. Ditch the outdated "Objective" statement. Employers don't care what you want out of a job; they care about what value you bring to them. A modern summary should highlight your seniority, your specialty, your biggest metric-driven achievement, and what you uniquely offer. Think of it as a movie trailer for your career.
          </p>

          <div className="relative mx-auto mb-10 max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-[0_0_40px_rgba(139,92,246,0.15)]">
            <img src="/images/resume_tips_hero.png" alt="Glowing professional resume illustration" className="h-auto max-h-80 w-full object-contain" />
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 p-6 sm:p-8 rounded-2xl bg-slate-900/40 border border-red-500/20">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-xl">X</div>
              <div>
                <h4 className="font-bold text-white mb-2 text-lg">Bad Example (The Outdated Objective)</h4>
                <p className="text-slate-400 italic mb-4">"Hardworking, highly motivated professional looking for a challenging role in a reputable company to utilize my skills, learn new technologies, and grow my career."</p>
                <div className="bg-slate-950/50 rounded-lg p-4 border border-red-500/10">
                  <p className="text-sm text-red-400 font-medium"><strong>Why it fails:</strong> This tells the employer absolutely nothing about what you can do for them. It is completely focused on what the applicant wants. It's filled with generic, empty buzzwords ("hardworking," "motivated") that anyone can claim, and lacks any measurable proof of value or specific skills.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 p-6 sm:p-8 rounded-2xl bg-slate-900/40 border border-emerald-500/30 shadow-lg shadow-emerald-900/10">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xl">✓</div>
              <div>
                <h4 className="font-bold text-white mb-2 text-lg">Good Example (The Value-Driven Summary)</h4>
                <p className="text-slate-400 italic mb-4">"Data-driven Digital Marketing Manager with 5+ years of experience leading B2B campaigns in the SaaS sector. Proven track record of increasing inbound lead generation by 40% year-over-year and managing $500k+ quarterly ad budgets to drive a consistently high 3x ROI. Seeking to leverage expertise in growth hacking and team leadership to scale customer acquisition."</p>
                <div className="bg-slate-950/50 rounded-lg p-4 border border-emerald-500/10">
                  <p className="text-sm text-emerald-400 font-medium"><strong>Why it works:</strong> In just three sentences, the recruiter knows exactly who this person is, their level of seniority, their specific industry experience (B2B SaaS), and the massive financial impact they've had. The inclusion of hard numbers (40%, $500k, 3x ROI) provides instant credibility that generic adjectives cannot match.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.article>

        {/* Article 3: Tailoring */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950 p-8 sm:p-12 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 transform translate-x-1/4 -translate-y-1/4">
            <Layers size={200} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 text-blue-400 font-bold">
              <Layers size={24} />
              <h3>Phase 3: Strategy</h3>
            </div>
            <h2 className="text-3xl font-black text-white mb-6">Stop Sending the Same CV Everywhere</h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              The "spray and pray" method—sending one generic CV to 100 different companies—rarely yields good results in today's highly competitive job market. Every job description has different priorities, even for the exact same job title. A Marketing Manager at a startup needs entirely different skills than a Marketing Manager at a Fortune 500 company.
            </p>
            <p className="text-slate-300 leading-relaxed mb-8">
              Tailoring doesn't mean rewriting your entire resume from scratch. It means making strategic 5-minute tweaks to ensure your document speaks directly to the employer's specific pain points.
            </p>

            <div className="space-y-6 text-slate-300 mb-8">
              <div className="bg-slate-950/40 p-6 rounded-xl border border-white/5">
                <h4 className="text-white font-bold mb-2 text-lg">1. Rearrange Your Bullet Points</h4>
                <p className="text-sm">Recruiters read top-to-bottom. If a job description emphasizes "Client Communication" as the absolute #1 requirement, make sure your bullet points detailing client relations are at the very top of your most recent role, not buried at the bottom. Put your most relevant achievements first.</p>
              </div>
              <div className="bg-slate-950/40 p-6 rounded-xl border border-white/5">
                <h4 className="text-white font-bold mb-2 text-lg">2. Speak Their Dialect</h4>
                <p className="text-sm">Companies use different jargon. If your current CV says "Customer Service" but the job description heavily uses the term "Client Success," simply do a find-and-replace to modify your wording. Mirroring their dialect shows you belong in their culture.</p>
              </div>
              <div className="bg-slate-950/40 p-6 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                <h4 className="text-white font-bold mb-2 text-lg">3. Leverage NexCV's Duplicate Feature</h4>
                <p className="text-sm">Never overwrite your "Master CV". Inside your NexCV dashboard, we've built a 1-click duplicate feature. Simply clone your master resume, rename it for the specific company (e.g., "John Doe - Google Application"), and tweak the copy. This keeps your documents organized and your applications highly targeted.</p>
              </div>
            </div>
          </div>
        </motion.article>

        {/* Article 4: Action Verbs */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-8 sm:p-12 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <FileText size={120} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 text-amber-400 font-bold">
              <Briefcase size={24} />
              <h3>Phase 4: Impact</h3>
            </div>
            <h2 className="text-3xl font-black text-white mb-6">Quantify Everything: The XYZ Formula</h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              The biggest mistake job seekers make is turning their resume into a boring job description. A list of responsibilities only tells an employer what you were <em>supposed</em> to do. A list of quantified achievements tells them how <em>well</em> you did it. Instead of saying "Responsible for managing social media," tell them the business result of your management.
            </p>
            <p className="text-slate-300 leading-relaxed mb-8">
              Use Google's famous <strong className="text-emerald-400">XYZ Formula:</strong> "Accomplished [X] as measured by [Y], by doing [Z]."
              <br /><br />
              <span className="block p-4 bg-emerald-950/30 border-l-4 border-emerald-500 rounded-r-lg mt-4 text-emerald-200">
                <em>Example:</em> "Grew Instagram follower base by 25% (Y) in six months (X) by executing a new micro-influencer partnership strategy and A/B testing ad creative (Z)."
              </span>
            </p>

            <p className="text-slate-300 leading-relaxed mb-8">
              <strong>"But what if I don't have hard numbers?"</strong> You always have numbers. You can quantify volume (e.g., "Managed 50+ daily client requests"), frequency (e.g., "Published 4 weekly newsletters"), or scale (e.g., "Collaborated with a cross-functional team of 12").
            </p>

            <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-2">Replace Weak Words with Strong Action Verbs:</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 text-center">
                <span className="block text-xs text-slate-400 mb-2 uppercase tracking-widest">Instead of "Led"</span>
                <strong className="text-violet-300 block mb-1">Spearheaded</strong>
                <strong className="text-violet-300 block mb-1">Directed</strong>
                <strong className="text-violet-300 block">Orchestrated</strong>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 text-center">
                <span className="block text-xs text-slate-400 mb-2 uppercase tracking-widest">Instead of "Helped"</span>
                <strong className="text-emerald-300 block mb-1">Facilitated</strong>
                <strong className="text-emerald-300 block mb-1">Streamlined</strong>
                <strong className="text-emerald-300 block">Supported</strong>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 text-center">
                <span className="block text-xs text-slate-400 mb-2 uppercase tracking-widest">Instead of "Made"</span>
                <strong className="text-blue-300 block mb-1">Engineered</strong>
                <strong className="text-blue-300 block mb-1">Formulated</strong>
                <strong className="text-blue-300 block">Generated</strong>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 text-center">
                <span className="block text-xs text-slate-400 mb-2 uppercase tracking-widest">Instead of "Changed"</span>
                <strong className="text-amber-300 block mb-1">Overhauled</strong>
                <strong className="text-amber-300 block mb-1">Transformed</strong>
                <strong className="text-amber-300 block">Revamped</strong>
              </div>
            </div>

            {/* Fatal Flaws Section */}
            <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-6 sm:p-8 mb-10">
              <div className="flex items-center gap-3 mb-6 text-red-400 font-bold">
                <AlertTriangle size={24} />
                <h3 className="text-xl">Fatal Flaws to Avoid</h3>
              </div>
              <ul className="text-slate-300 space-y-4">
                <li className="flex gap-4">
                  <div className="mt-1 w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                  <div>
                    <strong className="text-white block mb-1">Typos and Grammar Errors</strong>
                    <p className="text-sm text-slate-400">A single spelling mistake can send your CV straight to the trash. It signals poor attention to detail. Always proofread, use spell-check, and ideally have a friend review it before submitting.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="mt-1 w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                  <div>
                    <strong className="text-white block mb-1">Unprofessional Email Addresses</strong>
                    <p className="text-sm text-slate-400">Drop the `skaterboy99@yahoo.com` or `party_girl_xo@hotmail.com`. Create a clean, professional email address using variations of your first and last name (e.g., `firstname.lastname@gmail.com`).</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="mt-1 w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                  <div>
                    <strong className="text-white block mb-1">Including a Photograph</strong>
                    <p className="text-sm text-slate-400">Unless you are applying for an acting/modeling role, or applying in specific regions where it is culturally expected (like some countries in Europe or Asia), do NOT include a photo. In North America and the UK, companies often reject CVs with photos immediately to avoid accusations of unconscious bias and discrimination.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="mt-1 w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                  <div>
                    <strong className="text-white block mb-1">Lying or Exaggerating</strong>
                    <p className="text-sm text-slate-400">Background checks are rigorous. They will expose false degrees, inflated job titles, or fabricated dates of employment. Be honest, but learn how to phrase your real experience in the best, most professional light possible.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="text-center pt-12 border-t border-white/10 mt-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/20 text-violet-400 mb-6">
                <GraduationCap size={32} />
              </div>
              <h3 className="text-3xl font-black text-white mb-4">Ready to apply these expert tips?</h3>
              <p className="text-slate-400 mb-8 max-w-xl mx-auto text-lg">
                Our AI-powered CV builder naturally guides you toward making better formatting choices. Put your new knowledge to work and build a resume that gets you hired.
              </p>
              <Link
                to="/builder"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-10 py-5 text-lg font-extrabold text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all hover:scale-105 active:scale-[0.98]"
              >
                Create Your Winning CV Now
              </Link>
            </div>
          </div>
        </motion.article>
      </section>
    </main>
  );
};

export default TipsAndResources;
