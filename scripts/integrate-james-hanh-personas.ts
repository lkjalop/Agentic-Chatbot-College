import { batchUpsertVectors } from '../lib/vector';
import { v4 as uuidv4 } from 'uuid';

// James Chen and Hanh Nguyen Bui persona data
const newPersonas = [
  {
    name: 'James Chen',
    category: 'Software Engineering Student',
    background: '23-year-old from Taipei, Computer Science undergraduate at an Australian university, strong academic performance but no professional work experience, seeking practical industry exposure and local connections.',
    tags: ['international_student', 'role_developer', 'experience_beginner', 'tech_react', 'role_full_stack', 'academic_background'],
    questions: [
      {
        question: "I'm studying Computer Science at university but have never worked on real industry projects - will this give me practical experience?",
        stage: 'awareness'
      },
      {
        question: "How is this different from the group projects I do in my CS degree?",
        stage: 'awareness'
      },
      {
        question: "What technologies and frameworks will I learn that aren't covered in my university courses?",
        stage: 'awareness'
      },
      {
        question: "Can I balance this program with my university studies and part-time work?",
        stage: 'research_consideration'
      },
      {
        question: "Should I mention my academic projects or focus on what I want to learn practically?",
        stage: 'research_consideration'
      },
      {
        question: "How do you bridge the gap between academic computer science and professional software development?",
        stage: 'research_consideration'
      },
      {
        question: "Can I schedule my participation around my university exam periods and assignments?",
        stage: 'decision'
      },
      {
        question: "What professional development tools should I learn before starting that aren't taught at university?",
        stage: 'decision'
      },
      {
        question: "How can I contribute my technical knowledge while still learning about industry practices?",
        stage: 'enrollment'
      },
      {
        question: "How can I gain experience with enterprise-level software architecture and design patterns?",
        stage: 'enrollment'
      },
      {
        question: "Can I get exposure to different roles like technical lead or product owner during the project?",
        stage: 'enrollment'
      },
      {
        question: "How should I present my project to demonstrate both technical skills and professional growth?",
        stage: 'retention'
      },
      {
        question: "How do I leverage this experience when applying for graduate programs or junior developer roles?",
        stage: 'retention'
      },
      {
        question: "Can you help me understand what Australian tech companies look for in new graduates?",
        stage: 'post_completion'
      },
      {
        question: "What additional skills or experiences should I focus on developing before graduating university?",
        stage: 'post_completion'
      }
    ]
  },
  {
    name: 'Hanh Nguyen Bui',
    category: 'Data/BA Postgrad',
    background: '28-year-old from Vietnam, Master of Business Analytics at Torrens University, functional English but struggles with fast-paced discussions, prefers structured workplaces over chaotic startups.',
    tags: ['international_student', 'role_ba', 'role_data_analyst', 'experience_beginner', 'tech_sql', 'tech_python', 'structured_learner'],
    questions: [
      {
        question: "I'm finishing my Business Analytics Masters but have no work experience - will this help me get ready for real jobs?",
        stage: 'awareness'
      },
      {
        question: "Do you work with structured companies or just chaotic startups? I prefer clear processes and defined roles.",
        stage: 'awareness'
      },
      {
        question: "I understand English well but struggle with fast speakers or heavy accents - is there support for this?",
        stage: 'awareness'
      },
      {
        question: "What business analysis tools will I learn and are they taught step-by-step?",
        stage: 'awareness'
      },
      {
        question: "How much individual work versus group discussions? I'm better with written tasks than verbal debates.",
        stage: 'research_consideration'
      },
      {
        question: "Should I mention that I prefer structured learning and clear instructions over ambiguous projects?",
        stage: 'research_consideration'
      },
      {
        question: "How do you accommodate students who learn better with written instructions and structured processes?",
        stage: 'research_consideration'
      },
      {
        question: "Can you explain what types of business analyst roles exist in more traditional, structured companies?",
        stage: 'research_consideration'
      },
      {
        question: "Will the project structure be clear from the beginning or will requirements change frequently?",
        stage: 'decision'
      },
      {
        question: "Can I get written guides for all the processes and methodologies we'll use?",
        stage: 'decision'
      },
      {
        question: "How can I contribute effectively when team discussions move faster than I can follow?",
        stage: 'enrollment'
      },
      {
        question: "Can I take detailed notes and provide written input rather than always speaking up in meetings?",
        stage: 'enrollment'
      },
      {
        question: "How can I demonstrate my business analysis skills through documentation and structured outputs?",
        stage: 'retention'
      },
      {
        question: "Can I get one-on-one feedback sessions rather than only group discussions?",
        stage: 'retention'
      },
      {
        question: "How do I present my project to highlight both technical and business analysis skills while working within structured frameworks?",
        stage: 'post_completion'
      }
    ]
  }
];

