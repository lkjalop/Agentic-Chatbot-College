import { batchUpsertVectors } from '../lib/vector';
import { v4 as uuidv4 } from 'uuid';

// Live Industry Project and 3-option structure vectors
const liveIndustryProjectVectors = [
  // Core Live Industry Project Information
  {
    id: uuidv4(),
    content: `Live Industry Project: 6-week practical experience program
Duration: 6-12 weeks (flexible)
Format: Real client projects with professional teams
Commitment: 10-20 hours per week or 3 days/week
Value: Australian work experience, portfolio development, professional references
Available for: All career tracks (Business Analyst, Data & AI, Cybersecurity, Full Stack Developer)
Structure: Week 1 (Project kickoff), Weeks 2-5 (Active development sprints), Week 6 (Final presentation)
Support: 1:1 Calendly bookings with mentors, daily standups, rapid escalation for blockers
Outcomes: Shareable digital portfolio, live deployed applications, real client testimonials`,
    metadata: {
      type: 'program_info',
      category: 'live_industry_project',
      tags: ['6-week', 'real_clients', 'portfolio', 'optional', 'all_tracks']
    }
  },
  
  // 3-Option Structure for Business Analyst
  {
    id: uuidv4(),
    content: `Business Analyst Program Options:
Option 1: 4-week Business Analyst Bootcamp only - $740 AUD ($185/week payment plan available)
- Core BA skills: Requirements gathering, stakeholder management, process improvement
- Tools: JIRA/ClickUp, Confluence, Miro, Figma, v0.dev for prototyping
- Duration: 4 weeks, Tuesday 5:30pm (online, 3 hours)
- Outcomes: BA portfolio with user journey maps, process diagrams, user stories

Option 2: 6-week Live Industry Project only - Work on real client projects with professional teams
- Real business problems with actual clients
- Enterprise-grade systems and team-based delivery
- Professional environment collaboration
- 10-20 hours per week commitment

Option 3: Complete 10-week Program - Both bootcamp + Live Industry Project for maximum impact
- Full skills training + practical application
- Comprehensive portfolio development
- Maximum career preparation and networking`,
    metadata: {
      type: 'program_options',
      category: 'business_analyst',
      tags: ['3_options', 'pricing', 'flexible', 'ba_track']
    }
  },
  
  // 3-Option Structure for Data & AI
  {
    id: uuidv4(),
    content: `Data & AI Analyst Program Options:
Option 1: 4-week Data & AI Bootcamp only - $740 AUD ($185/week payment plan available)
- Core skills: Python, SQL, data analytics, machine learning, AI tools
- Tools: Google Colab, PostgreSQL, ChatGPT, Llama, RAG systems
- Projects: Real-world datasets, dashboards, analysis reports
- Duration: 4 weeks hands-on training

Option 2: 6-week Live Industry Project only - Build AI systems for real clients
- Work with embeddings, LLMs, prompt engineering, vector databases
- Real-time data processing and analytics implementation
- Portfolio Generator Apps and AI-powered solutions
- Professional team collaboration

Option 3: Complete 10-week Program - Both bootcamp + Live Industry Project
- Complete data science and AI skill development
- Real client project experience with cutting-edge AI technology
- Comprehensive portfolio with live AI applications`,
    metadata: {
      type: 'program_options',
      category: 'data_ai',
      tags: ['3_options', 'pricing', 'python', 'ai', 'data_track']
    }
  },
  
  // 3-Option Structure for Cybersecurity
  {
    id: uuidv4(),
    content: `Cybersecurity Program Options:
Option 1: 4-week Cybersecurity Bootcamp only - $740 AUD ($185/week payment plan available)
- Core skills: Security fundamentals, ethical hacking, AWS/Azure security, compliance
- Focus: Secure coding, cloud security, Auth JS, DevSecOps, risk management
- Compliance: Australian legal frameworks (Privacy Act 1988, ACSC guidance, ASIC mandates)
- Duration: 4 weeks intensive security training

Option 2: 6-week Live Industry Project only - Implement security for real client systems
- Modern web applications and cloud infrastructure security
- Real-world security assessments and implementations
- Professional security protocols and documentation
- Enterprise security project experience

Option 3: Complete 10-week Program - Both bootcamp + Live Industry Project
- Complete cybersecurity skill development
- Real client security project implementation
- Professional security portfolio and certifications preparation`,
    metadata: {
      type: 'program_options',
      category: 'cybersecurity',
      tags: ['3_options', 'pricing', 'security', 'aws', 'cyber_track']
    }
  },
  
  // 3-Option Structure for Full Stack Developer
  {
    id: uuidv4(),
    content: `Full Stack Developer Program Options:
Option 1: 4-week Full Stack Bootcamp only - $740 AUD ($185/week payment plan available)
- Core skills: React, Node.js, Next.js 15, TypeScript, HTML/CSS, JavaScript
- Modern frameworks: Tailwind CSS, Shadcn UI, AI-powered development workflows
- Tools: GitHub DevOps, Vercel deployment, modern development environments
- Duration: 4 weeks intensive development training

Option 2: 6-week Live Industry Project only - Build web applications for real clients
- Production-grade tech stacks and enterprise workflows
- Advanced AI systems integration and modern software architecture
- Real client web application development
- Professional development team collaboration

Option 3: Complete 10-week Program - Both bootcamp + Live Industry Project
- Complete full stack development skill set
- Real client project portfolio with live deployed applications
- Maximum preparation for junior developer roles`,
    metadata: {
      type: 'program_options',
      category: 'fullstack',
      tags: ['3_options', 'pricing', 'react', 'javascript', 'fullstack_track']
    }
  },
  
  // Pricing and Cost Information
  {
    id: uuidv4(),
    content: `Program Pricing Structure:
4-week Bootcamp: $740 AUD total
- Payment plan available: $185 per week for 4 weeks
- Includes: All training materials, LMS access, mentor support, portfolio development

6-week Live Industry Project: Pricing varies by project scope
- Real client work experience
- Professional portfolio development
- Industry references and networking

Complete 10-week Program: Bootcamp + Live Industry Project
- Maximum career impact and preparation
- Comprehensive skill development and practical application
- Best value for career transition

All programs include:
- 1:1 Calendly bookings with mentors
- Learning Management System (LMS) access
- Alumni network access and ongoing support
- Job placement assistance and career guidance`,
    metadata: {
      type: 'pricing_info',
      category: 'program_costs',
      tags: ['$740', 'payment_plan', 'pricing', 'all_tracks']
    }
  },
  
  // Career Outcomes and Benefits
  {
    id: uuidv4(),
    content: `Live Industry Project Career Benefits:
Australian Work Experience: Valuable for visa applications and local job market
Professional References: Industry mentors and client testimonials
Portfolio Development: Real client projects and live deployed applications
Networking: Connect with local professionals and potential employers
Skill Application: Bridge theory-practice gap with real-world projects

Career Outcomes by Track:
- Business Analyst: Junior BA, Business Systems Analyst, Requirements Analyst
- Data & AI: Data Analyst, AI Specialist, Business Intelligence Analyst
- Cybersecurity: Security Analyst, Compliance Officer, Cloud Security Associate
- Full Stack: Junior Developer, Frontend Developer, Full Stack Engineer

Success Stories:
- Priyanka Patel: Business Analytics graduate → CRM Manager → Implementation Team
- Varun Raj: Data Analyst role through Portfolio Generator App project
- Students gain confidence, local references, and Australian workplace experience`,
    metadata: {
      type: 'career_outcomes',
      category: 'success_stories',
      tags: ['career_outcomes', 'success_stories', 'australian_experience']
    }
  },
  
  // Flexible Scheduling and Support
  {
    id: uuidv4(),
    content: `Program Flexibility and Support:
Time Commitment:
- Bootcamp: Tuesday 5:30pm (online, 3 hours, 4 weeks) for most tracks
- Live Industry Project: 10-20 hours per week (flexible scheduling)
- Can accommodate university students and part-time workers

Support Structure:
- Business hours support (9-5 AEST)
- After-hours mentoring (5-8pm AEST)
- 1:1 Calendly bookings with mentors and leadership team
- Daily standups for accountability and rapid issue resolution
- LinkedIn Group Chat for written communication and team collaboration

Flexibility Options:
- Defer to next cohort if needed (usually no extra cost)
- Early communication for scheduling conflicts
- Makeup resources and recorded sessions available
- International student friendly with written support materials`,
    metadata: {
      type: 'scheduling_support',
      category: 'program_flexibility',
      tags: ['flexible', 'support', 'international_students', 'scheduling']
    }
  }
];

async function addLiveIndustryProjectVectors() {
  console.log('🚀 Adding Live Industry Project vectors to enhance program information...');
  
  try {
    await batchUpsertVectors(liveIndustryProjectVectors);
    console.log(`✅ Successfully added ${liveIndustryProjectVectors.length} Live Industry Project vectors!`);
    
    console.log('\n📈 Enhanced Information Coverage:');
    console.log('- Live Industry Project details and structure');
    console.log('- 3-option program structure for all career tracks');
    console.log('- Complete pricing information with payment plans');
    console.log('- Career outcomes and success stories');
    console.log('- Flexible scheduling and support options');
    console.log('- Australian work experience and visa benefits');
    
    console.log('\n✨ The chatbot can now properly explain:');
    console.log('1. All 3 program options for each career track');
    console.log('2. Live Industry Project benefits and structure');
    console.log('3. Complete pricing with payment plan options');
    console.log('4. Real career outcomes and success stories');
  } catch (error) {
    console.error('❌ Error adding Live Industry Project vectors:', error);
  }
}

// Run the script
addLiveIndustryProjectVectors().catch(console.error);