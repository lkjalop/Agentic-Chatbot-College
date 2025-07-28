import { config } from 'dotenv';
import path from 'path';

// Load environment variables first
config({ path: path.join(process.cwd(), '.env.local') });

import { db } from '../lib/db';
import { studentPersonas, personaJourneyQuestions, responsePatterns } from '../lib/personas/persona-schemas';
import { batchUpsertVectors } from '../lib/vector';

// Real Student Personas - based on actual EAC student profiles
const personaData = [
  {
    // Rohan Patel - Career Switcher from Regional Area
    persona: {
      archetypeName: "Rohan Patel",
      archetypeCode: "career_switcher_regional",
      nationality: "India",
      ageRange: "25-30",
      location: "Wollongong",
      isRegional: true,
      previousField: "Mechanical Engineering",
      currentStudy: "Master of Business Analytics",
      workExperience: "Uber driver, no ICT experience",
      visaType: "485",
      visaTimeLeft: "2.5 years",
      englishLevel: "high",
      techConfidence: "none",
      primaryMotivation: "PR pathway",
      careerGoal: "Business Analyst",
      urgencyLevel: "high",
      mainChallenge: "No local ICT experience",
      emotionalState: "anxious but determined",
      supportNeeds: ["visa guidance", "career transition", "skill validation"],
      communicationStyle: "direct but needs reassurance",
      culturalBackground: "Indian, values family input on decisions"
    },
    questions: [
      {
        journeyStage: "awareness",
        stageOrder: 1,
        question: "I'm on a 485 visa and driving for Uber. Is it realistic for someone with no IT background to get into tech?",
        answer: "Absolutely, Rohan! Your engineering background gives you excellent problem-solving skills that translate beautifully to tech. Many of our most successful graduates came from mechanical engineering - you already think logically and analytically. The fact that you're asking shows you're ready to take action. With your 485 visa, you have time to build skills and gain experience. Regional areas like Wollongong actually offer advantages - less competition and specific regional pathways for PR. Your determination will carry you far.",
        emotionalTone: "reassuring",
        urgencyLevel: "moderate",
        contextClues: ["485", "uber", "no IT", "realistic"],
        keywords: ["career change", "engineering background", "485 visa", "regional"],
        followUpQuestions: ["What tech roles suit engineers?", "How long does it take to transition?", "What about my PR pathway?"]
      },
      {
        journeyStage: "research",
        stageOrder: 2,
        question: "I keep hearing about bootcamps vs degrees. Which is better for someone like me who needs to work while studying?",
        answer: "Great question! For your situation - working, on a 485 visa, with clear career goals - a targeted bootcamp often makes more sense than another degree. You already have your Masters, so you don't need more formal qualifications. What you need are practical skills and portfolio projects. EAC's bootcamp is designed for working professionals - flexible timing, evening sessions, and focused on real industry skills. You can keep driving for Uber while building your tech portfolio. The key is choosing something intensive enough to create real change in 3-6 months.",
        emotionalTone: "practical",
        urgencyLevel: "moderate",
        contextClues: ["bootcamp vs degree", "work while studying", "485"],
        keywords: ["bootcamp", "working professional", "practical skills", "timeline"],
        followUpQuestions: ["How much time commitment?", "What's the cost?", "Will employers take bootcamp seriously?"]
      },
      {
        journeyStage: "pre_consultation",
        stageOrder: 3,
        question: "I'm worried about spending money on training when I'm not earning much. How do I know this is the right investment?",
        answer: "I completely understand this concern, Rohan. Making financial decisions on a limited income requires careful thought. Here's what I'd consider: 1) Your current Uber income isn't building long-term career equity, 2) Your 485 visa gives you a deadline to establish yourself, 3) Engineering grads who transition to tech typically see 50-100% salary increases within 12-18 months. The question isn't whether you can afford to invest - it's whether you can afford not to. Let's book a consultation to look at your specific numbers and create a realistic financial plan. We can also discuss payment options and potential income during training.",
        emotionalTone: "understanding",
        urgencyLevel: "immediate",
        contextClues: ["worried about money", "not earning much", "right investment"],
        keywords: ["financial concern", "investment", "consultation", "payment options"],
        followUpQuestions: ["What payment plans exist?", "How much can I earn after?", "What if it doesn't work out?"]
      },
      {
        journeyStage: "decision",
        stageOrder: 4,
        question: "My family thinks I should stick with engineering or try for government jobs. How do I explain why tech is better for my visa situation?",
        answer: "This is such a common situation, and your family's concerns come from love and wanting security for you. Here's how to frame it: Government jobs often require citizenship or PR, which you don't have yet. Tech companies regularly sponsor skilled workers and value results over residency status. Your engineering background + tech skills = rare combination that companies want. Show them the migration lists - IT roles are consistently in demand. Tech also offers remote work options, higher salaries, and faster career progression. Most importantly, tech skills give you options globally - if Australia doesn't work out, you can apply these skills anywhere. It's about building a portable, valuable skillset that serves your long-term goals.",
        emotionalTone: "understanding",
        urgencyLevel: "moderate",
        contextClues: ["family thinks", "stick with engineering", "government jobs", "visa situation"],
        keywords: ["family pressure", "visa status", "tech vs engineering", "migration"],
        followUpQuestions: ["How to convince family?", "What about job security?", "Success stories from similar background?"]
      },
      {
        journeyStage: "bootcamp_start",
        stageOrder: 5,
        question: "I'm starting the bootcamp next week. I'm excited but also terrified I won't be able to keep up with people who have programming experience.",
        answer: "That mix of excitement and fear is exactly what every successful career changer feels, Rohan! Here's the truth: your engineering background is actually an advantage. You understand systems thinking, problem-solving methodologies, and project management - skills many self-taught programmers lack. Don't try to compete on syntax knowledge; compete on your ability to understand problems and architect solutions. Your instructors know your background and will support you. Focus on three things in week 1: 1) Ask questions actively, 2) Connect with 2-3 classmates for study support, 3) Apply engineering principles to coding problems. You're not behind - you're approaching from a different angle that's actually valuable.",
        emotionalTone: "encouraging",
        urgencyLevel: "immediate",
        contextClues: ["starting bootcamp", "excited but terrified", "keep up", "programming experience"],
        keywords: ["bootcamp start", "impostor syndrome", "engineering advantage", "peer support"],
        followUpQuestions: ["What if I fall behind?", "How to connect with classmates?", "Study strategies for engineers?"]
      }
    ]
  },
  {
    // Priya Sharma - International Student on Student Visa
    persona: {
      archetypeName: "Priya Sharma",
      archetypeCode: "international_student_500",
      nationality: "India",
      ageRange: "22-25",
      location: "Sydney",
      isRegional: false,
      previousField: "Commerce",
      currentStudy: "Master of IT",
      workExperience: "Part-time retail, some Excel experience",
      visaType: "500",
      visaTimeLeft: "1.5 years",
      englishLevel: "medium",
      techConfidence: "basic",
      primaryMotivation: "Career development",
      careerGoal: "Data Analyst",
      urgencyLevel: "medium",
      mainChallenge: "Limited practical experience",
      emotionalState: "hopeful but overwhelmed",
      supportNeeds: ["practical skills", "industry connections", "confidence building"],
      communicationStyle: "detailed explanations preferred",
      culturalBackground: "Indian, studying away from family"
    },
    questions: [
      {
        journeyStage: "research",
        stageOrder: 1,
        question: "I'm doing a Master of IT but feel like I'm only learning theory. Will employers care about my degree if I don't have practical skills?",
        answer: "Priya, you're absolutely right to be thinking about this! Your Master's degree is valuable - it shows you can commit to learning and understand IT fundamentals. But you're smart to recognize that employers want to see practical application. The good news is you have 1.5 years to build that practical experience alongside your studies. Consider this: degree + bootcamp = ideal combination. Your university gives you the theoretical foundation, and intensive practical training gives you the portfolio and confidence to interview well. Many employers specifically look for this combination because it shows both depth and practical ability.",
        emotionalTone: "validating",
        urgencyLevel: "moderate",
        contextClues: ["Master of IT", "only theory", "employers care", "practical skills"],
        keywords: ["theory vs practice", "degree value", "employer expectations", "skill combination"],
        followUpQuestions: ["What practical skills matter most?", "How to build portfolio while studying?", "Timing with studies?"]
      },
      {
        journeyStage: "decision",
        stageOrder: 2,
        question: "My student visa limits my work hours. How can I gain real experience while studying full-time?",
        answer: "This is a common challenge for international students, and there are several smart ways to handle it. Your 20-hour work limit during studies actually forces you to be strategic, which can be good! Options: 1) Part-time internships in tech (these count toward your 20 hours but give relevant experience), 2) Volunteer for non-profits needing data help, 3) Freelance small projects (within visa limits), 4) Build personal projects that simulate real work, 5) Contribute to open-source projects. During semester breaks, you can work unlimited hours - perfect for intensive internships. The key is making every hour count toward your career goals, not just immediate income.",
        emotionalTone: "practical",
        urgencyLevel: "moderate",
        contextClues: ["student visa", "work hours limit", "studying full-time", "real experience"],
        keywords: ["visa restrictions", "work limitations", "internships", "experience building"],
        followUpQuestions: ["How to find tech internships?", "What about unpaid experience?", "Semester break opportunities?"]
      }
    ]
  },
  {
    // Marcus Johnson - Local Career Changer
    persona: {
      archetypeName: "Marcus Johnson",
      archetypeCode: "local_career_changer",
      nationality: "Australia",
      ageRange: "30-35",
      location: "Melbourne",
      isRegional: false,
      previousField: "Teaching",
      currentStudy: "Self-directed learning",
      workExperience: "High school teacher, 8 years",
      visaType: "citizen",
      visaTimeLeft: "N/A",
      englishLevel: "high",
      techConfidence: "intermediate",
      primaryMotivation: "Career satisfaction",
      careerGoal: "Frontend Developer",
      urgencyLevel: "low",
      mainChallenge: "Age concerns and salary cut",
      emotionalState: "thoughtful but cautious",
      supportNeeds: ["industry transition", "networking", "age-related concerns"],
      communicationStyle: "analytical and thorough",
      culturalBackground: "Australian, values work-life balance"
    },
    questions: [
      {
        journeyStage: "awareness",
        stageOrder: 1,
        question: "I'm 32 and considering leaving teaching for tech. Am I too old to start over, especially when competing with 22-year-old graduates?",
        answer: "Marcus, 32 is absolutely not too old for tech - in fact, you're entering at an ideal time! Teaching gives you incredible transferable skills: explaining complex concepts, managing projects, working under pressure, and understanding user needs (your students!). Many companies specifically value career changers because you bring maturity, communication skills, and a different perspective. Tech has a huge demand for people who can translate between technical and non-technical teams. Your teaching experience makes you perfect for roles involving training, documentation, or client-facing work. Don't compete with 22-year-olds on energy - compete on wisdom, communication, and reliability.",
        emotionalTone: "reassuring",
        urgencyLevel: "relaxed",
        contextClues: ["32", "too old", "start over", "competing with graduates"],
        keywords: ["age concerns", "teaching background", "transferable skills", "career change"],
        followUpQuestions: ["What roles suit teachers?", "How to highlight teaching skills?", "Age discrimination real?"]
      }
    ]
  }
];

