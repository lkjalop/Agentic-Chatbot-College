import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentPersonas, personaJourneyQuestions, responsePatterns } from '@/lib/personas/persona-schemas';
import { batchUpsertVectors } from '@/lib/vector';

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

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting persona data import...');
    
    // 1. Import personas
    console.log('👥 Importing student personas...');
    const insertedPersonas = [];
    
    for (const { persona } of personaData) {
      const [insertedPersona] = await db.insert(studentPersonas)
        .values(persona)
        .onConflictDoUpdate({
          target: studentPersonas.archetypeCode,
          set: {
            ...persona
          }
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
        const [insertedQuestion] = await db.insert(personaJourneyQuestions)
          .values({
            ...question,
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
              contentType: 'persona_qa',
              difficulty: 'contextual',
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

    console.log('\n🎉 Persona data import complete!');
    
    return NextResponse.json({
      success: true,
      count: insertedPersonas.length,
      vectors: vectorData.length,
      patterns: responsePatternData.length,
      personas: insertedPersonas.map(p => ({
        name: p.archetypeName,
        code: p.archetypeCode,
        nationality: p.nationality,
        visa: p.visaType
      }))
    });

  } catch (error) {
    console.error('❌ Error importing persona data:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}