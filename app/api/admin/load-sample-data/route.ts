import { NextRequest } from 'next/server';
import { batchUpsertVectors, VectorMetadata } from '@/lib/vector';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Loading sample persona data to vector database...');
    
    // Create sample persona data based on the real personas
    const samplePersonas = [
      {
        id: 'rohan-patel-1',
        content: `Persona: Rohan Patel
Category: Career Switcher
Background: Rohan Patel is a 27-year-old from Mumbai, India, currently living in Wollongong, NSW, Australia. He completed his Bachelor's in Mechanical Engineering in India but pivoted to a Master's in Business Analytics at the University of Wollongong. Since graduating over a year ago, Rohan has struggled to land a relevant role in Australia's competitive market. He has applied for countless jobs in analytics, data, and ICT fields, but most responses are rejections. In the meantime, Rohan drives for Uber to cover living expenses, all while feeling mounting pressure as the months on his 485 post-study work visa tick away (he has 2.5 years left).
Key Points: 27, from India, regional NSW (Wollongong), Bachelor's in Mechanical Engineering (India), Completed Master's in Business Analytics (Australia), On 485 post-study visa (2.5 years left), Currently driving for Uber, unable to secure an ICT job after 1+ years of applications, Needs PY and one year ICT experience for 189/190 (PR), open to 491 due to regional location, Frustrated by lack of Wollongong ICT jobs and unclear pathway, Highly motivated for PR, wants real project experience, network, and advice, Seeks targeted support for career changers and regional job-seekers`,
        metadata: {
          persona: 'Rohan Patel',
          category: 'Career Switcher',
          country: 'India',
          visa_status: '485',
          location: 'Wollongong',
          tags: ['career_changer', 'international_student', 'business_analytics', 'visa_485']
        }
      },
      {
        id: 'li-wen-1',
        content: `Persona: Li Wen
Category: Career Switcher
Background: Li Wen is from China with a Bachelor in Economics who transitioned to a Master's in Business Analytics in Australia. She has business analytics and basic coding skills but lacks coding confidence and team/project experience. She's seeking PR pathway knowledge and local job opportunities in BA/ICT roles.
Key Points: Bachelor in Economics (China), Master's in Business Analytics (Australia), Business analytics and basic coding skills, Lacks coding confidence and team/project experience, Seeking PR pathway knowledge, Looking for BA/ICT job opportunities, Goal: BA/ICT job with ACS-recognised degrees and PR skill requirements`,
        metadata: {
          persona: 'Li Wen',
          category: 'Career Switcher', 
          country: 'China',
          visa_status: 'PR',
          tags: ['career_changer', 'business_analytics', 'coding', 'pr_pathway']
        }
      },
      {
        id: 'sandeep-shrestha-1',
        content: `Persona: Sandeep Shrestha
Category: Recent Graduate
Background: Sandeep Shrestha is a 23-year-old from Nepal who recently completed his Bachelor's in Computer Science in Australia. He's looking to start his career as a Full Stack Developer but needs guidance on building a portfolio, preparing for technical interviews, and understanding the Australian job market.
Key Points: 23 years old, from Nepal, Bachelor's in Computer Science (Australia), Recent graduate looking for Full Stack Developer roles, Needs portfolio building guidance, Preparing for technical interviews, Understanding Australian job market, Strong technical foundation but lacks industry experience`,
        metadata: {
          persona: 'Sandeep Shrestha',
          category: 'Recent Graduate',
          country: 'Nepal', 
          tags: ['recent_graduate', 'full_stack_developer', 'computer_science', 'portfolio']
        }
      },
      {
        id: 'priya-singh-1',
        content: `Persona: Priya Singh
Background: Priya Singh is an experienced Business Analyst from India working in Australia. She has 5+ years of experience in business analysis and is looking to advance her career to senior BA roles or transition into Product Management.
Key Points: Experienced Business Analyst, 5+ years experience, From India working in Australia, Looking to advance to senior BA roles, Considering transition to Product Management, Strong analytical skills, Understanding stakeholder requirements, Process improvement expertise`,
        metadata: {
          persona: 'Priya Singh',
          category: 'Career Advancement',
          country: 'India',
          tags: ['experienced', 'business_analyst', 'career_advancement', 'product_management']
        }
      },
      {
        id: 'interview-prep-1',
        content: `Interview Preparation for International Students
Key Topics: Technical interview preparation, Behavioral interview questions, Cultural communication tips, Salary negotiation strategies, Portfolio presentation skills
Common Questions: Tell me about yourself, Why do you want to work here, Describe a challenging project, How do you handle conflict, What are your salary expectations
Technical Skills: Coding challenges, System design questions, Problem-solving approach, Project walkthrough, Technology stack discussion`,
        metadata: {
          category: 'Interview Preparation',
          tags: ['interview', 'technical', 'behavioral', 'salary', 'portfolio']
        }
      },
      {
        id: 'visa-guidance-1',
        content: `Visa and Work Authorization Guidance
485 Visa: Post-study work visa, Valid for 2-4 years depending on qualification, Allows full work rights, Path to permanent residency
Skill Assessment: Required for most PR visas, ACS for ICT roles, Engineers Australia for engineering, CPA for accounting
Permanent Residency Pathways: 189 - Independent skilled, 190 - State nominated, 491 - Regional sponsored, Points system based on age, English, experience, education
Work Experience: Australian work experience adds points, Relevant skilled employment, Professional Year programs available`,
        metadata: {
          category: 'Visa Guidance',  
          tags: ['visa', '485', 'permanent_residency', 'skill_assessment', 'work_rights']
        }
      }
    ];

    // Convert to vector format
    const vectors = samplePersonas.map((persona) => {
      const metadata: VectorMetadata = {
        id: persona.id,
        title: persona.metadata.persona || persona.metadata.category || 'Career Guidance',
        content: persona.content,
        category: persona.metadata.category || 'career',
        contentType: 'career' as const,
        difficulty: 'intermediate' as const,
        prerequisites: [],
        leadsTo: [],
        relatedConcepts: [],
        careerPaths: ['business-analyst', 'full-stack-developer', 'data-analyst'],
        tags: persona.metadata.tags || [],
        confidenceScore: 0.95,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        id: persona.id,
        content: persona.content,
        metadata: metadata
      };
    });
    
    console.log(`🔄 Uploading ${vectors.length} sample personas to vector database...`);
    
    // Upload to vector database
    const result = await batchUpsertVectors(vectors);
    
    if (result.success) {
      console.log('✅ Successfully uploaded sample personas to vector database!');
      return Response.json({
        success: true,
        message: 'Successfully uploaded sample personas to vector database',
        totalVectors: vectors.length,
        personas: samplePersonas.map(p => p.metadata.persona || p.metadata.category),
        results: result.results
      });
    } else {
      console.error('❌ Failed to upload vectors:', result.error);
      return Response.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Upload error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}