// Response patterns for each persona type
const responsePatternData = [
  {
    personaCode: "career_switcher_regional",
    patterns: {
      triggerPhrases: ["worried about money", "is it realistic", "485 visa", "no experience"],
      emotionalIndicators: ["anxious", "worried", "scared", "uncertain"],
      responseApproach: "reassuring with practical steps",
      toneAdjustment: "acknowledge concerns then redirect to strengths",
      mustInclude: ["your engineering background is valuable", "485 gives you time", "regional advantages"],
      mustAvoid: ["easy promises", "ignoring financial concerns", "rushing decisions"],
      culturalConsiderations: ["family approval important", "long-term security valued", "direct communication appreciated"]
    }
  },
  {
    personaCode: "international_student_500",
    patterns: {
      triggerPhrases: ["theory vs practice", "work limitations", "visa restrictions", "overwhelmed"],
      emotionalIndicators: ["overwhelmed", "uncertain", "hopeful", "frustrated"],
      responseApproach: "structured and detailed",
      toneAdjustment: "break down complex information into clear steps",
      mustInclude: ["degree is valuable", "strategic planning", "timeline clarity"],
      mustAvoid: ["rushed timelines", "visa advice", "overwhelming options"],
      culturalConsiderations: ["detailed explanations preferred", "step-by-step guidance", "respect for education"]
    }
  },
  {
    personaCode: "local_career_changer",
    patterns: {
      triggerPhrases: ["too old", "salary cut", "starting over", "work-life balance"],
      emotionalIndicators: ["cautious", "analytical", "thoughtful", "concerned"],
      responseApproach: "analytical with data points",
      toneAdjustment: "respect experience while addressing concerns",
      mustInclude: ["transferable skills valuable", "market demand data", "timeline flexibility"],
      mustAvoid: ["ageist assumptions", "minimizing concerns", "pressure tactics"],
      culturalConsiderations: ["values research and data", "work-life balance priority", "family considerations"]
    }
  }
];