// Q&A responses for the new personas
const qaResponses = {
  'James Chen': {
    qa1: {
      question: "I'm studying Computer Science at university but have never worked on real industry projects - will this give me practical experience?",
      answer: "Absolutely! This bootcamp bridges the gap between academic CS and industry practice. You'll work on real production environments with advanced AI, security practices, and modern frameworks used by actual companies. Unlike university projects with theoretical requirements, you'll experience real-world constraints, code reviews, sprint planning, and client feedback cycles. Recent CS students have used this experience to land graduate roles at major tech companies by demonstrating they can contribute from day one."
    },
    qa2: {
      question: "How is this different from the group projects I do in my CS degree?",
      answer: "University projects focus on demonstrating concepts, while our bootcamp simulates actual workplace dynamics. You'll use industry tools like JIRA, Git workflows, CI/CD pipelines, and participate in daily standups. Instead of just coding to meet assignment criteria, you'll consider scalability, security, user experience, and business requirements. You'll work with mentors who are industry professionals, not TAs, and receive feedback based on industry standards. The project deliverables go into your professional portfolio, not just for grades."
    },
    qa3: {
      question: "Can I balance this program with my university studies and part-time work?",
      answer: "Yes! Many participants are university students. Classes run in the evenings and the Live Industry Project offers flexible hours. You can adjust your commitment during exam periods - just communicate with your team. Most students dedicate 10-20 hours per week during semester and increase involvement during breaks. We provide recordings of all sessions and async collaboration tools, so you won't miss critical content if you have conflicting commitments."
    }
  },
  'Hanh Nguyen Bui': {
    qa1: {
      question: "I'm finishing my Business Analytics Masters but have no work experience - will this help me get ready for real jobs?",
      answer: "Yes! This bootcamp specifically addresses the experience gap that many Masters graduates face. You'll apply your analytical knowledge to real business problems, learn industry tools beyond academic software, and build a portfolio demonstrating practical skills. We focus on Australian workplace practices, communication styles, and the specific tools companies use here. Many Business Analytics graduates have successfully transitioned to analyst roles after gaining this hands-on experience and local references."
    },
    qa2: {
      question: "Do you work with structured companies or just chaotic startups? I prefer clear processes and defined roles.",
      answer: "We work with various organizations, including established companies with structured processes. The bootcamp itself follows clear methodologies - you'll learn SCRUM, use defined workflows, and have specific role responsibilities. We teach you to work in both agile and traditional environments. Many of our partner companies are established businesses in finance, healthcare, and government sectors that value structured approaches and clear documentation. You'll learn to adapt while maintaining your preference for organization."
    },
    qa3: {
      question: "I understand English well but struggle with fast speakers or heavy accents - is there support for this?",
      answer: "Absolutely! We're experienced with international students and various communication styles. All sessions are recorded for review, we provide written summaries of key points, and use collaboration tools for written communication. Mentors are trained to speak clearly and check understanding. You can request clarification anytime via chat, and we encourage written documentation which plays to your strengths. Many successful graduates initially had similar concerns but found our supportive environment helped build their confidence."
    }
  }
};

async function integrateNewPersonas() {
  console.log('🚀 Starting integration of James Chen and Hanh Nguyen Bui personas...');
  
  const vectors = [];
  
  for (const persona of newPersonas) {
    // Create persona vector
    const personaId = uuidv4();
    const personaVector = {
      id: personaId,
      content: `Persona: ${persona.name}
Category: ${persona.category}
Background: ${persona.background}`,
      metadata: {
        type: 'persona',
        persona: persona.name,
        category: persona.category,
        tags: persona.tags
      }
    };
    vectors.push(personaVector);
    
    // Create vectors for each question in the journey
    for (const q of persona.questions) {
      const questionId = uuidv4();
      const questionVector = {
        id: questionId,
        content: `Question: ${q.question}
Persona: ${persona.name}
Stage: ${q.stage}`,
        metadata: {
          type: 'user_question',
          persona: persona.name,
          stage: q.stage,
          tags: [`journey_stage_${q.stage}`, persona.name.toLowerCase().replace(' ', '_'), 'question']
        }
      };
      vectors.push(questionVector);
    }
    
    // Create user journey vectors
    const journeyStages = ['awareness', 'research_consideration', 'decision', 'enrollment', 'retention', 'post_completion'];
    for (const stage of journeyStages) {
      const stageQuestions = persona.questions.filter(q => q.stage === stage);
      if (stageQuestions.length > 0) {
        const journeyId = uuidv4();
        const journeyVector = {
          id: journeyId,
          content: `User Journey Stage: ${stage}
Persona: ${persona.name}
Intent: Questions and concerns during ${stage} phase`,
          metadata: {
            type: 'user_journey',
            persona: persona.name,
            stage: stage,
            tags: [`journey_stage_${stage}`, persona.name.toLowerCase().replace(' ', '_')]
          }
        };
        vectors.push(journeyVector);
      }
    }
  }
  
  // Add Q&A response vectors
  for (const [personaName, qas] of Object.entries(qaResponses)) {
    for (const [qaKey, qa] of Object.entries(qas)) {
      const qaId = uuidv4();
      const qaVector = {
        id: qaId,
        content: `Question: ${qa.question}
Answer: ${qa.answer}
Persona: ${personaName}`,
        metadata: {
          type: 'qa_response',
          persona: personaName,
          tags: [personaName.toLowerCase().replace(' ', '_'), 'qa', 'response']
        }
      };
      vectors.push(qaVector);
    }
  }
  
  console.log(`📊 Created ${vectors.length} vectors for new personas`);
  
  // Upload to vector database
  try {
    await batchUpsertVectors(vectors);
    console.log('✅ Successfully integrated James Chen and Hanh Nguyen Bui personas!');
    
    // Summary
    console.log('\n📈 Integration Summary:');
    console.log(`- Added 2 new personas`);
    console.log(`- Created ${newPersonas[0].questions.length + newPersonas[1].questions.length} question vectors`);
    console.log(`- Added ${Object.keys(qaResponses['James Chen']).length + Object.keys(qaResponses['Hanh Nguyen Bui']).length} Q&A responses`);
    console.log('\n✨ The chatbot can now respond to James Chen and Hanh Nguyen Bui persona queries!');
  } catch (error) {
    console.error('❌ Error uploading vectors:', error);
  }
}

// Run the integration
integrateNewPersonas().catch(console.error);