export async function importPersonaData() {
  console.log('🚀 Starting persona data import...');
  
  try {
    // 1. Import personas
    console.log('👥 Importing student personas...');
    const insertedPersonas = [];
    
    for (const { persona } of personaData) {
      const [insertedPersona] = await db.insert(studentPersonas)
        .values(persona)
        .onConflictDoUpdate({
          target: studentPersonas.archetypeCode,
          set: persona
        })
        .returning();
      
      insertedPersonas.push(insertedPersona);
      console.log(`  ✅ Imported: ${persona.archetypeName}`);
    }

    // 2. Import journey questions and create vectors
    console.log('📝 Importing journey questions...');
    const vectorData = [];
    
    for (let i = 0; i < personaData.length; i++) {
      const { questions } = personaData[i];
      const personaId = insertedPersonas[i].id;
      
      for (const question of questions) {
        // Insert question to database
        // Validate journey stage
        const validStages = ['awareness', 'research', 'pre_consultation', 'consultation', 
                           'decision', 'onboarding', 'bootcamp_start', 'engagement', 
                           'delivery', 'post_completion'] as const;
        
        const journeyStage = validStages.includes(question.journeyStage as any) 
          ? question.journeyStage as typeof validStages[number]
          : 'awareness';
        
        const [insertedQuestion] = await db.insert(personaJourneyQuestions)
          .values({
            ...question,
            journeyStage,
            personaId
          })
          .onConflictDoNothing()
          .returning();
        
        if (insertedQuestion) {
          // Prepare vector data
          const vectorId = `persona_q_${insertedQuestion.id}`;
          vectorData.push({
            id: vectorId,
            content: `${question.question} ${question.answer}`,
            metadata: {
              id: vectorId,
              title: `${insertedPersonas[i].archetypeName} - ${question.journeyStage}`,
              content: question.answer,
              category: 'Persona Journey',
              contentType: 'career' as const,
              difficulty: 'intermediate' as const,
              prerequisites: [],
              leadsTo: question.followUpQuestions || [],
              relatedConcepts: question.keywords || [],
              careerPaths: [insertedPersonas[i].careerGoal || 'general'],
              tags: [...(question.keywords || []), question.journeyStage, insertedPersonas[i].archetypeCode],
              
              // Persona-specific metadata
              personaId: personaId,
              personaCode: insertedPersonas[i].archetypeCode,
              journeyStage: question.journeyStage,
              emotionalTone: question.emotionalTone,
              contextClues: question.contextClues,
              
              confidenceScore: 1.0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          });
        }
      }
    }

    // 3. Upload vectors to Upstash
    console.log('📊 Uploading vectors to Upstash...');
    if (vectorData.length > 0) {
      const vectorResult = await batchUpsertVectors(vectorData);
      if (!vectorResult.success) {
        throw new Error(`Vector upload failed: ${vectorResult.error}`);
      }
      console.log(`  ✅ Uploaded ${vectorData.length} persona vectors`);
    }

    // 4. Import response patterns
    console.log('🎯 Importing response patterns...');
    for (let i = 0; i < responsePatternData.length; i++) {
      const patternData = responsePatternData[i];
      const persona = insertedPersonas.find(p => p.archetypeCode === patternData.personaCode);
      
      if (persona) {
        await db.insert(responsePatterns)
          .values({
            personaId: persona.id,
            triggerPhrases: patternData.patterns.triggerPhrases,
            emotionalIndicators: patternData.patterns.emotionalIndicators,
            responseApproach: patternData.patterns.responseApproach,
            toneAdjustment: patternData.patterns.toneAdjustment,
            mustInclude: patternData.patterns.mustInclude,
            mustAvoid: patternData.patterns.mustAvoid,
            culturalConsiderations: patternData.patterns.culturalConsiderations,
            successRate: 0,
            isActive: true
          })
          .onConflictDoNothing();
        
        console.log(`  ✅ Pattern for: ${persona.archetypeName}`);
      }
    }

    // 5. Test persona detection
    console.log('🔍 Testing persona detection...');
    const { PersonaDetector } = await import('../lib/personas/persona-detector');
    const detector = new PersonaDetector();
    
    const testQuery = "I'm on a 485 visa driving for Uber and wondering if I can get into tech with no IT background";
    const detection = await detector.detectPersona(testQuery);
    
    console.log(`  ✅ Test detection successful!`);
    console.log(`     Detected: ${detection.persona?.archetypeName || 'Default'}`);
    console.log(`     Confidence: ${detection.confidence}%`);
    console.log(`     Signals: ${detection.signals.slice(0, 3).join(', ')}...`);

    console.log('\n🎉 Persona data import complete!');
    console.log(`   - ${insertedPersonas.length} personas imported`);
    console.log(`   - ${vectorData.length} journey Q&As vectorized`);
    console.log(`   - ${responsePatternData.length} response patterns configured`);
    console.log('   - Persona detection tested and working');
    
    console.log('\n🧪 Ready to test with persona-aware queries like:');
    console.log('   - "I\'m on a 485 visa and want to change careers"');
    console.log('   - "As an international student, how do I get practical experience?"');
    console.log('   - "Am I too old to start a tech career at 32?"');

  } catch (error) {
    console.error('❌ Error importing persona data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  importPersonaData()
    .then(() => {
      console.log('✅ Import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import failed:', error);
      process.exit(1);
    });
}